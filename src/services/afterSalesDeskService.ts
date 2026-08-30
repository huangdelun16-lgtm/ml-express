import { auditLogService, supabase } from './supabase';
import { notifyAdminTodosRefresh } from '../utils/adminTodoBridge';
import {
  buildChatSessions,
  buildRefundPatch,
  classifyRefund,
  estimateBalanceRefundAmount,
  isMissingRefundColumn,
  reviewNeedsWatch,
  type ChatSession,
  type RefundActor,
  type RefundStatus,
  type ReviewLike,
} from '../utils/afterSalesDesk';

export type AfterSalesReviewItem = ReviewLike & {
  store_name: string;
  store_code: string;
};

export type AfterSalesChatItem = ChatSession & {
  senderName: string;
  receiverName: string;
  storeName: string;
  courier: string;
  orderStatus: string;
};

export type AfterSalesRefundItem = {
  id: string;
  status: string;
  description?: string | null;
  payment_method?: string | null;
  price?: string | number | null;
  customer_id?: string | null;
  sender_name?: string | null;
  receiver_name?: string | null;
  delivery_store_id?: string | null;
  delivery_store_name?: string | null;
  created_at?: string | null;
  refund_status?: string | null;
  refund_amount?: number | null;
  refund_note?: string | null;
  refund_at?: string | null;
  refund_by?: string | null;
  refund_by_name?: string | null;
  estimatedAmount: number;
  refundKind: RefundStatus;
};

export type AfterSalesDeskData = {
  reviews: AfterSalesReviewItem[];
  chats: AfterSalesChatItem[];
  refunds: AfterSalesRefundItem[];
};

export type AfterSalesTodoCounts = {
  watchReviews: number;
  waitingChats: number;
  pendingRefunds: number;
};

const REVIEW_SELECT =
  'id, store_id, order_id, user_id, user_name, rating, courier_rating, comment, reply_text, status, created_at, updated_at';
const REFUND_SELECT =
  'id, status, description, payment_method, price, customer_id, sender_name, receiver_name, delivery_store_id, delivery_store_name, created_at, refund_status, refund_amount, refund_note, refund_at, refund_by, refund_by_name';
const REFUND_SELECT_FALLBACK =
  'id, status, description, payment_method, price, customer_id, sender_name, receiver_name, delivery_store_id, delivery_store_name, created_at';

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export function readAfterSalesActor(): RefundActor {
  return {
    id:
      sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser') || 'admin',
    name:
      sessionStorage.getItem('currentUserName') ||
      localStorage.getItem('currentUserName') ||
      '管理员',
  };
}

async function loadStoreMap(): Promise<Record<string, { store_name: string; store_code: string }>> {
  const { data, error } = await supabase
    .from('delivery_stores')
    .select('id, store_name, store_code');
  if (error) {
    console.warn('afterSales loadStoreMap:', error.message);
    return {};
  }
  const map: Record<string, { store_name: string; store_code: string }> = {};
  for (const row of data || []) {
    if (!row?.id) continue;
    map[row.id] = {
      store_name: String(row.store_name || ''),
      store_code: String(row.store_code || ''),
    };
  }
  return map;
}

async function fetchReviews(): Promise<AfterSalesReviewItem[]> {
  const since = daysAgoIso(90);
  const [reviewRes, storeMap] = await Promise.all([
    supabase
      .from('store_reviews')
      .select(REVIEW_SELECT)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(500),
    loadStoreMap(),
  ]);
  if (reviewRes.error) {
    throw new Error(reviewRes.error.message || '加载评价失败');
  }
  return (reviewRes.data || []).map((row) => {
    const store = storeMap[String(row.store_id || '')] || { store_name: '', store_code: '' };
    return {
      ...row,
      store_name: store.store_name,
      store_code: store.store_code,
    };
  });
}

async function fetchChats(): Promise<AfterSalesChatItem[]> {
  const since = daysAgoIso(14);
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, order_id, sender_id, sender_type, message, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(2000);
  if (error) {
    throw new Error(error.message || '加载客服会话失败');
  }
  const sessions = buildChatSessions(data || []);
  const orderIds = sessions.map((s) => s.orderId);
  const pkgMap: Record<
    string,
    { sender_name?: string; receiver_name?: string; delivery_store_name?: string; courier?: string; status?: string }
  > = {};
  if (orderIds.length) {
    const unique = Array.from(new Set(orderIds));
    for (let i = 0; i < unique.length; i += 80) {
      const part = unique.slice(i, i + 80);
      const { data: pkgs } = await supabase
        .from('packages')
        .select('id, sender_name, receiver_name, delivery_store_name, courier, status')
        .in('id', part);
      for (const pkg of pkgs || []) {
        if (pkg?.id) pkgMap[pkg.id] = pkg;
      }
    }
  }
  return sessions.map((session) => {
    const pkg = pkgMap[session.orderId] || {};
    return {
      ...session,
      senderName: String(pkg.sender_name || ''),
      receiverName: String(pkg.receiver_name || ''),
      storeName: String(pkg.delivery_store_name || ''),
      courier: String(pkg.courier || ''),
      orderStatus: String(pkg.status || ''),
    };
  });
}

async function fetchRefunds(): Promise<AfterSalesRefundItem[]> {
  const since = daysAgoIso(90);
  let { data, error } = await supabase
    .from('packages')
    .select(REFUND_SELECT)
    .eq('status', '已取消')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(400);
  if (error && isMissingRefundColumn(error)) {
    const fallback = await supabase
      .from('packages')
      .select(REFUND_SELECT_FALLBACK)
      .eq('status', '已取消')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(400);
    data = fallback.data as typeof data;
    error = fallback.error;
  }
  if (error) {
    throw new Error(error.message || '加载退款跟单失败');
  }
  const out: AfterSalesRefundItem[] = [];
  for (const row of data || []) {
    const kind = classifyRefund(row);
    if (!kind) continue;
    out.push({
      ...row,
      id: String(row.id),
      status: String(row.status || '已取消'),
      estimatedAmount: Number(row.refund_amount) || estimateBalanceRefundAmount(row),
      refundKind: kind,
    });
  }
  return out;
}

export async function fetchAfterSalesDesk(): Promise<AfterSalesDeskData> {
  const [reviews, chats, refunds] = await Promise.all([
    fetchReviews(),
    fetchChats(),
    fetchRefunds(),
  ]);
  return { reviews, chats, refunds };
}

export async function fetchAfterSalesTodoCounts(): Promise<AfterSalesTodoCounts> {
  try {
    const sinceReviews = daysAgoIso(90);
    const sinceChats = daysAgoIso(14);
    const sinceRefunds = daysAgoIso(90);
    const [lowRes, pendingRes, chatRes, refundRes] = await Promise.all([
      supabase
        .from('store_reviews')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published')
        .lte('rating', 2)
        .gte('created_at', sinceReviews),
      supabase
        .from('store_reviews')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .gte('created_at', sinceReviews),
      supabase
        .from('chat_messages')
        .select('order_id, sender_type, created_at')
        .gte('created_at', sinceChats)
        .order('created_at', { ascending: false })
        .limit(800),
      supabase
        .from('packages')
        .select('id, status, description, payment_method, price, refund_status, refund_amount')
        .eq('status', '已取消')
        .gte('created_at', sinceRefunds)
        .limit(400),
    ]);

    let refundRows: Array<{
      id?: string;
      status?: string;
      description?: string;
      payment_method?: string;
      price?: string | number;
      refund_status?: string | null;
      refund_amount?: number | null;
    }> = refundRes.data || [];
    if (refundRes.error && isMissingRefundColumn(refundRes.error)) {
      const fallback = await supabase
        .from('packages')
        .select('id, status, description, payment_method, price')
        .eq('status', '已取消')
        .gte('created_at', sinceRefunds)
        .limit(400);
      refundRows = fallback.data || [];
    }

    const sessions = buildChatSessions(chatRes.data || []);
    return {
      watchReviews: (lowRes.count || 0) + (pendingRes.count || 0),
      waitingChats: sessions.filter((s) => s.waitingStaff).length,
      pendingRefunds: refundRows.filter((row) => classifyRefund(row) === 'pending').length,
    };
  } catch (error) {
    console.warn('fetchAfterSalesTodoCounts:', error);
    return { watchReviews: 0, waitingChats: 0, pendingRefunds: 0 };
  }
}

export async function setReviewVisibility(
  review: AfterSalesReviewItem,
  status: 'published' | 'hidden',
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('store_reviews')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', review.id);
  if (error) return { ok: false, error: error.message };
  const actor = readAfterSalesActor();
  try {
    await auditLogService.log({
      user_id: String(actor.id || 'admin'),
      user_name: String(actor.name || '管理员'),
      action_type: 'update',
      module: 'delivery_stores',
      target_id: String(review.id || ''),
      target_name: String(review.order_id || review.id || ''),
      action_description: status === 'hidden' ? '隐藏店铺评价' : '恢复展示店铺评价',
    });
  } catch (err) {
    console.warn('评价监管审计失败:', err);
  }
  notifyAdminTodosRefresh();
  return { ok: true };
}

export async function sendAdminChatReply(
  orderId: string,
  message: string,
): Promise<{ ok: boolean; error?: string }> {
  const text = String(message || '').trim();
  if (!text) return { ok: false, error: '请输入回复内容' };
  const actor = readAfterSalesActor();
  const { error } = await supabase.from('chat_messages').insert([
    {
      order_id: orderId,
      sender_id: String(actor.id || 'admin'),
      sender_type: 'admin',
      message: text,
      is_read: false,
      created_at: new Date().toISOString(),
    },
  ]);
  if (error) return { ok: false, error: error.message };
  notifyAdminTodosRefresh();
  return { ok: true };
}

export async function markPackageRefund(input: {
  pkg: AfterSalesRefundItem;
  status: RefundStatus;
  amount?: number;
  note?: string;
  creditBalance?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const actor = readAfterSalesActor();
  const amount =
    input.amount != null && Number.isFinite(input.amount)
      ? Number(input.amount)
      : input.pkg.estimatedAmount;
  const patch = buildRefundPatch(input.status, amount, input.note || '', actor);

  if (input.creditBalance && input.status === 'refunded') {
    const customerId = String(input.pkg.customer_id || '').trim();
    if (!customerId) return { ok: false, error: '没有客户 ID，无法退回余额' };
    if (amount <= 0) return { ok: false, error: '退款金额必须大于 0' };
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, balance')
      .eq('id', customerId)
      .single();
    if (userError || !user) return { ok: false, error: userError?.message || '找不到客户' };
    const { error: balError } = await supabase
      .from('users')
      .update({
        balance: Number(user.balance || 0) + amount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', customerId);
    if (balError) return { ok: false, error: balError.message };
  }

  const { error } = await supabase.from('packages').update(patch).eq('id', input.pkg.id);
  if (error && isMissingRefundColumn(error)) {
    return { ok: false, error: '请先在 Supabase 执行 refund 跟单迁移，才能记下谁退的' };
  }
  if (error) return { ok: false, error: error.message };

  try {
    await auditLogService.log({
      user_id: String(actor.id || 'admin'),
      user_name: String(actor.name || '管理员'),
      action_type: 'update',
      module: 'finance',
      target_id: input.pkg.id,
      target_name: input.pkg.id,
      action_description: `退款跟单 ${input.status}${amount ? ` ${amount} MMK` : ''}${
        input.creditBalance ? '（已退回余额）' : ''
      }${input.note ? `；${input.note}` : ''}`,
    });
  } catch (err) {
    console.warn('退款跟单审计失败:', err);
  }
  notifyAdminTodosRefresh();
  return { ok: true };
}

export function countWatchReviews(rows: ReviewLike[]): number {
  return rows.filter((row) => reviewNeedsWatch(row)).length;
}
