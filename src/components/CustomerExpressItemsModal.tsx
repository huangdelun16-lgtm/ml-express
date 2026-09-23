import React, { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../contexts/LanguageContext';
import {
  fetchInventoryCustomerItems,
  type InventoryCustomerExpressItem,
  type InventoryCustomerSummary,
  type InventoryTransitStore,
} from '../services/inventoryConsoleService';
import DualMoney from './DualMoney';
import {
  customerExpressLedgerCategory,
  displayRateForCustomerCategory,
  isSettledCustomerCategory,
  resolveCustomerFeeCny,
} from '../utils/crossBorderFx';
import { groupCustomerExpressItems } from '../utils/packagingStockInDisplay';
import {
  buildUnsignedCustomerInvoice,
  formatUnsignedInvoiceFee,
  formatUnsignedInvoiceWeight,
  isUnsignedExpressItem,
  type UnsignedCustomerInvoice,
} from '../utils/customerUnsignedInvoice';
import { yangonTodayYmd } from '../utils/yangonFinancePeriod';
import '../styles/crossBorderLogistics.css';

type Props = {
  open: boolean;
  onClose: () => void;
  customer: InventoryCustomerSummary | null;
  fxRate?: number | null;
  stores?: InventoryTransitStore[];
};

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

function FeeCell({
  item,
  sharedLabel,
  isEn,
  fxRate,
}: {
  item: InventoryCustomerExpressItem;
  sharedLabel?: string;
  isEn: boolean;
  fxRate: number | null;
}) {
  if (item.fee > 0) {
    return (
      <>
        <DualMoney
          mmk={item.fee}
          rate={displayRateForCustomerCategory(
            customerExpressLedgerCategory(item),
            item.fxMmkPerCny,
            fxRate,
          )}
          cny={item.paidCny != null && item.paidCny > 0 ? item.paidCny : undefined}
        />
        {isSettledCustomerCategory(customerExpressLedgerCategory(item)) ? (
          <span className="cbl-fx-lock-hint">
            {item.fxMmkPerCny || (item.paidCny != null && item.paidCny > 0)
              ? isEn
                ? 'Locked FX'
                : '锁定汇率'
              : isEn
                ? 'MMK only'
                : '旧单无锁'}
          </span>
        ) : null}
      </>
    );
  }
  if (sharedLabel) {
    return <span className="cbl-fee-shared">{sharedLabel}</span>;
  }
  return <>{'—'}</>;
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

function stationName(code: string, stores: InventoryTransitStore[]): string {
  const key = code.trim().toUpperCase();
  const store = stores.find((item) => {
    const storeCode = item.store_code.trim().toUpperCase();
    const region = String(item.region || '').trim().toUpperCase();
    return storeCode === key || region === key;
  });
  if (!store) return code;
  const name = store.store_name.trim();
  if (!name) return store.store_code;
  if (name.toUpperCase().includes(store.store_code.trim().toUpperCase())) return name;
  return `${store.store_code} ${name}`.trim();
}

const CustomerExpressItemsModal: React.FC<Props> = ({
  open,
  onClose,
  customer,
  fxRate = null,
  stores = [],
}) => {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<InventoryCustomerExpressItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [invoice, setInvoice] = useState<UnsignedCustomerInvoice | null>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const [tableScroll, setTableScroll] = useState({ left: false, right: false });

  const itemGroups = useMemo(() => groupCustomerExpressItems(items), [items]);
  const unsignedIds = useMemo(
    () => items.filter((item) => isUnsignedExpressItem(item)).map((item) => item.id),
    [items],
  );
  const selectedUnsignedIds = useMemo(
    () => selectedIds.filter((id) => unsignedIds.includes(id)),
    [selectedIds, unsignedIds],
  );
  const allUnsignedChecked = unsignedIds.length > 0 && selectedUnsignedIds.length === unsignedIds.length;

  const headerCny = useMemo(() => {
    if (!items.length) return undefined;
    let total = 0;
    for (const item of items) {
      if (item.fee <= 0) continue;
      const category = customerExpressLedgerCategory(item);
      const cny = resolveCustomerFeeCny({
        category,
        mmk: item.fee,
        lockedRate: item.fxMmkPerCny,
        paidCny: item.paidCny,
        liveRate: fxRate,
      });
      if (cny == null) return null;
      total += cny;
    }
    return total;
  }, [items, fxRate]);

  useEffect(() => {
    if (!open || !customer) return;
    setLoading(true);
    setError(null);
    setSelectedIds([]);
    setInvoice(null);
    void fetchInventoryCustomerItems(
      customer.customerCode ? '' : customer.customerName,
      customer.customerPhone,
      customer.customerCode,
    )
      .then((data) => setItems(data.items))
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : '加载失败');
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, [open, customer]);

  useEffect(() => {
    if (!invoice) return;
    const onBefore = () => document.body.classList.add('cbl-printing-invoice');
    const onAfter = () => document.body.classList.remove('cbl-printing-invoice');
    window.addEventListener('beforeprint', onBefore);
    window.addEventListener('afterprint', onAfter);
    return () => {
      window.removeEventListener('beforeprint', onBefore);
      window.removeEventListener('afterprint', onAfter);
      document.body.classList.remove('cbl-printing-invoice');
    };
  }, [invoice]);

  const toggleId = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((row) => row !== id) : [...current, id],
    );
  };

  const toggleAllUnsigned = () => {
    setSelectedIds(allUnsignedChecked ? [] : unsignedIds);
  };

  const openInvoice = () => {
    if (!selectedUnsignedIds.length) return;
    setInvoice(buildUnsignedCustomerInvoice(items, selectedUnsignedIds));
  };

  const syncTableScroll = () => {
    const el = tableScrollRef.current;
    if (!el) {
      setTableScroll({ left: false, right: false });
      return;
    }
    const max = el.scrollWidth - el.clientWidth;
    setTableScroll({
      left: el.scrollLeft > 8,
      right: max - el.scrollLeft > 8,
    });
  };

  useEffect(() => {
    syncTableScroll();
    const el = tableScrollRef.current;
    if (!el) return;
    const onScroll = () => syncTableScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    const observer = new ResizeObserver(onScroll);
    observer.observe(el);
    window.addEventListener('resize', onScroll);
    return () => {
      el.removeEventListener('scroll', onScroll);
      observer.disconnect();
      window.removeEventListener('resize', onScroll);
    };
  }, [items, loading]);

  const nudgeTable = (direction: -1 | 1) => {
    const el = tableScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.max(240, Math.round(el.clientWidth * 0.72)), behavior: 'smooth' });
  };

  if (!open || !customer) return null;

  const watermarkTops = [16, 72, 128, 184, 240, 296, 352, 408, 464, 520];

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
                    {isEn ? 'Total fee' : '总费用'}
                  </span>
                  <strong>
                    <DualMoney
                      mmk={customer.totalFee}
                      rate={items.length ? null : fxRate}
                      cny={items.length ? headerCny : undefined}
                    />
                  </strong>
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
                <div className="cbl-customer-items-panel__summary">
                  <span className="cbl-customer-items-panel__count">
                    {isEn
                      ? `${items.length} express record(s)`
                      : `共 ${items.length} 条快递记录`}
                  </span>
                  <span className="cbl-customer-items-panel__unsigned">
                    {isEn
                      ? `${unsignedIds.length} unsigned can be invoiced`
                      : `${unsignedIds.length} 条未签收可开发票`}
                  </span>
                </div>
                <div className="cbl-customer-items-panel__tools">
                  <button
                    type="button"
                    className="cbl-btn cbl-btn--ghost cbl-btn--small"
                    onClick={toggleAllUnsigned}
                    disabled={!unsignedIds.length}
                  >
                    {allUnsignedChecked
                      ? isEn
                        ? 'Clear'
                        : '取消全选'
                      : isEn
                        ? 'Select unsigned'
                        : '全选未签收'}
                  </button>
                  <button
                    type="button"
                    className="cbl-btn cbl-btn--primary cbl-btn--small"
                    onClick={openInvoice}
                    disabled={!selectedUnsignedIds.length}
                  >
                    {isEn
                      ? `Invoice (${selectedUnsignedIds.length})`
                      : `打 Invoice（${selectedUnsignedIds.length}）`}
                  </button>
                </div>
              </div>
              <div className="cbl-customer-items-scroll">
                <div className="cbl-customer-items-scroll__bar">
                  <button
                    type="button"
                    className="cbl-customer-items-scroll__btn"
                    onClick={() => nudgeTable(-1)}
                    disabled={!tableScroll.left}
                    aria-label={isEn ? 'Scroll left' : '向左滑'}
                  >
                    <span aria-hidden="true">‹</span>
                    {isEn ? 'Left' : '向左'}
                  </button>
                  <span className="cbl-customer-items-scroll__hint">
                    {isEn ? 'Scroll sideways to see the rest of the columns' : '左右滑动查看后面的列'}
                  </span>
                  <button
                    type="button"
                    className="cbl-customer-items-scroll__btn"
                    onClick={() => nudgeTable(1)}
                    disabled={!tableScroll.right}
                    aria-label={isEn ? 'Scroll right' : '向右滑'}
                  >
                    {isEn ? 'Right' : '向右'}
                    <span aria-hidden="true">›</span>
                  </button>
                </div>
              <div ref={tableScrollRef} className="cbl-table-wrap cbl-customer-items-table-wrap">
                <table className="cbl-table cbl-table--customer-items">
                  <thead>
                    <tr>
                      <th className="cbl-customer-check-col">
                        <input
                          type="checkbox"
                          checked={allUnsignedChecked}
                          disabled={!unsignedIds.length}
                          onChange={toggleAllUnsigned}
                          aria-label={isEn ? 'Select all unsigned' : '全选未签收'}
                        />
                      </th>
                      <th>{isEn ? 'Inbound date' : '入库日期'}</th>
                      <th>{isEn ? 'Product' : '商品名称'}</th>
                      <th>{isEn ? 'Express' : '快递单'}</th>
                      <th>{isEn ? 'Inbound' : '入库单'}</th>
                      <th>{isEn ? 'Packaging' : '商品包装'}</th>
                      <th>{isEn ? 'Origin' : '始发地'}</th>
                      <th>{isEn ? 'Destination' : '目的地'}</th>
                      <th>{isEn ? 'Weight' : '重量'}</th>
                      <th>{isEn ? 'Qty' : '数量'}</th>
                      <th className="cbl-col-num">{isEn ? 'Fee' : '费用'}</th>
                      <th>{isEn ? 'Payment' : '付款状态'}</th>
                      <th>{isEn ? 'Package' : '包裹状态'}</th>
                      <th>{isEn ? 'Transport' : '运输状态'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemGroups.map((group) => {
                      const rows = group.type === 'single' ? [group.item] : group.items;
                      const sharedLabel =
                        group.type === 'packaging' && group.sharedFee > 0
                          ? isEn
                            ? 'Shared total'
                            : '同批总价'
                          : undefined;
                      return (
                        <Fragment key={group.type === 'single' ? group.item.id : `pack:${group.base}`}>
                          {group.type === 'packaging' ? (
                            <tr className="cbl-packaging-group-head">
                              <td colSpan={14}>
                                {isEn
                                  ? `Multiple inbound · ${group.base} · ${group.items.length}/${group.declaredTotal} parcels · one total fee`
                                  : `多个入库 · ${group.base} · ${group.items.length}/${group.declaredTotal} 件 · 总费用只计一次`}
                              </td>
                            </tr>
                          ) : null}
                          {rows.map((item) => {
                            const unsigned = isUnsignedExpressItem(item);
                            const checked = unsigned && selectedUnsignedIds.includes(item.id);
                            return (
                            <tr
                              key={item.id}
                              className={[
                                group.type === 'packaging' ? 'cbl-packaging-group-row' : '',
                                unsigned ? '' : 'cbl-customer-row--signed',
                                checked ? 'cbl-customer-row--picked' : '',
                              ]
                                .filter(Boolean)
                                .join(' ')}
                            >
                              <td className="cbl-customer-check-col">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={!unsigned}
                                  onChange={() => toggleId(item.id)}
                                  aria-label={item.expressBarcode}
                                  title={
                                    unsigned
                                      ? undefined
                                      : isEn
                                        ? 'Signed orders cannot be invoiced'
                                        : '已签收，不能开发票'
                                  }
                                />
                              </td>
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
                                <FeeCell
                                  item={item}
                                  sharedLabel={item.fee > 0 ? undefined : sharedLabel}
                                  isEn={isEn}
                                  fxRate={fxRate}
                                />
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
                            );
                          })}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
            {isEn
              ? 'Check unsigned orders and print one invoice. A multiple-inbound batch is charged once. Signed orders stay off the invoice.'
              : '勾选未签收订单，打成一张发票发给客户。多个入库总费用只计一次。已签收的不进发票。'}
          </span>
          <div className="cbl-customer-modal__foot-actions">
            <button
              type="button"
              className="cbl-btn cbl-btn--primary"
              onClick={openInvoice}
              disabled={!selectedUnsignedIds.length}
            >
              {isEn ? 'Print invoice' : '打 Invoice'}
            </button>
            <button type="button" className="cbl-btn cbl-btn--ghost" onClick={onClose}>
              {isEn ? 'Close' : '关闭'}
            </button>
          </div>
        </footer>
      </div>
      {invoice
        ? createPortal(
            <UnsignedInvoicePreview
              invoice={invoice}
              customerName={customer.customerName}
              phone={customer.customerPhone}
              station={invoice.stationCodes.map((code) => stationName(code, stores)).join(' · ')}
              issuedOn={yangonTodayYmd()}
              isEn={isEn}
              watermarkTops={watermarkTops}
              onClose={() => setInvoice(null)}
            />,
            document.body,
          )
        : null}
    </div>,
    document.body,
  );
};

function UnsignedInvoicePreview({
  invoice,
  customerName,
  phone,
  station,
  issuedOn,
  isEn,
  watermarkTops,
  onClose,
}: {
  invoice: UnsignedCustomerInvoice;
  customerName: string;
  phone: string;
  station: string;
  issuedOn: string;
  isEn: boolean;
  watermarkTops: number[];
  onClose: () => void;
}) {
  const weight = formatUnsignedInvoiceWeight(invoice.totalWeightKg) || '—';
  const fee = formatUnsignedInvoiceFee(invoice.totalFeeMmk, isEn ? 'Free rate' : '免费优惠');
  const meta: Array<{ label: string; value: string }> = [
    { label: isEn ? 'Customer' : '客户姓名', value: customerName || '—' },
  ];
  if (phone && phone !== '—') meta.push({ label: isEn ? 'Phone' : '电话', value: phone });
  if (invoice.destination) {
    meta.push({ label: isEn ? 'Final destination' : '最终目的地', value: invoice.destination });
  }
  if (station) meta.push({ label: isEn ? 'Receiving station' : '收货站', value: station });
  if (invoice.packNo) meta.push({ label: isEn ? 'Pack no.' : '包装号', value: invoice.packNo });
  meta.push({ label: isEn ? 'Pieces' : '件数', value: String(invoice.pieceCount) });
  if (invoice.payment) meta.push({ label: isEn ? 'Payment' : '付款方式', value: invoice.payment });
  meta.push({ label: isEn ? 'Date' : '开单日期', value: issuedOn });

  return (
    <div className="cbl-unsigned-invoice-overlay" role="presentation" onClick={onClose}>
      <div
        className="cbl-unsigned-invoice-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Invoice"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="cbl-unsigned-invoice-scroll">
          <article className="cbl-invoice-paper">
            <div className="cbl-invoice-watermark" aria-hidden="true">
              {watermarkTops.map((top) => (
                <span key={top} style={{ top }}>
                  MARKET LINK
                </span>
              ))}
            </div>
            <div className="cbl-invoice-body">
              <div className="cbl-invoice-brand">
                <div>
                  <strong>MARKET LINK</strong>
                  <span>EXPRESS</span>
                </div>
                <em>INVOICE</em>
              </div>
              <div className="cbl-invoice-rule" />
              <div className="cbl-invoice-rule cbl-invoice-rule--thin" />
              <dl className="cbl-invoice-meta">
                {meta.map((row) => (
                  <div key={row.label}>
                    <dt>{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
              {invoice.groups.map((group, groupIndex) => (
                <section key={`${group.kind}-${groupIndex}`} className="cbl-invoice-orders">
                  <h3>{group.kind === 'packaging' ? (isEn ? 'Order nos' : '订单号') : isEn ? 'Waybill' : '单号'}</h3>
                  {group.expressNos.map((no, index) => (
                    <div key={`${no}-${index}`} className="cbl-invoice-order">
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      <strong>{no || '—'}</strong>
                    </div>
                  ))}
                </section>
              ))}
              <div className="cbl-invoice-totals">
                <div>
                  <span>{isEn ? 'Total weight' : '总重量'}</span>
                  <strong>{weight}</strong>
                </div>
                <div className="cbl-invoice-fee">
                  <span>{isEn ? 'Total fee' : '总费用'}</span>
                  <strong>{fee}</strong>
                </div>
              </div>
              <p className="cbl-invoice-note">
                {isEn ? 'Please pay against this invoice' : '请凭此单据付款'}
              </p>
              <p className="cbl-invoice-footer">MARKET LINK EXPRESS</p>
            </div>
          </article>
        </div>
        <div className="cbl-unsigned-invoice-actions">
          <button type="button" className="cbl-invoice-save" onClick={() => window.print()}>
            {isEn ? 'Print / Save PDF' : '打印 / 存 PDF'}
          </button>
          <button type="button" className="cbl-invoice-close" onClick={onClose}>
            {isEn ? 'Close' : '关闭'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CustomerExpressItemsModal;
