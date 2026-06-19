import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../contexts/LanguageContext';
import {
  fetchInventoryCustomerItems,
  type InventoryCustomerExpressItem,
  type InventoryCustomerSummary,
} from '../services/inventoryConsoleService';
import '../styles/crossBorderLogistics.css';

type Props = {
  open: boolean;
  onClose: () => void;
  customer: InventoryCustomerSummary | null;
};

function formatMmK(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

function paymentStatusClass(status: string): string {
  if (status === '已付款' || status === '已收款') return 'cbl-status-pill cbl-status-pill--green';
  if (status === '到付待收') return 'cbl-status-pill cbl-status-pill--amber';
  return 'cbl-status-pill cbl-status-pill--gray';
}

function packageStatusClass(status: string): string {
  if (status === '已打包') return 'cbl-status-pill cbl-status-pill--purple';
  return 'cbl-status-pill cbl-status-pill--gray';
}

function transportStatusClass(status: string): string {
  if (status === '已签收' || status === '已入库') return 'cbl-status-pill cbl-status-pill--green';
  if (status === '已到站' || status === '已中转') return 'cbl-status-pill cbl-status-pill--blue';
  if (status === '待转出' || status === '待中转') return 'cbl-status-pill cbl-status-pill--purple';
  return 'cbl-status-pill cbl-status-pill--gray';
}

function formatInboundDate(isEn: boolean, value?: string | null): string {
  if (!value?.trim()) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(isEn ? 'en-US' : 'zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

const CustomerExpressItemsModal: React.FC<Props> = ({ open, onClose, customer }) => {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<InventoryCustomerExpressItem[]>([]);

  useEffect(() => {
    if (!open || !customer) return;
    setLoading(true);
    setError(null);
    void fetchInventoryCustomerItems(customer.customerName, customer.customerPhone)
      .then((data) => setItems(data.items))
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : '加载失败');
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, [open, customer]);

  if (!open || !customer) return null;

  return createPortal(
    <div
      className="store-form-overlay cbl-create-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="cbl-pricing-modal cbl-customer-items-modal" role="dialog" aria-modal="true">
        <header className="cbl-pricing-modal__head cbl-customer-modal__head">
          <div className="cbl-customer-modal__head-main">
            <div className="cbl-customer-modal__avatar" aria-hidden="true">客</div>
            <div>
              <h2 className="cbl-pricing-modal__title cbl-customer-modal__title">
                {customer.customerName}
              </h2>
              {customer.customerPhone && customer.customerPhone !== '—' ? (
                <p className="cbl-customer-modal__phone">{customer.customerPhone}</p>
              ) : null}
              <div className="cbl-customer-modal__stats">
                <span className="cbl-customer-modal__stat">
                  <span className="cbl-customer-modal__stat-label">
                    {isEn ? 'Orders' : '订单'}
                  </span>
                  <strong>{customer.orderCount}</strong>
                </span>
                <span className="cbl-customer-modal__stat">
                  <span className="cbl-customer-modal__stat-label">
                    {isEn ? 'Pieces' : '总件数'}
                  </span>
                  <strong>{customer.totalPieces}</strong>
                </span>
                <span className="cbl-customer-modal__stat">
                  <span className="cbl-customer-modal__stat-label">
                    {isEn ? 'Weight' : '总重量'}
                  </span>
                  <strong>
                    {customer.totalWeightKg > 0 ? `${customer.totalWeightKg} Kg` : '—'}
                  </strong>
                </span>
                <span className="cbl-customer-modal__stat cbl-customer-modal__stat--fee">
                  <span className="cbl-customer-modal__stat-label">
                    {isEn ? 'Total MMK' : '总费用'}
                  </span>
                  <strong>{formatMmK(customer.totalFee)}</strong>
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="cbl-pricing-modal__close"
            onClick={onClose}
            aria-label={isEn ? 'Close' : '关闭'}
          >
            ✕
          </button>
        </header>

        {error ? (
          <div className="cbl-pricing-modal__alert cbl-pricing-modal__alert--error">{error}</div>
        ) : null}

        <div className="cbl-customer-items-body">
          {loading ? (
            <div className="cbl-customer-modal__loading">
              <span className="cbl-customer-modal__spinner" aria-hidden="true" />
              <span>{isEn ? 'Loading express items…' : '正在加载快递明细…'}</span>
            </div>
          ) : items.length ? (
            <div className="cbl-customer-items-panel">
              <div className="cbl-customer-items-panel__bar">
                <span className="cbl-customer-items-panel__count">
                  {isEn
                    ? `${items.length} express record(s)`
                    : `共 ${items.length} 条快递记录`}
                </span>
              </div>
              <div className="cbl-table-wrap cbl-customer-items-table-wrap">
                <table className="cbl-table cbl-table--customer-items">
                  <thead>
                    <tr>
                      <th>{isEn ? 'Inbound date' : '入库日期'}</th>
                      <th>{isEn ? 'Product' : '商品名称'}</th>
                      <th>{isEn ? 'Express' : '快递单'}</th>
                      <th>{isEn ? 'Inbound' : '入库单'}</th>
                      <th>{isEn ? 'Packaging' : '商品包装'}</th>
                      <th>{isEn ? 'Origin' : '始发地'}</th>
                      <th>{isEn ? 'Destination' : '目的地'}</th>
                      <th>{isEn ? 'Weight' : '重量'}</th>
                      <th>{isEn ? 'Qty' : '数量'}</th>
                      <th className="cbl-col-num">{isEn ? 'Fee MMK' : '费用MMK'}</th>
                      <th>{isEn ? 'Payment' : '付款状态'}</th>
                      <th>{isEn ? 'Package' : '包裹状态'}</th>
                      <th>{isEn ? 'Transport' : '运输状态'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="cbl-dim">{formatInboundDate(isEn, item.inboundAt)}</td>
                        <td className="cbl-customer-col-product">
                          <span className="cbl-customer-product-name">{item.productName}</span>
                        </td>
                        <td><span className="cbl-code">{item.expressBarcode}</span></td>
                        <td><span className="cbl-code">{item.inboundBarcode}</span></td>
                        <td>{item.packaging}</td>
                        <td><span className="cbl-code cbl-code--origin">{item.origin}</span></td>
                        <td><span className="cbl-dest-chip">{item.destination}</span></td>
                        <td>{item.weight}</td>
                        <td className="cbl-col-num">{item.qty}</td>
                        <td className="cbl-col-num cbl-col-fee">
                          {item.fee > 0 ? formatMmK(item.fee) : '—'}
                        </td>
                        <td>
                          <span className={paymentStatusClass(item.paymentStatus)}>
                            {item.paymentStatus}
                          </span>
                        </td>
                        <td>
                          <span className={packageStatusClass(item.packageStatus)}>
                            {item.packageStatus}
                          </span>
                        </td>
                        <td>
                          <span className={transportStatusClass(item.transportStatus)}>
                            {item.transportStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="cbl-customer-modal__empty">
              <span className="cbl-customer-modal__empty-icon" aria-hidden="true">📭</span>
              <p>{isEn ? 'No express items.' : '暂无快递记录。'}</p>
            </div>
          )}
        </div>

        <footer className="cbl-pricing-modal__foot cbl-customer-modal__foot">
          <span className="cbl-customer-modal__foot-hint">
            {isEn ? 'Express details from Inventory App' : '数据来自 Inventory App 快递明细'}
          </span>
          <button type="button" className="cbl-btn cbl-btn--primary" onClick={onClose}>
            {isEn ? 'Close' : '关闭'}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
};

export default CustomerExpressItemsModal;
