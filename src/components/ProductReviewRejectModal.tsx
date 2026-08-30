import React, { useEffect, useState } from 'react';
import { isValidRejectReason } from '../utils/productReviewDecision';
import '../styles/merchantApplications.css';

type Props = {
  open: boolean;
  productLabel: string;
  count?: number;
  language: string;
  submitting?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
};

const ProductReviewRejectModal: React.FC<Props> = ({
  open,
  productLabel,
  count = 1,
  language,
  submitting,
  onCancel,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');
  const isEn = language === 'en';

  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  if (!open) return null;

  const title = isEn
    ? count > 1
      ? `Reject ${count} products`
      : 'Reject product'
    : count > 1
      ? `拒绝 ${count} 件商品`
      : '拒绝商品';

  return (
    <div className="merchant-apps-modal-overlay" role="presentation" onClick={onCancel}>
      <div
        className="merchant-apps-modal product-review-reject-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-review-reject-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="merchant-apps-modal__head">
          <h2 id="product-review-reject-title" className="merchant-apps-modal__title">
            {title}
          </h2>
          <button type="button" className="merchant-apps-modal__close" onClick={onCancel} aria-label={isEn ? 'Close' : '关闭'}>
            ×
          </button>
        </div>
        <div className="merchant-apps-modal__body">
          <p style={{ margin: '0 0 0.75rem', color: '#475569', fontSize: '0.9rem' }}>
            {productLabel}
          </p>
          <label htmlFor="product_review_reject_reason" style={{ display: 'block', fontWeight: 700, marginBottom: 6 }}>
            {isEn ? 'Reason (required)' : '拒绝原因（必填）'}
          </label>
          <textarea
            id="product_review_reject_reason"
            className="merchant-apps-filter"
            style={{ width: '100%', minHeight: 96, resize: 'vertical' }}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={isEn ? 'Tell the merchant why this was rejected…' : '请写明拒绝原因，商家会在商品页看到…'}
            autoFocus
          />
        </div>
        <div className="merchant-apps-modal__foot">
          <button type="button" className="merchant-apps-btn merchant-apps-btn--ghost" onClick={onCancel} disabled={submitting}>
            {isEn ? 'Cancel' : '取消'}
          </button>
          <button
            type="button"
            className="merchant-apps-btn merchant-apps-btn--danger"
            disabled={submitting || !isValidRejectReason(reason)}
            onClick={() => onConfirm(reason)}
          >
            {submitting ? (isEn ? 'Saving…' : '提交中…') : isEn ? 'Reject' : '确认拒绝'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductReviewRejectModal;
