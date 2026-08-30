import {
  buildApproveUpdate,
  buildMerchantReviewNotice,
  buildRejectUpdate,
  filterReviewQueue,
  getProductReviewKind,
  isValidRejectReason,
  normalizeRejectReason,
  submittedAtOf,
} from './productReviewDecision';

const newProduct = {
  id: 'p1',
  store_id: 's1',
  name: '芒果干',
  listing_status: 'pending',
  pending_update: null,
  price: 1000,
};

const editProduct = {
  id: 'p2',
  store_id: 's1',
  name: '旧名',
  listing_status: 'approved',
  price: 1000,
  pending_update: {
    name: '新名',
    price: 1200,
    submitted_at: '2026-08-30T01:00:00.000Z',
  },
};

describe('productReviewDecision', () => {
  it('classifies new vs edit reviews', () => {
    expect(getProductReviewKind(newProduct)).toBe('new');
    expect(getProductReviewKind(editProduct)).toBe('edit');
  });

  it('requires a non-empty reject reason', () => {
    expect(isValidRejectReason('  ')).toBe(false);
    expect(isValidRejectReason('图')).toBe(false);
    expect(isValidRejectReason(' 图片不符 ')).toBe(true);
    expect(normalizeRejectReason('  价格  不对  ')).toBe('价格 不对');
  });

  it('approves a new listing and clears review notes', () => {
    const payload = buildApproveUpdate(newProduct, '2026-08-30T02:00:00.000Z');
    expect(payload.listing_status).toBe('approved');
    expect(payload.is_available).toBe(true);
    expect(payload.pending_update).toBeNull();
    expect(payload.listing_review_notes).toBeNull();
  });

  it('approves an edit by merging pending_update', () => {
    const payload = buildApproveUpdate(editProduct, '2026-08-30T02:00:00.000Z');
    expect(payload.listing_status).toBe('approved');
    expect(payload.name).toBe('新名');
    expect(payload.price).toBe(1200);
    expect(payload.pending_update).toBeNull();
  });

  it('rejects a new listing without publishing', () => {
    const payload = buildRejectUpdate(newProduct, '2026-08-30T02:00:00.000Z', '图片模糊');
    expect(payload.listing_status).toBe('rejected');
    expect(payload.is_available).toBe(false);
    expect(payload.listing_review_notes).toBe('图片模糊');
  });

  it('rejects an edit by dropping pending_update and keeping live listing', () => {
    const payload = buildRejectUpdate(editProduct, '2026-08-30T02:00:00.000Z', '价格不合理');
    expect(payload.listing_status).toBeUndefined();
    expect(payload.pending_update).toBeNull();
    expect(payload.listing_review_notes).toBe('价格不合理');
  });

  it('builds a merchant notice that includes the reject reason', () => {
    const notice = buildMerchantReviewNotice({
      storeId: 's1',
      productId: 'p1',
      productName: '芒果干',
      action: 'rejected',
      kind: 'new',
      reason: '缺少主图',
    });
    expect(notice.recipient_type).toBe('merchant');
    expect(notice.title).toContain('未通过');
    expect(notice.message).toContain('缺少主图');
    expect(notice.metadata.reason).toBe('缺少主图');
  });

  it('filters the queue by store, kind and search', () => {
    const rows = [
      { ...newProduct, store_name: 'A店', store_code: 'MDY001' },
      { ...editProduct, store_name: 'B店', store_code: 'YGN002' },
    ];
    expect(filterReviewQueue(rows, '芒果', 'all')).toHaveLength(1);
    expect(filterReviewQueue(rows, '', 'edit')).toHaveLength(1);
    expect(filterReviewQueue(rows, '', 'all', 's1')).toHaveLength(2);
    expect(filterReviewQueue(rows, 'YGN', 'all')).toHaveLength(1);
  });

  it('prefers pending_update.submitted_at', () => {
    expect(submittedAtOf(editProduct)).toBe('2026-08-30T01:00:00.000Z');
  });
});
