import React, { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../contexts/LanguageContext';
import {
  fetchInventoryConsolePacks,
  fetchInventoryCustomerItems,
  type InventoryCustomerExpressItem,
  type InventoryCustomerSummary,
  type InventoryTransitStore,
} from '../services/inventoryConsoleService';
import DualMoney, { formatMmK } from './DualMoney';
import {
  formatCnyInput,
  parseCrossBorderFxHistory,
  resolveCustomerOrderMoney,
  sumCustomerOrderMoney,
  CROSS_BORDER_FX_HISTORY_SETTINGS_KEY,
  type CustomerOrderMoney,
} from '../utils/crossBorderFx';
import {
  buildMissingRouteCnyPayload,
  feeFromRouteUnit,
  resolveExpressItemUnitPrice,
  resolveRouteUnitQuote,
  type RouteRateSetting,
} from '../utils/crossBorderRoutePricing';
import { systemSettingsService } from '../services/supabase';
import { groupCustomerExpressItems, packagingFeeRowWeight } from '../utils/packagingStockInDisplay';
import {
  buildUnsignedCustomerInvoice,
  formatUnsignedInvoiceFee,
  formatUnsignedInvoiceQuote,
  formatUnsignedInvoiceUnitPrice,
  formatUnsignedInvoiceRate,
  formatUnsignedInvoiceWeight,
  isUnsignedExpressItem,
  readUnsignedQuoteCny,
  packagingBatchSelectionIds,
  settleUnsignedInvoice,
  type UnsignedCustomerInvoice,
  type UnsignedInvoiceOrderGroup,
} from '../utils/customerUnsignedInvoice';
import { saveElementAsPng } from '../utils/saveElementAsPng';
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

/** 同一批多个入库只在第一件上留报价，其余件是 0，不能再从备注里把总价读回来。 */
function quoteForDisplay(item: InventoryCustomerExpressItem): number | null {
  if (item.quoteCny != null && Number.isFinite(Number(item.quoteCny))) {
    return Number(item.quoteCny) > 0 ? Number(item.quoteCny) : null;
  }
  const fromNote = readUnsignedQuoteCny({ inboundNote: item.inboundNote });
  return fromNote > 0 ? fromNote : null;
}

function orderMoney(item: InventoryCustomerExpressItem, fxRate: number | null) {
  return resolveCustomerOrderMoney({
    quoteCny: quoteForDisplay(item),
    mmk: item.fee,
    customerSigned: !isUnsignedExpressItem(item),
    lockedRate: item.fxMmkPerCny,
    paidCny: item.paidCny,
    liveRate: fxRate,
  });
}

function lineMoney(
  item: InventoryCustomerExpressItem,
  customerCode: string | undefined,
  settings: RouteRateSetting[],
  history: ReturnType<typeof parseCrossBorderFxHistory>,
  fxRate: number | null,
): CustomerOrderMoney {
  if (!isUnsignedExpressItem(item)) return orderMoney(item, fxRate);
  const explicit = quoteForDisplay(item);
  if (explicit != null) {
    return resolveCustomerOrderMoney({
      quoteCny: explicit,
      mmk: item.fee,
      customerSigned: false,
      liveRate: fxRate,
    });
  }
  const unit = resolveRouteUnitQuote({
    settings,
    origin: item.origin,
    destination: item.destination,
    customerCode,
    history,
    liveRate: fxRate,
  });
  if (unit.cnyPerKg != null && item.weightKg > 0 && (item.fee > 0 || unit.cnyPerKg === 0)) {
    const fee = feeFromRouteUnit(unit.cnyPerKg, item.weightKg, fxRate);
    return { cny: fee.cny, mmk: fee.mmk, frozen: false };
  }
  return orderMoney(item, fxRate);
}

function PricingCell({
  item,
  customerCode,
  settings,
  history,
  fxRate,
  isEn,
}: {
  item: InventoryCustomerExpressItem;
  customerCode?: string;
  settings: RouteRateSetting[];
  history: ReturnType<typeof parseCrossBorderFxHistory>;
  fxRate: number | null;
  isEn: boolean;
}) {
  const price = resolveExpressItemUnitPrice({
    origin: item.origin,
    destination: item.destination,
    customerCode,
    settings,
    history,
    signed: !isUnsignedExpressItem(item),
    weightKg: item.weightKg,
    feeMmk: item.fee,
    lockedRate: item.fxMmkPerCny ?? null,
    liveRate: fxRate,
  });
  if (price.mmkPerKg == null) return <>{'—'}</>;
  if (price.mmkPerKg === 0) return <span className="cbl-fee-shared">{isEn ? 'Free' : '免费'}</span>;
  const unit = '/kg';
  if (price.cnyPerKg == null) {
    return (
      <span className="cbl-money">
        {formatMmK(price.mmkPerKg)} <span className="cbl-money-ccy">MMK{unit}</span>
      </span>
    );
  }
  return (
    <span className="cbl-money cbl-money--dual">
      <span className="cbl-money-main">
        {formatCnyInput(price.cnyPerKg)} <span className="cbl-money-ccy">CNY{unit}</span>
      </span>
      <span className="cbl-money-sub">{formatMmK(price.mmkPerKg)} MMK{unit}</span>
    </span>
  );
}

function FeeCell({
  item,
  customerCode,
  settings,
  history,
  sharedLabel,
  isEn,
  fxRate,
}: {
  item: InventoryCustomerExpressItem;
  customerCode?: string;
  settings: RouteRateSetting[];
  history: ReturnType<typeof parseCrossBorderFxHistory>;
  sharedLabel?: string;
  isEn: boolean;
  fxRate: number | null;
}) {
  const money = lineMoney(item, customerCode, settings, history, fxRate);
  if ((money.cny == null || money.cny === 0) && (money.mmk == null || money.mmk === 0)) {
    if (money.cny === 0 || money.mmk === 0) {
      return <span className="cbl-fee-shared">{isEn ? 'Free' : '免费'}</span>;
    }
    if (sharedLabel) return <span className="cbl-fee-shared">{sharedLabel}</span>;
    return <>{'—'}</>;
  }
  return (
    <>
      <DualMoney mmk={money.mmk} rate={null} cny={money.cny ?? undefined} />
      {money.frozen ? (
        <span className="cbl-fx-lock-hint">
          {item.fxMmkPerCny
            ? isEn
              ? 'Signed rate'
              : '签收汇率'
            : isEn
              ? 'Signed'
              : '已签收'}
        </span>
      ) : null}
    </>
  );
}

function customerItemTrip(
  item: InventoryCustomerExpressItem,
  tripByPack: Record<string, string>,
): string {
  const fromItem = String(item.tripNumber || '').trim().toUpperCase();
  if (fromItem) return fromItem;
  const pack = String(item.packedBundleBarcode || '').trim().toUpperCase();
  return pack ? String(tripByPack[pack] || '').trim().toUpperCase() : '';
}

function customerItemsHeadline(items: InventoryCustomerExpressItem[]) {
  let pieces = 0;
  let weightKg = 0;
  const seenPacks = new Set<string>();
  const packsWithPieceWeight = new Set<string>();
  for (const item of items) {
    pieces += item.qty > 0 ? item.qty : 1;
    const pack = String(item.packedBundleBarcode || '').trim().toUpperCase();
    if (pack && item.weightKg > 0) packsWithPieceWeight.add(pack);
  }
  for (const item of items) {
    const pack = String(item.packedBundleBarcode || '').trim().toUpperCase();
    if (pack && (item.packWeightKg || 0) > 0 && !packsWithPieceWeight.has(pack)) {
      if (!seenPacks.has(pack)) {
        seenPacks.add(pack);
        weightKg += item.packWeightKg || 0;
      }
      continue;
    }
    if (item.weightKg > 0) weightKg += item.weightKg;
  }
  return {
    orders: items.length,
    pieces,
    weightKg: Math.round(weightKg * 100) / 100,
  };
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
  const [routeRates, setRouteRates] = useState<RouteRateSetting[]>([]);
  const [tripByPack, setTripByPack] = useState<Record<string, string>>({});
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const [tableScroll, setTableScroll] = useState({ left: false, right: false });

  const itemGroups = useMemo(() => groupCustomerExpressItems(items), [items]);
  const packCodesKey = useMemo(() => {
    const codes = new Set<string>();
    for (const item of items) {
      const code = String(item.packedBundleBarcode || '').trim().toUpperCase();
      if (code && !String(item.tripNumber || '').trim()) codes.add(code);
    }
    return Array.from(codes).sort().join('|');
  }, [items]);
  const unsignedIds = useMemo(
    () => items.filter((item) => isUnsignedExpressItem(item)).map((item) => item.id),
    [items],
  );
  const selectedUnsignedIds = useMemo(
    () => selectedIds.filter((id) => unsignedIds.includes(id)),
    [selectedIds, unsignedIds],
  );
  const allUnsignedChecked = unsignedIds.length > 0 && selectedUnsignedIds.length === unsignedIds.length;
  const headline = useMemo(() => customerItemsHeadline(items), [items]);
  const headerOrders = !loading && items.length > 0 ? headline.orders : customer?.orderCount ?? 0;
  const headerPieces = !loading && items.length > 0 ? headline.pieces : customer?.totalPieces ?? 0;
  const headerWeightKg =
    !loading && headline.weightKg > 0 ? headline.weightKg : customer?.totalWeightKg ?? 0;

  const fxHistory = useMemo(
    () =>
      parseCrossBorderFxHistory(
        routeRates.find((row) => row.settings_key === CROSS_BORDER_FX_HISTORY_SETTINGS_KEY)
          ?.settings_value,
      ),
    [routeRates],
  );
  const headerMoney = useMemo(
    () =>
      sumCustomerOrderMoney(
        items.map((item) => lineMoney(item, customer?.customerCode, routeRates, fxHistory, fxRate)),
      ),
    [items, customer?.customerCode, routeRates, fxHistory, fxRate],
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void systemSettingsService.getSettingsByKeyPrefix('pricing.cross_border.').then((rows) => {
      if (!cancelled) setRouteRates(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !routeRates.length) return;
    const payload = buildMissingRouteCnyPayload(routeRates, fxHistory);
    if (!payload.length) return;
    let cancelled = false;
    void systemSettingsService.upsertSettings(payload).then((result) => {
      if (cancelled || !result.ok) return;
      setRouteRates((current) => {
        const have = new Set(current.map((row) => String(row.settings_key || '')));
        const extra = payload.filter((row) => !have.has(row.settings_key));
        return extra.length ? current.concat(extra) : current;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [open, routeRates, fxHistory]);

  useEffect(() => {
    if (!packCodesKey) {
      setTripByPack({});
      return;
    }
    const codes = packCodesKey.split('|');
    let cancelled = false;
    void Promise.all(
      codes.map((code) =>
        fetchInventoryConsolePacks('all', [], { q: code, page: 1, pageSize: 10 }).catch(() => ({
          recentPacks: [],
        })),
      ),
    ).then((pages) => {
      if (cancelled) return;
      const next: Record<string, string> = {};
      for (const page of pages) {
        for (const pack of page.recentPacks || []) {
          const barcode = String(pack.pack_barcode || '').trim().toUpperCase();
          const trip = String(pack.trip_number || '').trim().toUpperCase();
          if (barcode && trip) next[barcode] = trip;
        }
      }
      setTripByPack(next);
    });
    return () => {
      cancelled = true;
    };
  }, [packCodesKey]);

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
    const bundle = packagingBatchSelectionIds(items, id);
    const ids = bundle.length ? bundle : [id];
    setSelectedIds((current) => {
      const allOn = ids.every((row) => current.includes(row));
      if (allOn) return current.filter((row) => !ids.includes(row));
      return [...current, ...ids.filter((row) => !current.includes(row))];
    });
  };

  const toggleAllUnsigned = () => {
    setSelectedIds(allUnsignedChecked ? [] : unsignedIds);
  };

  const openInvoice = () => {
    if (!selectedUnsignedIds.length) return;
    const priced = items.map((item) => {
      const unit = resolveRouteUnitQuote({
        settings: routeRates,
        origin: item.origin,
        destination: item.destination,
        customerCode: customer?.customerCode,
        history: fxHistory,
        liveRate: fxRate,
      });
      const withUnit =
        unit.cnyPerKg != null && unit.cnyPerKg > 0 ? { ...item, unitCnyPerKg: unit.cnyPerKg } : item;
      const tripNumber = customerItemTrip(item, tripByPack);
      const withTrip = tripNumber ? { ...withUnit, tripNumber } : withUnit;
      if (quoteForDisplay(item) != null || !(item.fee > 0)) return withTrip;
      const money = lineMoney(item, customer?.customerCode, routeRates, fxHistory, fxRate);
      if (money.cny == null || !(money.cny > 0)) return withTrip;
      return { ...withTrip, quoteCny: money.cny };
    });
    setInvoice(buildUnsignedCustomerInvoice(priced, selectedUnsignedIds));
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

  const watermarkTops = Array.from({ length: 8 }, (_, index) => 48 + index * 180);

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
            <div className="cbl-customer-modal__identity">
              <div className="cbl-customer-modal__avatar" aria-hidden="true">客</div>
              <div>
                <h2 className="cbl-pricing-modal__title cbl-customer-modal__title">
                  {customer.customerName}
                </h2>
                {customer.customerPhone && customer.customerPhone !== '—' ? (
                  <p className="cbl-customer-modal__phone">{customer.customerPhone}</p>
                ) : null}
              </div>
            </div>
            <div className="cbl-customer-modal__stats">
                <span className="cbl-customer-modal__stat">
                  <span className="cbl-customer-modal__stat-label">
                    {isEn ? 'Orders' : '订单'}
                  </span>
                  <strong>{headerOrders}</strong>
                </span>
                <span className="cbl-customer-modal__stat">
                  <span className="cbl-customer-modal__stat-label">
                    {isEn ? 'Pieces' : '总件数'}
                  </span>
                  <strong>{headerPieces}</strong>
                </span>
                <span className="cbl-customer-modal__stat">
                  <span className="cbl-customer-modal__stat-label">
                    {isEn ? 'Weight' : '总重量'}
                  </span>
                  <strong>
                    {headerWeightKg > 0 ? `${headerWeightKg} Kg` : '—'}
                  </strong>
                </span>
                <span className="cbl-customer-modal__stat cbl-customer-modal__stat--fee">
                  <span className="cbl-customer-modal__stat-label">
                    {isEn ? 'Total fee' : '总费用'}
                  </span>
                  <strong>
                    <DualMoney
                      mmk={items.length ? headerMoney.mmk : customer.totalFee}
                      rate={items.length ? null : fxRate}
                      cny={items.length ? headerMoney.cny ?? undefined : undefined}
                    />
                  </strong>
                </span>
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
                <div className="cbl-customer-items-scroll__bar">
                  <button
                    type="button"
                    className="cbl-customer-items-scroll__btn"
                    onClick={() => nudgeTable(-1)}
                    disabled={!tableScroll.left}
                    aria-label={isEn ? 'Scroll left' : '向左滑'}
                  >
                    <span aria-hidden="true">‹</span>
                  </button>
                  <button
                    type="button"
                    className="cbl-customer-items-scroll__btn"
                    onClick={() => nudgeTable(1)}
                    disabled={!tableScroll.right}
                    aria-label={isEn ? 'Scroll right' : '向右滑'}
                  >
                    <span aria-hidden="true">›</span>
                  </button>
                </div>
              </div>
              <div className="cbl-customer-items-scroll">
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
                      <th>{isEn ? 'Express' : '快递单'}</th>
                      <th>{isEn ? 'Inbound' : '入库单'}</th>
                      <th className="cbl-col-num">{isEn ? 'Price' : '定价'}</th>
                      <th>{isEn ? 'Origin' : '始发地'}</th>
                      <th>{isEn ? 'Destination' : '目的地'}</th>
                      <th>{isEn ? 'Weight' : '重量'}</th>
                      <th>{isEn ? 'Qty' : '数量'}</th>
                      <th className="cbl-col-num">{isEn ? 'Fee' : '费用'}</th>
                      <th>{isEn ? 'Payment' : '付款状态'}</th>
                      <th>{isEn ? 'Package' : '包裹状态'}</th>
                      <th>{isEn ? 'Trip' : '车次'}</th>
                      <th>{isEn ? 'Transport' : '运输状态'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemGroups.map((group) => {
                      const rows = group.type === 'single' ? [group.item] : group.items;
                      const sharedLabel =
                        group.type === 'packaging' &&
                        group.items.some((row) => Number(row.quoteCny) > 0 || row.fee > 0)
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
                            const trip = customerItemTrip(item, tripByPack);
                            const packed =
                              Boolean(String(item.packedBundleBarcode || '').trim()) ||
                              item.packageStatus === '已打包';
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
                                    !unsigned
                                      ? isEn
                                        ? 'Signed orders cannot be invoiced'
                                        : '已签收，不能开发票'
                                      : group.type === 'packaging'
                                        ? isEn
                                          ? 'Checking one selects the whole inbound batch'
                                          : '勾选一件，同一批多个入库会一起选上'
                                        : undefined
                                  }
                                />
                              </td>
                              <td className="cbl-dim">{formatInboundDate(isEn, item.inboundAt)}</td>
                              <td><span className="cbl-code">{item.expressBarcode}</span></td>
                              <td><span className="cbl-code">{item.inboundBarcode}</span></td>
                              <td className="cbl-col-num cbl-col-price">
                                <PricingCell
                                  item={item}
                                  customerCode={customer.customerCode}
                                  settings={routeRates}
                                  history={fxHistory}
                                  fxRate={fxRate}
                                  isEn={isEn}
                                />
                              </td>
                              <td><span className="cbl-code cbl-code--origin">{item.origin}</span></td>
                              <td><span className="cbl-dest-chip">{item.destination}</span></td>
                              <td>
                                {group.type === 'packaging'
                                  ? packagingFeeRowWeight(item, group.items)
                                  : item.weight}
                              </td>
                              <td className="cbl-col-num">{item.qty}</td>
                              <td className="cbl-col-num cbl-col-fee">
                                <FeeCell
                                  item={item}
                                  customerCode={customer.customerCode}
                                  settings={routeRates}
                                  history={fxHistory}
                                  sharedLabel={sharedLabel}
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
                                {trip ? (
                                  <span className="cbl-code">{trip}</span>
                                ) : packed ? (
                                  <span className="cbl-dim">{isEn ? 'Not loaded' : '未装车'}</span>
                                ) : (
                                  '—'
                                )}
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
              fxRate={fxRate}
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

function orderMeasure(group: UnsignedInvoiceOrderGroup, isEn: boolean): string {
  const weight = formatUnsignedInvoiceWeight(group.weightKg) || '—';
  const unitPrice =
    group.unitCnyPerKg && group.unitCnyPerKg > 0
      ? formatUnsignedInvoiceUnitPrice(group.unitCnyPerKg, 1)
      : formatUnsignedInvoiceUnitPrice(group.quoteCny, group.weightKg);
  const priceLabel = isEn ? 'Price' : '定价';
  const price = unitPrice ? `${priceLabel} ${unitPrice}` : '';
  if (group.kind === 'packaging') {
    const weightLabel = isEn ? 'Package weight' : '包裹总重';
    return price ? `${weightLabel} ${weight} · ${price}` : `${weightLabel} ${weight}`;
  }
  const weightLabel = isEn ? 'Weight' : '重量';
  return price ? `${weightLabel} ${weight} · ${price}` : `${weightLabel} ${weight}`;
}

function UnsignedInvoicePreview({
  invoice,
  customerName,
  phone,
  station,
  issuedOn,
  isEn,
  fxRate,
  watermarkTops,
  onClose,
}: {
  invoice: UnsignedCustomerInvoice;
  customerName: string;
  phone: string;
  station: string;
  issuedOn: string;
  isEn: boolean;
  fxRate: number | null;
  watermarkTops: number[];
  onClose: () => void;
}) {
  const weight = formatUnsignedInvoiceWeight(invoice.totalWeightKg) || '—';
  const quote = formatUnsignedInvoiceQuote(invoice.totalQuoteCny);
  const rate = formatUnsignedInvoiceRate(fxRate);
  const settlement = settleUnsignedInvoice(invoice.totalQuoteCny, fxRate, invoice.totalFeeMmk);
  const fee = formatUnsignedInvoiceFee(settlement.feeMmk, isEn ? 'Free rate' : '免费优惠');
  const paperRef = useRef<HTMLElement>(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const meta: Array<{ label: string; value: string }> = [
    { label: isEn ? 'Customer' : '客户姓名', value: customerName || '—' },
  ];
  if (phone && phone !== '—') meta.push({ label: isEn ? 'Phone' : '电话', value: phone });
  if (invoice.destination) {
    meta.push({ label: isEn ? 'Final destination' : '最终目的地', value: invoice.destination });
  }
  if (station) meta.push({ label: isEn ? 'Receiving station' : '收货站', value: station });
  const notLoaded = isEn ? 'Not loaded' : '未装车';
  meta.push({
    label: isEn ? 'Trip' : '车次',
    value: invoice.tripNo
      ? invoice.tripIncomplete
        ? `${invoice.tripNo} · ${notLoaded}`
        : invoice.tripNo
      : notLoaded,
  });
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
          <article ref={paperRef} className="cbl-invoice-paper">
            <div className="cbl-invoice-watermark" aria-hidden="true">
              {watermarkTops.map((top) => (
                <span key={top} style={{ top }}>
                  MARKET LINK
                </span>
              ))}
            </div>
            <div className="cbl-invoice-body">
                <div className="cbl-invoice-brand">
                  <div className="cbl-invoice-wordmark">
                    <strong>MARKET LINK</strong>
                    <span>EXPRESS</span>
                  </div>
                  <div className="cbl-invoice-doc">
                    <span className="cbl-invoice-doc__word">INVOICE</span>
                    <span className="cbl-invoice-doc__label">{isEn ? 'Invoice no.' : '发票号'}</span>
                    <strong className="cbl-invoice-doc__no">—</strong>
                  </div>
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
                  {(group.expressNos.length ? group.expressNos : ['—']).map((no, index) => (
                    <div key={`${no}-${index}`} className="cbl-invoice-order">
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      <div className="cbl-invoice-order__main">
                        <strong>{no || '—'}</strong>
                        {group.kind === 'single' ? <em>{orderMeasure(group, isEn)}</em> : null}
                      </div>
                    </div>
                  ))}
                  {group.kind === 'packaging' ? (
                    <p className="cbl-invoice-pack-measure">{orderMeasure(group, isEn)}</p>
                  ) : null}
                </section>
              ))}
              <div className="cbl-invoice-totals">
                <div>
                  <span>{isEn ? 'Total weight' : '总重量'}</span>
                  <strong>{weight}</strong>
                </div>
                {quote ? (
                  <div>
                    <span>{isEn ? 'Inbound quote' : '入库报价'}</span>
                    <strong>{quote}</strong>
                  </div>
                ) : null}
                {rate ? (
                  <div>
                    <span>{isEn ? 'Exchange rate' : '汇率'}</span>
                    <strong>{rate}</strong>
                  </div>
                ) : null}
                {settlement.missingRate ? (
                  <p className="cbl-invoice-rate-missing">
                    {isEn
                      ? 'The head-office rate is missing. Save it in Settings, then print.'
                      : '还没有总部汇率。请先在设置里保存汇率，再打印。'}
                  </p>
                ) : (
                  <div className="cbl-invoice-fee">
                    <span>{isEn ? 'Total fee' : '总费用'}</span>
                    <strong>{fee}</strong>
                  </div>
                )}
              </div>
              <div className="cbl-invoice-closeout">
                <p className="cbl-invoice-note">
                  {isEn ? 'Please pay against this invoice' : '请凭此单据付款'}
                </p>
                <div className="cbl-invoice-contact">
                  <span>{isEn ? 'Contact' : '联系方式'}</span>
                  <p>
                    <em>{isEn ? 'Phone: ' : '联系电话：'}</em>
                    <strong>09788868928，09259369349，09971118588</strong>
                  </p>
                  <p>
                    <em>Kpay：</em>
                    <strong>09259369349</strong>
                  </p>
                  <em className="cbl-invoice-site">www.market-link-express.com</em>
                </div>
                <p className="cbl-invoice-footer">MARKET LINK EXPRESS</p>
              </div>
            </div>
          </article>
        </div>
        <div className="cbl-unsigned-invoice-actions">
          {saveError ? <p className="cbl-invoice-save-error">{saveError}</p> : null}
          <button
            type="button"
            className="cbl-invoice-save"
            onClick={() => window.print()}
            disabled={settlement.missingRate || savingPhoto}
          >
            {isEn ? 'Print' : '打印'}
          </button>
          <button
            type="button"
            className="cbl-invoice-save"
            onClick={() => {
              const node = paperRef.current;
              if (!node || savingPhoto) return;
              setSavingPhoto(true);
              setSaveError(null);
              const safeName = (customerName || 'invoice')
                .replace(/[^\w\u4e00-\u9fff-]+/g, '-')
                .replace(/^-|-$/g, '')
                .slice(0, 40);
              void saveElementAsPng(node, `MARKET-LINK-${safeName || 'invoice'}-${issuedOn}.png`)
                .catch(() => {
                  setSaveError(isEn ? 'Could not save the photo. Try again.' : '照片没存下来，请再试一次。');
                })
                .finally(() => setSavingPhoto(false));
            }}
            disabled={settlement.missingRate || savingPhoto}
          >
            {savingPhoto ? (isEn ? 'Saving…' : '保存中…') : isEn ? 'Save' : '保存'}
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
