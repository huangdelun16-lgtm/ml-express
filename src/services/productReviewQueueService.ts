import { productNeedsAdminReview } from '../pages/deliveryStore/deliveryStoreShared';
import { auditLogService, supabase } from './supabase';
import { notifyAdminTodosRefresh } from '../utils/adminTodoBridge';
import {
  buildApproveUpdate,
  buildMerchantReviewNotice,
  buildRejectUpdate,
  getProductReviewKind,
  isValidRejectReason,
  normalizeRejectReason,
  submittedAtOf,
  type ProductReviewAction,
  type ProductReviewKind,
  type ReviewableProduct,
} from '../utils/productReviewDecision';

export type ProductReviewQueueItem = ReviewableProduct & {
  store_name: string;
  store_code: string;
  store_region: string;
  review_kind: ProductReviewKind;
  submitted_at: string | null;
};

export type ProductReviewActor = {
  user_id: string;
  user_name: string;
};

export type ProductReviewApplyResult = {
  ok: boolean;
  error?: string;
  notified: boolean;
};

const BATCH_SIZE = 40;

export function readAdminReviewActor(): ProductReviewActor {
  return {
    user_id:
      sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser') || 'admin',
    user_name:
      sessionStorage.getItem('currentUserName') ||
      localStorage.getItem('currentUserName') ||
      '管理员',
  };
}

async function loadStoreMap(): Promise<
  Record<string, { store_name: string; store_code: string; region: string }>
> {
  const { data, error } = await supabase
    .from('delivery_stores')
    .select('id, store_name, store_code, region');
  if (error) {
    console.error('loadStoreMap:', error);
    return {};
  }
  const map: Record<string, { store_name: string; store_code: string; region: string }> = {};
  for (const row of data || []) {
    if (!row?.id) continue;
    map[row.id] = {
      store_name: String(row.store_name || ''),
      store_code: String(row.store_code || ''),
      region: String(row.region || ''),
    };
  }
  return map;
}

export async function fetchProductReviewQueue(): Promise<ProductReviewQueueItem[]> {
  const [productsRes, storeMap] = await Promise.all([
    supabase
      .from('products')
      .select('*')
      .or('listing_status.eq.pending,pending_update.not.is.null')
      .order('updated_at', { ascending: false }),
    loadStoreMap(),
  ]);

  if (productsRes.error) {
    throw new Error(productsRes.error.message || '加载待审商品失败');
  }

  return (productsRes.data || [])
    .filter((row) => productNeedsAdminReview(row))
    .map((row) => {
      const store = storeMap[row.store_id] || { store_name: '', store_code: '', region: '' };
      const item = row as ReviewableProduct;
      return {
        ...item,
        store_name: store.store_name,
        store_code: store.store_code,
        store_region: store.region,
        review_kind: getProductReviewKind(item),
        submitted_at: submittedAtOf(item),
      };
    })
    .sort((a, b) => {
      const ta = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
      const tb = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
      return tb - ta;
    });
}

async function updateProductReviewRow(
  productId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const first = await supabase.from('products').update(payload).eq('id', productId);
  if (!first.error) return;
  const message = first.error.message || '';
  if (!/listing_review_notes/i.test(message)) {
    throw new Error(message || '更新商品失败');
  }
  const fallback = { ...payload };
  delete fallback.listing_review_notes;
  const second = await supabase.from('products').update(fallback).eq('id', productId);
  if (second.error) {
    throw new Error(second.error.message || '更新商品失败');
  }
}

async function insertMerchantNotice(
  notice: ReturnType<typeof buildMerchantReviewNotice>,
): Promise<boolean> {
  const attempts = [
    notice,
    { ...notice, notification_type: 'system' },
    { ...notice, recipient_type: 'customer', notification_type: 'system' },
  ];
  for (const row of attempts) {
    const { error } = await supabase.from('notifications').insert([row]);
    if (!error) return true;
  }
  return false;
}

async function writeReviewAudit(input: {
  actor: ProductReviewActor;
  product: ReviewableProduct;
  action: ProductReviewAction;
  reason?: string;
}): Promise<void> {
  const kind = getProductReviewKind(input.product);
  const name = String(input.product.name || input.product.id);
  const actionLabel = input.action === 'approved' ? '通过' : '拒绝';
  const kindLabel = kind === 'edit' ? '修改待审' : '新品上架';
  const reason = normalizeRejectReason(input.reason);
  await auditLogService.log({
    user_id: input.actor.user_id,
    user_name: input.actor.user_name,
    action_type: 'update',
    module: 'delivery_stores',
    target_id: input.product.id,
    target_name: name,
    action_description: `商品审核${actionLabel}（${kindLabel}）：${name}${
      reason ? `；原因：${reason}` : ''
    }`,
    old_value: JSON.stringify({
      listing_status: input.product.listing_status ?? null,
      pending_update: input.product.pending_update ?? null,
    }),
    new_value: JSON.stringify({
      action: input.action,
      kind,
      reason: reason || null,
    }),
  });
}

export async function applyProductReviewDecision(input: {
  product: ReviewableProduct;
  action: ProductReviewAction;
  reason?: string;
  actor?: ProductReviewActor;
}): Promise<ProductReviewApplyResult> {
  const actor = input.actor || readAdminReviewActor();
  const now = new Date().toISOString();
  let payload: Record<string, unknown>;

  if (input.action === 'rejected') {
    if (!isValidRejectReason(input.reason)) {
      return { ok: false, error: '请填写至少 2 个字的拒绝原因', notified: false };
    }
    payload = buildRejectUpdate(input.product, now, input.reason || '');
  } else {
    payload = buildApproveUpdate(input.product, now);
  }

  try {
    await updateProductReviewRow(input.product.id, payload);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : '更新商品失败',
      notified: false,
    };
  }

  const storeId = String(input.product.store_id || '');
  let notified = false;
  if (storeId) {
    const notice = buildMerchantReviewNotice({
      storeId,
      productId: input.product.id,
      productName: String(input.product.name || ''),
      action: input.action,
      kind: getProductReviewKind(input.product),
      reason: input.reason,
    });
    notified = await insertMerchantNotice(notice);
  }

  try {
    await writeReviewAudit({
      actor,
      product: input.product,
      action: input.action,
      reason: input.reason,
    });
  } catch (error) {
    console.warn('商品审核审计写入失败:', error);
  }

  notifyAdminTodosRefresh();
  return { ok: true, notified };
}

export async function applyProductReviewBatch(input: {
  products: ReviewableProduct[];
  action: ProductReviewAction;
  reason?: string;
  actor?: ProductReviewActor;
}): Promise<{ success: number; failed: number; notified: number; lastError?: string }> {
  const actor = input.actor || readAdminReviewActor();
  let success = 0;
  let failed = 0;
  let notified = 0;
  let lastError: string | undefined;

  for (let i = 0; i < input.products.length; i += BATCH_SIZE) {
    const chunk = input.products.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      chunk.map((product) =>
        applyProductReviewDecision({
          product,
          action: input.action,
          reason: input.reason,
          actor,
        }),
      ),
    );
    for (const result of results) {
      if (result.ok) {
        success += 1;
        if (result.notified) notified += 1;
      } else {
        failed += 1;
        lastError = result.error;
      }
    }
  }

  return { success, failed, notified, lastError };
}

