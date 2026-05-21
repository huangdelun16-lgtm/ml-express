import React from 'react';
import type { getPackingModalModel } from '../../utils/parseOrderPackingItems';
import type { MerchantLanguage } from '../../constants/merchantOrderStatus';
import './merchantOrderModals.css';

type PackingModalModel = ReturnType<typeof getPackingModalModel>;

export interface MerchantPackingModalProps {
  open: boolean;
  order: any;
  language: MerchantLanguage;
  packageIdLabel: string;
  model: PackingModalModel | null;
  checkedItems: Record<string, boolean>;
  actionLoading: boolean;
  canComplete: boolean;
  onClose: () => void;
  onToggleItem: (itemId: string) => void;
  onComplete: () => void;
}

const MerchantPackingModal: React.FC<MerchantPackingModalProps> = ({
  open,
  order,
  language,
  packageIdLabel,
  model,
  checkedItems,
  actionLoading,
  canComplete,
  onClose,
  onToggleItem,
  onComplete,
}) => {
  if (!open || !order) return null;

  const zh = language === 'zh';
  const en = language === 'en';

  return (
    <div className="merchant-modal-overlay merchant-packing-overlay" onClick={onClose}>
      <div className="merchant-packing-panel" onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            padding: '2.5rem 2rem',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📦</div>
          <h2 style={{ color: 'white', fontSize: '2rem', fontWeight: 950, margin: 0 }}>
            {zh ? '订单打包中' : 'Order Packing'}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', marginTop: '0.5rem', fontWeight: 600 }}>
            {packageIdLabel}: {order.id}
          </p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
          <h3 style={{ color: '#1e293b', fontSize: '1.2rem', fontWeight: 900, marginBottom: '1.5rem' }}>
            📋 {zh ? '核对商品清单' : en ? 'Checklist' : 'ပစ္စည်းစာရင်းစစ်ဆေးရန်'}
          </h3>

          {model && model.lineCount === 0 ? (
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                padding: '1.5rem',
                background: '#f8fafc',
                borderRadius: 24,
                border: '2px dashed #e2e8f0',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={!!checkedItems.default}
                onChange={() => onToggleItem('default')}
                style={{ width: 24, height: 24 }}
              />
              <span style={{ fontWeight: 800, color: '#1e293b' }}>
                {zh ? '确认商品已备齐' : 'Confirm all items ready'}
              </span>
            </label>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {model?.rows.map((row, index) => (
                <div
                  key={`${row.name}-${index}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => onToggleItem(`item-${index}`)}
                  onKeyDown={(e) => e.key === 'Enter' && onToggleItem(`item-${index}`)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '28px 1fr auto auto auto',
                    gap: 8,
                    alignItems: 'center',
                    padding: '1rem 0.75rem',
                    background: checkedItems[`item-${index}`] ? 'rgba(16,185,129,0.05)' : '#f8fafc',
                    borderRadius: 18,
                    border: `2px solid ${checkedItems[`item-${index}`] ? '#10b981' : '#f1f5f9'}`,
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      border: `2px solid ${checkedItems[`item-${index}`] ? '#10b981' : '#cbd5e1'}`,
                      background: checkedItems[`item-${index}`] ? '#10b981' : 'transparent',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {checkedItems[`item-${index}`] ? '✓' : ''}
                  </div>
                  <span style={{ fontWeight: 700, color: '#1e293b', wordBreak: 'break-word' }}>{row.name}</span>
                  <span style={{ fontWeight: 700 }}>{row.qty}</span>
                  <span style={{ fontSize: '0.85rem' }}>
                    {row.unitPrice != null ? row.unitPrice.toLocaleString() : '—'}
                  </span>
                  <span style={{ fontWeight: 800 }}>
                    {row.lineTotal != null ? row.lineTotal.toLocaleString() : '—'}
                  </span>
                </div>
              ))}
              {model?.summaryTotal != null ? (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '1rem',
                    background: '#ecfdf5',
                    borderRadius: 16,
                    border: '1px solid #a7f3d0',
                    fontWeight: 900,
                    color: '#065f46',
                  }}
                >
                  <span>{zh ? '商品合计（MMK）' : 'Items total (MMK)'}</span>
                  <span>{model.summaryTotal.toLocaleString()}</span>
                </div>
              ) : null}
            </div>
          )}

          {model?.customerNote ? (
            <div style={{ background: '#fffbeb', padding: '1.5rem', borderRadius: 24, border: '1px solid #fde68a', marginTop: '1.5rem' }}>
              <h4 style={{ color: '#92400e', margin: '0 0 0.5rem', fontSize: '0.95rem' }}>💡 {zh ? '客户备注' : 'Customer Note'}</h4>
              <p style={{ color: '#b45309', margin: 0, fontWeight: 600 }}>{model.customerNote}</p>
            </div>
          ) : null}
        </div>

        <div style={{ padding: '1.5rem', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
          <button
            type="button"
            onClick={onComplete}
            disabled={actionLoading || !canComplete}
            style={{
              width: '100%',
              padding: '1.2rem',
              borderRadius: 24,
              border: 'none',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              fontSize: '1.2rem',
              fontWeight: 950,
              cursor: actionLoading || !canComplete ? 'not-allowed' : 'pointer',
              opacity: canComplete && !actionLoading ? 1 : 0.6,
            }}
          >
            {actionLoading ? '...' : zh ? '确认打包完成' : 'Confirm Packing Done'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MerchantPackingModal;
