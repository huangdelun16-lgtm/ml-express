import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import ProductReviewRejectModal from '../components/ProductReviewRejectModal';
import { notifyAdminTodosRefresh } from '../utils/adminTodoBridge';
import { rewritePublicStorageUrl } from '../utils/supabaseBrowserUrl';
import { feedbackService } from '../services/FeedbackService';
import {
  applyProductReviewBatch,
  applyProductReviewDecision,
  fetchProductReviewQueue,
  type ProductReviewQueueItem,
} from '../services/productReviewQueueService';
import {
  ADMIN_PRODUCT_FIELD_LABELS,
  ADMIN_PRODUCT_DIFF_KEYS,
  buildAdminProductChanges,
  formatAdminProductFieldText,
  hasPendingProductUpdate,
  listingStatusLabel,
  normalizeProductListingStatus,
} from './deliveryStore/deliveryStoreShared';
import { formatVariantsForDisplay } from '../utils/productVariants';
import { filterReviewQueue, getProductReviewKind } from '../utils/productReviewDecision';
import '../styles/merchantApplications.css';
import '../styles/adminStoreCreateForm.css';
import '../styles/adminProductReviewQueue.css';

type KindFilter = 'all' | 'new' | 'edit';

function formatWhen(iso: string | null, language: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(language === 'en' ? 'en-US' : 'zh-CN');
  } catch {
    return iso;
  }
}

function displayName(item: ProductReviewQueueItem): string {
  if (item.review_kind === 'edit' && item.pending_update && typeof item.pending_update.name === 'string') {
    return item.pending_update.name;
  }
  return String(item.name || '未命名商品');
}

function displayPrice(item: ProductReviewQueueItem): string {
  const raw =
    item.review_kind === 'edit' && item.pending_update && item.pending_update.price !== undefined
      ? item.pending_update.price
      : item.price;
  const n = Number(raw);
  return Number.isFinite(n) ? `${n.toLocaleString()} MMK` : '—';
}

function imageOf(item: ProductReviewQueueItem): string {
  const raw =
    item.review_kind === 'edit' && item.pending_update && typeof item.pending_update.image_url === 'string'
      ? item.pending_update.image_url
      : item.image_url;
  return typeof raw === 'string' ? rewritePublicStorageUrl(raw) : '';
}

const ProductReviewQueuePage: React.FC = () => {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const [searchParams, setSearchParams] = useSearchParams();
  const storeFilter = (searchParams.get('store') || '').trim();

  const [items, setItems] = useState<ProductReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<KindFilter>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<ProductReviewQueueItem | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ProductReviewQueueItem[] | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      const next = await fetchProductReviewQueue();
      setItems(next);
      setLastUpdatedAt(Date.now());
      notifyAdminTodosRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : isEn ? 'Failed to load' : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [isEn]);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load({ silent: true }), 20000);
    return () => window.clearInterval(t);
  }, [load]);

  const rows = useMemo(
    () => filterReviewQueue(items, query, kind, storeFilter || undefined),
    [items, query, kind, storeFilter],
  );

  const selectedRows = useMemo(
    () => rows.filter((row) => selectedIds.includes(row.id)),
    [rows, selectedIds],
  );

  const allVisibleSelected = rows.length > 0 && rows.every((row) => selectedIds.includes(row.id));

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleAllVisible = () => {
    if (allVisibleSelected) {
      const visible = new Set(rows.map((r) => r.id));
      setSelectedIds((prev) => prev.filter((id) => !visible.has(id)));
      return;
    }
    setSelectedIds((prev) => Array.from(new Set([...prev, ...rows.map((r) => r.id)])));
  };

  const afterChange = async () => {
    setSelectedIds([]);
    setDetail(null);
    setRejectTarget(null);
    await load({ silent: true });
  };

  const approveItems = async (targets: ProductReviewQueueItem[]) => {
    if (!targets.length) return;
    setBusy(true);
    try {
      if (targets.length === 1) {
        const one = await applyProductReviewDecision({ product: targets[0], action: 'approved' });
        if (!one.ok) {
          feedbackService.notify(one.error || (isEn ? 'Approve failed' : '通过失败'));
          return;
        }
        feedbackService.notify(isEn ? 'Approved. Merchant notified.' : '已通过，已通知商家');
      } else {
        const batch = await applyProductReviewBatch({ products: targets, action: 'approved' });
        feedbackService.notify(
          isEn
            ? `Approved ${batch.success}, failed ${batch.failed}`
            : `已通过 ${batch.success} 件，失败 ${batch.failed} 件`,
        );
        if (batch.failed && batch.lastError) feedbackService.notify(batch.lastError);
      }
      await afterChange();
    } finally {
      setBusy(false);
    }
  };

  const rejectItems = async (targets: ProductReviewQueueItem[], reason: string) => {
    if (!targets.length) return;
    setBusy(true);
    try {
      if (targets.length === 1) {
        const one = await applyProductReviewDecision({
          product: targets[0],
          action: 'rejected',
          reason,
        });
        if (!one.ok) {
          feedbackService.notify(one.error || (isEn ? 'Reject failed' : '拒绝失败'));
          return;
        }
        feedbackService.notify(isEn ? 'Rejected. Merchant can see the reason.' : '已拒绝，商家可见原因');
      } else {
        const batch = await applyProductReviewBatch({
          products: targets,
          action: 'rejected',
          reason,
        });
        feedbackService.notify(
          isEn
            ? `Rejected ${batch.success}, failed ${batch.failed}`
            : `已拒绝 ${batch.success} 件，失败 ${batch.failed} 件`,
        );
        if (batch.failed && batch.lastError) feedbackService.notify(batch.lastError);
      }
      await afterChange();
    } finally {
      setBusy(false);
    }
  };

  const clearStoreFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('store');
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="merchant-apps-page">
      <div className="merchant-apps-header">
        <div>
          <h1>{isEn ? 'Product review queue' : '商品审核工作台'}</h1>
          <p>
            {isEn
              ? 'Review new listings and price/content edits across all stores. Rejecting requires a reason the merchant can see.'
              : '跨店处理新品上架与改价/改图申请。拒绝必须填写原因，商家会在商品页看到。'}
          </p>
          <p style={{ marginTop: '0.35rem' }}>
            <Link to="/admin/delivery-stores" style={{ color: '#2563eb' }}>
              {isEn ? '← Merchant stores' : '← 返回商家管理'}
            </Link>
          </p>
        </div>
        <div className="merchant-apps-toolbar">
          <input
            className="merchant-apps-filter prd-review-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isEn ? 'Search name / store / code' : '搜索商品、店铺、店码'}
          />
          <select
            className="merchant-apps-filter"
            value={kind}
            onChange={(e) => setKind(e.target.value as KindFilter)}
          >
            <option value="all">{isEn ? `All (${items.length})` : `全部 (${items.length})`}</option>
            <option value="new">{isEn ? 'New listings' : '新品上架'}</option>
            <option value="edit">{isEn ? 'Edits' : '修改待审'}</option>
          </select>
          <button
            type="button"
            className="merchant-apps-btn merchant-apps-btn--ghost"
            onClick={() => void load({ silent: items.length > 0 })}
          >
            {isEn ? 'Refresh' : '刷新'}
          </button>
          <span className="merchant-apps-poll-hint">
            {isEn ? 'Auto-refresh every 20s' : '每 20 秒自动刷新'}
            {lastUpdatedAt ? ` · ${isEn ? 'Updated' : '已更新'} ${new Date(lastUpdatedAt).toLocaleTimeString()}` : ''}
          </span>
        </div>
      </div>

      {storeFilter ? (
        <div className="merchant-apply-alert" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8' }}>
          {isEn ? 'Filtered by one store.' : '已按指定店铺筛选。'}
          <button type="button" className="merchant-apps-btn merchant-apps-btn--ghost" style={{ marginLeft: 8 }} onClick={clearStoreFilter}>
            {isEn ? 'Show all' : '查看全部'}
          </button>
        </div>
      ) : null}

      {error && (
        <div className="merchant-apply-alert merchant-apply-alert--error" role="alert">
          {error}
        </div>
      )}

      {selectedRows.length > 0 && (
        <div className="prd-review-batch">
          <span className="prd-review-batch__count">
            {isEn ? `${selectedRows.length} selected` : `已选 ${selectedRows.length} 件`}
          </span>
          <button
            type="button"
            className="merchant-apps-btn merchant-apps-btn--success"
            disabled={busy}
            onClick={() => void approveItems(selectedRows)}
          >
            {isEn ? 'Approve selected' : '批量通过'}
          </button>
          <button
            type="button"
            className="merchant-apps-btn merchant-apps-btn--danger"
            disabled={busy}
            onClick={() => setRejectTarget(selectedRows)}
          >
            {isEn ? 'Reject selected' : '批量拒绝'}
          </button>
        </div>
      )}

      <div className="merchant-apps-table-wrap">
        {loading ? (
          <div className="merchant-apps-empty">{isEn ? 'Loading…' : '加载中…'}</div>
        ) : rows.length === 0 ? (
          <div className="merchant-apps-empty">
            {isEn ? 'No products waiting for review.' : '当前没有待审核商品。'}
          </div>
        ) : (
          <table className="merchant-apps-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    className="prd-review-check"
                    checked={allVisibleSelected}
                    onChange={toggleAllVisible}
                    aria-label={isEn ? 'Select all' : '全选'}
                  />
                </th>
                <th>{isEn ? 'Product' : '商品'}</th>
                <th>{isEn ? 'Store' : '店铺'}</th>
                <th>{isEn ? 'Type' : '类型'}</th>
                <th>{isEn ? 'Price' : '价格'}</th>
                <th>{isEn ? 'Submitted' : '提交时间'}</th>
                <th>{isEn ? 'Actions' : '操作'}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => {
                const thumb = imageOf(item);
                return (
                  <tr key={item.id} className="prd-review-row" onClick={() => setDetail(item)}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="prd-review-check"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => toggleOne(item.id)}
                      />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        {thumb ? (
                          <img className="prd-review-thumb" src={thumb} alt="" />
                        ) : (
                          <div className="prd-review-thumb prd-review-thumb--empty">无图</div>
                        )}
                        <div>
                          <div className="prd-review-name">{displayName(item)}</div>
                          <div className="prd-review-sub">{item.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="prd-review-name">{item.store_name || '—'}</div>
                      <div className="prd-review-sub">{item.store_code || item.store_id}</div>
                    </td>
                    <td>
                      <span className={`prd-review-kind prd-review-kind--${item.review_kind}`}>
                        {item.review_kind === 'edit'
                          ? isEn
                            ? 'Edit'
                            : '修改待审'
                          : isEn
                            ? 'New'
                            : '新品'}
                      </span>
                    </td>
                    <td>{displayPrice(item)}</td>
                    <td>{formatWhen(item.submitted_at, language)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="prd-review-actions">
                        <button
                          type="button"
                          className="merchant-apps-btn merchant-apps-btn--success"
                          disabled={busy}
                          onClick={() => void approveItems([item])}
                        >
                          {isEn ? 'Approve' : '通过'}
                        </button>
                        <button
                          type="button"
                          className="merchant-apps-btn merchant-apps-btn--danger"
                          disabled={busy}
                          onClick={() => setRejectTarget([item])}
                        >
                          {isEn ? 'Reject' : '拒绝'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {detail && (
        <ProductReviewDetail
          item={detail}
          isEn={isEn}
          busy={busy}
          onClose={() => setDetail(null)}
          onApprove={() => void approveItems([detail])}
          onReject={() => setRejectTarget([detail])}
        />
      )}

      <ProductReviewRejectModal
        open={!!rejectTarget?.length}
        productLabel={
          rejectTarget && rejectTarget.length === 1
            ? displayName(rejectTarget[0])
            : isEn
              ? `${rejectTarget?.length || 0} products`
              : `${rejectTarget?.length || 0} 件商品`
        }
        count={rejectTarget?.length || 1}
        language={language}
        submitting={busy}
        onCancel={() => setRejectTarget(null)}
        onConfirm={(reason) => void rejectItems(rejectTarget || [], reason)}
      />
    </div>
  );
};

function ProductReviewDetail(props: {
  item: ProductReviewQueueItem;
  isEn: boolean;
  busy: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const { item, isEn, busy, onClose, onApprove, onReject } = props;
  const ls = normalizeProductListingStatus(item);
  const isEditPending = ls === 'approved' && hasPendingProductUpdate(item);
  const changes = buildAdminProductChanges(item);
  const kind = getProductReviewKind(item);
  const pu = item.pending_update;

  const renderImage = (value: unknown) => {
    const url = typeof value === 'string' ? rewritePublicStorageUrl(value) : '';
    if (!url) return <span className="admin-product-detail__empty">{isEn ? 'None' : '无'}</span>;
    return (
      <a href={url} target="_blank" rel="noreferrer" className="admin-product-detail__img-link">
        <img src={url} alt="" className="admin-product-detail__thumb" />
      </a>
    );
  };

  const renderField = (key: string, value: unknown) => {
    if (key === 'image_url') return renderImage(value);
    if (key === 'detail_image_urls') {
      const urls = Array.isArray(value) ? value.filter((u) => typeof u === 'string') : [];
      if (!urls.length) return <span className="admin-product-detail__empty">{isEn ? 'None' : '无'}</span>;
      return (
        <div className="admin-product-detail__detail-scroll">
          {urls.map((url, idx) => (
            <a key={`${url}-${idx}`} href={rewritePublicStorageUrl(url)} target="_blank" rel="noreferrer">
              <img src={rewritePublicStorageUrl(url)} alt="" className="admin-product-detail__detail-thumb" />
            </a>
          ))}
        </div>
      );
    }
    if (key === 'variants') {
      return <p className="admin-product-detail__desc">{formatVariantsForDisplay(value)}</p>;
    }
    return <span>{formatAdminProductFieldText(key, value)}</span>;
  };

  return (
    <div className="admin-product-detail-overlay" role="presentation" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="admin-product-detail" role="dialog" aria-modal="true">
        <div className="admin-product-detail__head">
          <div>
            <h2 className="admin-product-detail__title">{displayName(item)}</h2>
            <p className="admin-product-detail__sub">
              {item.store_name} · {item.store_code || item.store_id}
            </p>
          </div>
          <button type="button" className="admin-product-detail__close" onClick={onClose} aria-label={isEn ? 'Close' : '关闭'}>
            ×
          </button>
        </div>
        <div className="admin-product-detail__body">
          <div className="admin-product-detail__badges">
            <span className={`admin-product-detail__badge admin-product-detail__badge--${ls}`}>
              {listingStatusLabel(ls, isEditPending)}
            </span>
            <span className="admin-product-detail__badge admin-product-detail__badge--muted">
              {kind === 'edit' ? (isEn ? 'Edit pending' : '修改待审') : isEn ? 'New listing' : '新品上架'}
            </span>
          </div>
          {changes.length > 0 && (
            <section className="admin-product-detail__section">
              <h3 className="admin-product-detail__section-title">
                {isEditPending ? (isEn ? 'Requested changes' : '商家修改申请') : isEn ? 'Submitted content' : '新商品待审内容'}
              </h3>
              <div className={`admin-product-detail__diff-table${changes[0]?.isNewProduct ? ' admin-product-detail__diff-table--new' : ''}`}>
                <div className="admin-product-detail__diff-row admin-product-detail__diff-row--head">
                  <span>{isEn ? 'Field' : '字段'}</span>
                  {!changes[0]?.isNewProduct && <span>{isEn ? 'Live' : '线上现值'}</span>}
                  <span>{changes[0]?.isNewProduct ? (isEn ? 'Submitted' : '提交内容') : isEn ? 'Requested' : '申请改为'}</span>
                </div>
                {changes.map((row) => (
                  <div key={row.key} className={`admin-product-detail__diff-row${row.changed ? ' is-changed' : ''}`}>
                    <span className="admin-product-detail__diff-label">
                      {row.label}
                      {row.changed && <em>{isEn ? 'changed' : '已改'}</em>}
                    </span>
                    {!row.isNewProduct && <div className="admin-product-detail__diff-cell">{renderField(row.key, row.before)}</div>}
                    <div className="admin-product-detail__diff-cell admin-product-detail__diff-cell--after">
                      {renderField(row.key, row.after)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          {isEditPending && (
            <section className="admin-product-detail__section">
              <h3 className="admin-product-detail__section-title">{isEn ? 'Live version' : '线上当前版本'}</h3>
              <div className="admin-product-detail__grid">
                {ADMIN_PRODUCT_DIFF_KEYS.map((key) => (
                  <div key={key} className="admin-product-detail__field">
                    <div className="admin-product-detail__field-label">{ADMIN_PRODUCT_FIELD_LABELS[key]}</div>
                    <div className="admin-product-detail__field-value">{renderField(key, item[key])}</div>
                  </div>
                ))}
              </div>
            </section>
          )}
          {isEditPending && pu && (
            <section className="admin-product-detail__section">
              <h3 className="admin-product-detail__section-title">{isEn ? 'After approval' : '通过后客户将看到'}</h3>
              <div className="admin-product-detail__grid">
                {ADMIN_PRODUCT_DIFF_KEYS.map((key) => {
                  const previewVal = pu[key] !== undefined ? pu[key] : item[key];
                  return (
                    <div key={`preview-${key}`} className="admin-product-detail__field">
                      <div className="admin-product-detail__field-label">{ADMIN_PRODUCT_FIELD_LABELS[key]}</div>
                      <div className="admin-product-detail__field-value">{renderField(key, previewVal)}</div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
        <div className="admin-product-detail__foot">
          <button type="button" className="admin-product-detail__btn admin-product-detail__btn--approve" disabled={busy} onClick={onApprove}>
            {isEn ? 'Approve' : '通过'}
          </button>
          <button type="button" className="admin-product-detail__btn admin-product-detail__btn--reject" disabled={busy} onClick={onReject}>
            {isEn ? 'Reject' : '拒绝'}
          </button>
          <button type="button" className="admin-product-detail__btn admin-product-detail__btn--ghost" onClick={onClose}>
            {isEn ? 'Close' : '关闭'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProductReviewQueuePage;
