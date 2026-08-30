export const LOW_REVIEW_RATING = 2;
export const CHAT_WAIT_MINUTES = 15;

export type AfterSalesTab = 'reviews' | 'chats' | 'refunds';

export type ReviewWatchFilter = 'needs' | 'low' | 'unreplied' | 'hidden' | 'pending' | 'all';

export type ChatWatchFilter = 'waiting' | 'overdue' | 'all';

export type RefundWatchFilter = 'pending' | 'refunded' | 'waived' | 'all';

export type RefundStatus = 'pending' | 'refunded' | 'waived';

export type ChatSenderType = 'customer' | 'rider' | 'merchant' | 'admin';

export type ReviewLike = {
  id?: string;
  store_id?: string | null;
  order_id?: string | null;
  user_name?: string | null;
  rating?: number | null;
  courier_rating?: number | null;
  comment?: string | null;
  reply_text?: string | null;
  status?: string | null;
  created_at?: string | null;
};

export type ChatMessageLike = {
  id?: string;
  order_id?: string | null;
  sender_type?: string | null;
  message?: string | null;
  created_at?: string | null;
};

export type RefundPackageLike = {
  id?: string;
  status?: string | null;
  description?: string | null;
  payment_method?: string | null;
  price?: string | number | null;
  customer_id?: string | null;
  refund_status?: string | null;
  refund_amount?: number | null;
  refund_note?: string | null;
  refund_at?: string | null;
};

export type ReviewWatchFlags = {
  low: boolean;
  unreplied: boolean;
  hidden: boolean;
  pending: boolean;
};

export type ChatSession = {
  orderId: string;
  lastMessage: string;
  lastSenderType: ChatSenderType | '';
  lastAt: string;
  messageCount: number;
  waitingStaff: boolean;
  overdue: boolean;
  waitMs: number;
};

const ITEM_COST_RE =
  /\[(?:商品费用 \(仅余额支付\)|商品费用（仅余额支付）|Item Cost \(Balance Only\)|ကုန်ပစ္စည်းဖိုး \(လက်ကျန်ငွေဖြင့်သာ\)|余额支付|Balance Payment|လက်ကျန်ငွေဖြင့် ပေးချေခြင်း): (.*?) MMK\]/;

export function parseMmkAmount(raw: unknown): number {
  const n = parseFloat(String(raw ?? '').replace(/,/g, '').replace(/[^\d.]/g, '') || '0');
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function isMemberBalanceOrder(description?: string | null): boolean {
  const desc = String(description || '');
  return (
    desc.includes('[下单身份: 会员]') ||
    desc.includes('[下单身份: VIP]') ||
    desc.includes('[Orderer: VIP]') ||
    desc.includes('[Orderer: Member]')
  );
}

export function isCancelledStatus(status?: string | null): boolean {
  return String(status || '').trim() === '已取消';
}

export function reviewWatchFlags(review: ReviewLike): ReviewWatchFlags {
  const status = String(review.status || 'published').trim().toLowerCase();
  const rating = Number(review.rating || 0);
  return {
    low: Number.isFinite(rating) && rating > 0 && rating <= LOW_REVIEW_RATING,
    unreplied: status === 'published' && !String(review.reply_text || '').trim(),
    hidden: status === 'hidden',
    pending: status === 'pending',
  };
}

/** 默认需关注：低分、待审、已隐藏。待回复单独筛，避免把全部已发布未回都算进来。 */
export function reviewNeedsWatch(review: ReviewLike): boolean {
  const flags = reviewWatchFlags(review);
  return flags.low || flags.pending || flags.hidden;
}

export function matchesReviewFilter(review: ReviewLike, filter: ReviewWatchFilter): boolean {
  const flags = reviewWatchFlags(review);
  if (filter === 'all') return true;
  if (filter === 'needs') return reviewNeedsWatch(review);
  if (filter === 'low') return flags.low;
  if (filter === 'unreplied') return flags.unreplied;
  if (filter === 'hidden') return flags.hidden;
  if (filter === 'pending') return flags.pending;
  return true;
}

export function filterReviews<T extends ReviewLike>(
  rows: T[],
  query: string,
  filter: ReviewWatchFilter,
): T[] {
  const q = query.trim().toLowerCase();
  return rows.filter((row) => {
    if (!matchesReviewFilter(row, filter)) return false;
    if (!q) return true;
    const hay = [row.id, row.store_id, row.order_id, row.user_name, row.comment]
      .map((v) => String(v ?? '').toLowerCase())
      .join(' ');
    return hay.includes(q);
  });
}

export function summarizeReviews(rows: ReviewLike[]): {
  needs: number;
  low: number;
  unreplied: number;
  hidden: number;
  pending: number;
} {
  let needs = 0;
  let low = 0;
  let unreplied = 0;
  let hidden = 0;
  let pending = 0;
  for (const row of rows) {
    const flags = reviewWatchFlags(row);
    if (reviewNeedsWatch(row)) needs += 1;
    if (flags.low) low += 1;
    if (flags.unreplied) unreplied += 1;
    if (flags.hidden) hidden += 1;
    if (flags.pending) pending += 1;
  }
  return { needs, low, unreplied, hidden, pending };
}

function asSenderType(raw?: string | null): ChatSenderType | '' {
  const s = String(raw || '').trim().toLowerCase();
  if (s === 'customer' || s === 'rider' || s === 'merchant' || s === 'admin') return s;
  return '';
}

export function isStaffSender(type?: string | null): boolean {
  const s = asSenderType(type);
  return s === 'merchant' || s === 'rider' || s === 'admin';
}

export function buildChatSessions(
  messages: ChatMessageLike[],
  now = new Date(),
): ChatSession[] {
  const byOrder = new Map<string, ChatMessageLike[]>();
  for (const msg of messages) {
    const orderId = String(msg.order_id || '').trim();
    if (!orderId) continue;
    const list = byOrder.get(orderId) || [];
    list.push(msg);
    byOrder.set(orderId, list);
  }

  const cutoff = CHAT_WAIT_MINUTES * 60 * 1000;
  const sessions: ChatSession[] = [];
  Array.from(byOrder.entries()).forEach(([orderId, list]) => {
    const sorted = [...list].sort((a, b) => {
      const ta = new Date(a.created_at || 0).getTime();
      const tb = new Date(b.created_at || 0).getTime();
      return ta - tb;
    });
    const last = sorted[sorted.length - 1];
    const lastAt = String(last?.created_at || '');
    const lastSenderType = asSenderType(last?.sender_type);
    const waitingStaff = lastSenderType === 'customer';
    const waitMs = lastAt ? Math.max(0, now.getTime() - new Date(lastAt).getTime()) : 0;
    sessions.push({
      orderId,
      lastMessage: String(last?.message || '').trim(),
      lastSenderType,
      lastAt,
      messageCount: sorted.length,
      waitingStaff,
      overdue: waitingStaff && waitMs >= cutoff,
      waitMs,
    });
  });

  return sessions.sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    if (a.waitingStaff !== b.waitingStaff) return a.waitingStaff ? -1 : 1;
    return new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime();
  });
}

export function matchesChatFilter(session: ChatSession, filter: ChatWatchFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'overdue') return session.overdue;
  return session.waitingStaff;
}

export function filterChatSessions<T extends ChatSession>(
  sessions: T[],
  query: string,
  filter: ChatWatchFilter,
): T[] {
  const q = query.trim().toLowerCase();
  return sessions.filter((session) => {
    if (!matchesChatFilter(session, filter)) return false;
    if (!q) return true;
    return (
      session.orderId.toLowerCase().includes(q) ||
      session.lastMessage.toLowerCase().includes(q)
    );
  });
}

export function summarizeChatSessions(sessions: ChatSession[]): {
  waiting: number;
  overdue: number;
} {
  return {
    waiting: sessions.filter((s) => s.waitingStaff).length,
    overdue: sessions.filter((s) => s.overdue).length,
  };
}

export function estimateBalanceRefundAmount(pkg: RefundPackageLike): number {
  const desc = String(pkg.description || '');
  const itemCost = parseMmkAmount(desc.match(ITEM_COST_RE)?.[1]);
  const delivery = parseMmkAmount(pkg.price);
  const member = isMemberBalanceOrder(desc);
  const paidByBalance = String(pkg.payment_method || '').trim() === 'balance';

  if (member) {
    let amount = itemCost;
    if (paidByBalance) amount += delivery;
    return amount;
  }
  if (paidByBalance) return itemCost + delivery;
  return itemCost;
}

export function normalizeRefundStatus(raw?: string | null): RefundStatus | null {
  const s = String(raw || '').trim().toLowerCase();
  if (s === 'pending' || s === 'refunded' || s === 'waived') return s;
  return null;
}

export function classifyRefund(pkg: RefundPackageLike): RefundStatus | null {
  if (!isCancelledStatus(pkg.status)) return null;
  const status = normalizeRefundStatus(pkg.refund_status);
  if (status) return status;
  const amount = Number(pkg.refund_amount) || estimateBalanceRefundAmount(pkg);
  const method = String(pkg.payment_method || '').trim();
  if (amount > 0 || method === 'balance' || method === 'qr') return 'pending';
  return null;
}

export function refundNeedsFollow(pkg: RefundPackageLike): boolean {
  return classifyRefund(pkg) === 'pending';
}

export function filterRefunds<T extends RefundPackageLike>(
  rows: T[],
  query: string,
  filter: RefundWatchFilter,
): Array<T & { refundKind: RefundStatus }> {
  const q = query.trim().toLowerCase();
  const out: Array<T & { refundKind: RefundStatus }> = [];
  for (const row of rows) {
    const kind = classifyRefund(row);
    if (!kind) continue;
    if (filter !== 'all' && kind !== filter) continue;
    if (q) {
      const hay = [row.id, row.customer_id, row.payment_method, row.refund_note]
        .map((v) => String(v ?? '').toLowerCase())
        .join(' ');
      if (!hay.includes(q)) continue;
    }
    out.push({ ...row, refundKind: kind });
  }
  return out;
}

export function summarizeRefunds(rows: RefundPackageLike[]): {
  pending: number;
  refunded: number;
  waived: number;
} {
  let pending = 0;
  let refunded = 0;
  let waived = 0;
  for (const row of rows) {
    const kind = classifyRefund(row);
    if (kind === 'pending') pending += 1;
    if (kind === 'refunded') refunded += 1;
    if (kind === 'waived') waived += 1;
  }
  return { pending, refunded, waived };
}

export type RefundActor = {
  id?: string;
  name?: string;
};

export function buildRefundPatch(
  status: RefundStatus,
  amount: number,
  note: string,
  actor: RefundActor,
  now = new Date().toISOString(),
): Record<string, unknown> {
  return {
    refund_status: status,
    refund_amount: amount,
    refund_note: String(note || '').trim(),
    refund_at: now,
    refund_by: String(actor.id || '').trim(),
    refund_by_name: String(actor.name || '').trim(),
    updated_at: now,
  };
}

export function stripRefundFields<T extends Record<string, unknown>>(
  patch: T,
): Omit<T, 'refund_status' | 'refund_amount' | 'refund_note' | 'refund_at' | 'refund_by' | 'refund_by_name'> {
  const next = { ...patch };
  delete next.refund_status;
  delete next.refund_amount;
  delete next.refund_note;
  delete next.refund_at;
  delete next.refund_by;
  delete next.refund_by_name;
  return next;
}

export function isMissingRefundColumn(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  const message = String(e?.message || '');
  return (
    e?.code === 'PGRST204' ||
    e?.code === '42703' ||
    /refund_status|refund_amount|refund_note|refund_at|refund_by/i.test(message)
  );
}

export function formatWaitLabel(waitMs: number): string {
  const totalMinutes = Math.floor(waitMs / 60000);
  if (totalMinutes < 1) return '不到 1 分钟';
  if (totalMinutes < 60) return `${totalMinutes} 分钟`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours} 小时 ${minutes} 分` : `${hours} 小时`;
}
