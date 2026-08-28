import React, { useMemo } from 'react';
import OrderQRCode from '../profile/OrderQRCode';
import {
  MERCHANT_ORDER_STATUS,
  type MerchantLanguage,
} from '../../constants/merchantOrderStatus';
import {
  computePackageOrderTotalMmk,
  parsePackageLineItems,
} from '../../utils/parsePackageLineItems';
import MerchantOrderChatPanel from './MerchantOrderChatPanel';
import './merchantOrderModals.css';

export interface MerchantPackageDetailModalProps {
  open: boolean;
  pkg: any;
  language: MerchantLanguage;
  productPriceMap: Record<string, number>;
  isPartnerStore: boolean;
  actionLoading: boolean;
  title: string;
  closeLabel: string;
  packageIdLabel: string;
  getStatusColor: (status: string) => string;
  getStatusText: (status: string) => string;
  getPaymentMethodText: (method?: string) => string;
  onClose: () => void;
  onAccept: (pkg: any) => void;
  onCancel?: (pkg: any) => void;
  onStartPacking: (pkg: any) => void;
  merchantUserId?: string | null;
}

const MerchantPackageDetailModal: React.FC<MerchantPackageDetailModalProps> = ({
  open,
  pkg,
  language,
  productPriceMap,
  isPartnerStore,
  actionLoading,
  title,
  closeLabel,
  packageIdLabel,
  getStatusColor,
  getStatusText,
  getPaymentMethodText,
  onClose,
  onAccept,
  onCancel,
  onStartPacking,
  merchantUserId,
}) => {
  const parsedItems = useMemo(
    () => parsePackageLineItems(pkg?.description, productPriceMap),
    [pkg?.description, productPriceMap],
  );

  const totalMmk = useMemo(
    () => (pkg ? computePackageOrderTotalMmk(pkg, parsedItems) : 0),
    [pkg, parsedItems],
  );

  if (!open || !pkg) return null;

  const displayStatus =
    pkg.status === MERCHANT_ORDER_STATUS.PENDING_COD
      ? MERCHANT_ORDER_STATUS.PENDING_PICKUP
      : pkg.status;

  return (
    <div className="merchant-modal-overlay" onClick={onClose}>
      <div className="merchant-modal-panel" onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
            borderBottom: '2px solid rgba(255,255,255,0.3)',
            paddingBottom: '1rem',
          }}
        >
          <h2 style={{ color: 'white', fontSize: '1.5rem', margin: 0 }}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            {closeLabel}
          </button>
        </div>

        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              background: 'rgba(255,255,255,0.03)',
              padding: '1.5rem',
              borderRadius: '24px',
              border: '1px solid rgba(255,255,255,0.05)',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', fontWeight: 'bold' }}>
                {packageIdLabel}
              </div>
              <div style={{ color: '#fbbf24', fontSize: '1.6rem', fontWeight: 900 }}>#{pkg.id}</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginTop: 8 }}>
                📅 {pkg.create_time || pkg.created_at || '-'}
              </div>
              <div style={{ marginTop: '1rem' }}>
                <span
                  style={{
                    display: 'inline-block',
                    background: getStatusColor(displayStatus),
                    color: 'white',
                    padding: '0.5rem 1.2rem',
                    borderRadius: '24px',
                    fontSize: '0.9rem',
                    fontWeight: 900,
                  }}
                >
                  {pkg.status === MERCHANT_ORDER_STATUS.PENDING_COD
                    ? getStatusText(pkg.status)
                    : pkg.status}
                </span>
              </div>
            </div>
            <div style={{ background: 'white', padding: 10, borderRadius: 16 }}>
              <OrderQRCode orderId={pkg.id} />
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {[
              { title: '商家信息', color: '#3b82f6', name: pkg.sender_name, phone: pkg.sender_phone, addr: pkg.sender_address },
              { title: '客户信息', color: '#fbbf24', name: pkg.receiver_name, phone: pkg.receiver_phone, addr: pkg.receiver_address },
            ].map((block) => (
              <div
                key={block.title}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  padding: '1.5rem',
                  borderRadius: '24px',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <div style={{ color: block.color, fontSize: '0.8rem', fontWeight: 900, marginBottom: 12, letterSpacing: 1 }}>
                  {block.title}
                </div>
                <div style={{ color: 'white', fontWeight: 800, fontSize: '1.1rem' }}>{block.name}</div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem', marginTop: 6 }}>{block.phone}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginTop: 6, lineHeight: 1.4 }}>{block.addr}</div>
              </div>
            ))}
          </div>

          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              padding: '1.5rem',
              borderRadius: '24px',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <div style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 900, marginBottom: 15, letterSpacing: 1 }}>
              商品清单
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {parsedItems.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: 'white' }}>
                  <span style={{ fontWeight: 600 }}>• {item.label}</span>
                  <span>
                    x{item.qty}
                    {item.price != null ? ` · ${item.price.toLocaleString()} MMK` : ''}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px dashed rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.5)' }}>
                <span>支付方式</span>
                <span style={{ color: 'white', fontWeight: 700 }}>{getPaymentMethodText(pkg.payment_method)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.5)' }}>
                <span>跑腿费用</span>
                <span style={{ color: 'white', fontWeight: 700 }}>{pkg.price}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'white', fontWeight: 900, fontSize: '1.1rem' }}>合计金额</span>
                <span style={{ color: '#fbbf24', fontWeight: 950, fontSize: '1.5rem' }}>{totalMmk.toLocaleString()} MMK</span>
              </div>
            </div>
          </div>

          {pkg.notes ? (
            <div style={{ background: 'rgba(251,191,36,0.1)', padding: '1.25rem', borderRadius: 20, border: '1px solid rgba(251,191,36,0.2)' }}>
              <div style={{ color: '#fbbf24', fontSize: '0.8rem', fontWeight: 900, marginBottom: 6 }}>💡 客户备注</div>
              <div style={{ color: 'white', lineHeight: 1.5 }}>{pkg.notes}</div>
            </div>
          ) : null}

          <MerchantOrderChatPanel
            orderId={pkg.id}
            userId={merchantUserId}
            courierName={pkg.courier}
            language={language}
          />
        </div>

        {isPartnerStore ? (
          <div style={{ marginTop: '1rem' }}>
            {pkg.status === MERCHANT_ORDER_STATUS.PENDING_CONFIRM ? (
              <>
                <button
                  type="button"
                  onClick={() => onAccept(pkg)}
                  disabled={actionLoading}
                  style={{
                    width: '100%',
                    marginBottom: '0.5rem',
                    padding: '1rem 2rem',
                    borderRadius: 12,
                    border: 'none',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    fontWeight: 900,
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {actionLoading ? <span className="merchant-modal-spinner" /> : `✅ ${language === 'zh' ? '立即接单' : 'Accept Order'}`}
                </button>
                {onCancel ? (
                  <button
                    type="button"
                    onClick={() => onCancel(pkg)}
                    disabled={actionLoading}
                    style={{
                      width: '100%',
                      padding: '0.8rem',
                      borderRadius: 10,
                      border: '1px solid rgba(239,68,68,0.2)',
                      background: 'rgba(239,68,68,0.1)',
                      color: '#ef4444',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                  >
                    {language === 'zh' ? '拒绝接单' : 'Reject Order'}
                  </button>
                ) : null}
              </>
            ) : null}
            {pkg.status === MERCHANT_ORDER_STATUS.PACKING ? (
              <button
                type="button"
                onClick={() => onStartPacking(pkg)}
                disabled={actionLoading}
                style={{
                  width: '100%',
                  marginBottom: '0.5rem',
                  padding: '1rem 2rem',
                  borderRadius: 12,
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  fontWeight: 900,
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                }}
              >
                📦 {language === 'zh' ? '开始打包' : 'Start Packing'}
              </button>
            ) : null}
          </div>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: '1rem',
            width: '100%',
            padding: '0.75rem 2rem',
            borderRadius: 8,
            border: '1px solid rgba(59,130,246,0.7)',
            background: 'rgba(59,130,246,0.5)',
            color: 'white',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          {closeLabel}
        </button>
      </div>
    </div>
  );
};

export default MerchantPackageDetailModal;
