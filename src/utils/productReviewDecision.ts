import {
  hasPendingProductUpdate,
  normalizeProductListingStatus,
} from '../pages/deliveryStore/deliveryStoreShared';

export type ProductReviewKind = 'new' | 'edit';

export type ProductReviewAction = 'approved' | 'rejected';

export type ReviewableProduct = {
  id: string;
  store_id?: string;
  name?: string;
  listing_status?: string | null;
  pending_update?: Record<string, unknown> | null;
  listing_review_notes?: string | null;
  [key: string]: unknown;
};

const MERGE_KEYS = [
  'name',
  'description',
  'price',
  'original_price',
  'variants',
  'image_url',
  'detail_image_urls',
  'stock',
  'is_available',
] as const;

export function getProductReviewKind(product: ReviewableProduct): ProductReviewKind {
  return normalizeProductListingStatus(product) === 'approved' && hasPendingProductUpdate(product)
    ? 'edit'
    : 'new';
}

export function normalizeRejectReason(raw: string | undefined | null): string {
  return String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isValidRejectReason(raw: string | undefined | null): boolean {
  return normalizeRejectReason(raw).length >= 2;
}

export function submittedAtOf(product: ReviewableProduct): string | null {
  const pu = product.pending_update;
  if (pu && typeof pu.submitted_at === 'string' && pu.submitted_at.trim()) {
    return pu.submitted_at;
  }
  if (typeof product.updated_at === 'string' && product.updated_at) return product.updated_at;
  if (typeof product.created_at === 'string' && product.created_at) return product.created_at;
  return null;
}

export function buildApproveUpdate(
  product: ReviewableProduct,
  now: string,
): Record<string, unknown> {
  if (getProductReviewKind(product) === 'edit') {
    const pu = (product.pending_update || {}) as Record<string, unknown>;
    const mergePayload: Record<string, unknown> = {
      pending_update: null,
      listing_status: 'approved',
      listing_review_notes: null,
      updated_at: now,
    };
    for (const key of MERGE_KEYS) {
      if (pu[key] !== undefined) mergePayload[key] = pu[key];
    }
    return mergePayload;
  }
  return {
    listing_status: 'approved',
    is_available: true,
    pending_update: null,
    listing_review_notes: null,
    updated_at: now,
  };
}

export function buildRejectUpdate(
  product: ReviewableProduct,
  now: string,
  reason: string,
): Record<string, unknown> {
  const listing_review_notes = normalizeRejectReason(reason);
  if (getProductReviewKind(product) === 'edit') {
    return {
      pending_update: null,
      listing_review_notes,
      updated_at: now,
    };
  }
  return {
    listing_status: 'rejected',
    is_available: false,
    listing_review_notes,
    updated_at: now,
  };
}

export function buildMerchantReviewNotice(input: {
  storeId: string;
  productId: string;
  productName: string;
  action: ProductReviewAction;
  kind: ProductReviewKind;
  reason?: string;
}): {
  recipient_id: string;
  recipient_type: string;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  metadata: Record<string, unknown>;
} {
  const name = input.productName.trim() || '未命名商品';
  const approved = input.action === 'approved';
  const kindLabel = input.kind === 'edit' ? '修改' : '上架';
  const reason = normalizeRejectReason(input.reason);
  const title = approved ? `商品${kindLabel}已通过` : `商品${kindLabel}未通过`;
  let message = approved
    ? `您的商品「${name}」已通过审核，会员端可见。`
    : `您的商品「${name}」未通过审核。`;
  if (!approved && reason) {
    message += `\n原因：${reason}`;
  }
  return {
    recipient_id: input.storeId,
    recipient_type: 'merchant',
    notification_type: 'product_review',
    title,
    message,
    is_read: false,
    metadata: {
      product_id: input.productId,
      product_name: name,
      action: input.action,
      kind: input.kind,
      reason: reason || null,
      reviewed_at: new Date().toISOString(),
    },
  };
}

export function filterReviewQueue<T extends ReviewableProduct & { store_name?: string; store_code?: string }>(
  items: T[],
  query: string,
  kind: 'all' | ProductReviewKind,
  storeId?: string,
): T[] {
  const q = query.trim().toLowerCase();
  return items.filter((item) => {
    if (storeId && item.store_id !== storeId) return false;
    if (kind !== 'all' && getProductReviewKind(item) !== kind) return false;
    if (!q) return true;
    const hay = [item.name, item.store_name, item.store_code, item.id]
      .map((v) => String(v ?? '').toLowerCase())
      .join(' ');
    return hay.includes(q);
  });
}
