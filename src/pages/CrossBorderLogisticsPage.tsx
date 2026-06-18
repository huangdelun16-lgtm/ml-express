import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useResponsive } from '../hooks/useResponsive';
import CreateCrossBorderAccountModal from '../components/CreateCrossBorderAccountModal';
import CrossBorderPricingModal from '../components/CrossBorderPricingModal';
import CustomerExpressItemsModal from '../components/CustomerExpressItemsModal';
import StoreFinanceDetailModal from '../components/StoreFinanceDetailModal';
import StationReconciliationModal from '../components/StationReconciliationModal';
import CblTablePagination, { paginateSlice } from '../components/CblTablePagination';
import {
  fetchInventoryConsoleData,
  fetchInventoryCustomerSummaries,
  type CreateCrossBorderAccountResult,
  type InventoryConsoleData,
  type InventoryCustomerSummary,
  type InventoryPackRow,
  type InventoryTransitStore,
  type PackStatusFilter,
  type StationReconciliationSummary,
  type StoreFinanceDetailMode,
} from '../services/inventoryConsoleService';
import { CROSS_BORDER_HUBS } from '../utils/crossBorderHubs';
import '../styles/crossBorderLogistics.css';

const PACK_STATUS_LABELS: Record<string, { zh: string; en: string }> = {
  in_transit: { zh: '在途', en: 'In transit' },
  hub_received: { zh: '到站已收', en: 'Hub received' },
  split_at_hub: { zh: '到站分拨', en: 'Split at hub' },
  completed: { zh: '已完成', en: 'Completed' },
  cancelled: { zh: '已取消', en: 'Cancelled' },
};

const DEFAULT_PAGE_SIZE = 10;

function formatDateTime(value?: string | null, lang: string = 'zh'): string {
  if (!value) return '—';
  try {
    const loc = lang === 'en' ? 'en-US' : 'zh-CN';
    return new Date(value).toLocaleString(loc, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

function formatMmK(n?: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return Math.round(n).toLocaleString('en-US');
}

function formatPackTransportFee(fee?: number | null): string {
  if (fee == null || !Number.isFinite(fee) || fee <= 0) return '—';
  return formatMmK(fee);
}

function stationCashFlow(rc?: StationReconciliationSummary) {
  const collected =
    rc?.inflowTotal ?? (rc?.originPrepaid ?? 0) + (rc?.destLocalCollected ?? 0);
  const unpaidTransport =
    rc?.transportUnpaidTotal ??
    rc?.outflowTotal ??
    (rc?.transportInboundUnpaid ?? 0) + (rc?.transportOutbound ?? 0);
  const paidTransport = rc?.transportPaidTotal ?? rc?.transportInboundPaid ?? 0;
  const pending =
    rc?.pendingInflowTotal ?? (rc?.destPendingTotal ?? 0);
  return { collected, unpaidTransport, paidTransport, pending };
}

function packLegRoute(pack: InventoryPackRow): string {
  const leg = pack.leg_destination_code?.trim() || pack.destination_code?.trim() || '—';
  return `${pack.origin_store_code} → ${leg}`;
}

function packFinalDestHint(pack: InventoryPackRow): string | null {
  const leg = pack.leg_destination_code?.trim().toUpperCase();
  const finalDest = pack.destination_code?.trim().toUpperCase();
  if (!finalDest || !leg || finalDest === leg) return null;
  return `最终 ${finalDest}`;
}

function statusBadgeClass(status: string): string {
  if (status === 'in_transit') return 'cbl-badge cbl-badge--blue';
  if (status === 'hub_received') return 'cbl-badge cbl-badge--amber';
  if (status === 'split_at_hub') return 'cbl-badge cbl-badge--amber';
  if (status === 'completed') return 'cbl-badge cbl-badge--green';
  return 'cbl-badge cbl-badge--gray';
}

const CrossBorderLogisticsPage: React.FC = () => {
  const { language } = useLanguage();
  const { isMobile } = useResponsive();
  const isEn = language === 'en';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InventoryConsoleData | null>(null);
  const [packFilter, setPackFilter] = useState<PackStatusFilter>('active');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [financeModalStore, setFinanceModalStore] = useState<InventoryTransitStore | null>(null);
  const [financeModalMode, setFinanceModalMode] = useState<StoreFinanceDetailMode>('ledger');
  const [reconcileModalStore, setReconcileModalStore] = useState<InventoryTransitStore | null>(
    null,
  );
  const [customerSummaries, setCustomerSummaries] = useState<InventoryCustomerSummary[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customerModalTarget, setCustomerModalTarget] = useState<InventoryCustomerSummary | null>(
    null,
  );
  const [lastCreated, setLastCreated] = useState<CreateCrossBorderAccountResult | null>(null);
  const [storesPage, setStoresPage] = useState(1);
  const [customersPage, setCustomersPage] = useState(1);
  const [packsPage, setPacksPage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(DEFAULT_PAGE_SIZE);

  const hubLabel = (regionId?: string) => {
    const hub = CROSS_BORDER_HUBS.find((h) => h.regionId === regionId);
    if (!hub) return regionId || '—';
    return isEn ? hub.nameEn : hub.nameZh;
  };

  const loadCustomers = useCallback(async () => {
    setCustomersLoading(true);
    try {
      const result = await fetchInventoryCustomerSummaries();
      setCustomerSummaries(result.summaries);
    } catch {
      setCustomerSummaries([]);
    } finally {
      setCustomersLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchInventoryConsoleData(packFilter);
      setData(result);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
    void loadCustomers();
  }, [packFilter, loadCustomers]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPacksPage(1);
  }, [packFilter]);

  useEffect(() => {
    setStoresPage(1);
    setCustomersPage(1);
    setPacksPage(1);
  }, [tablePageSize]);

  const totalCustomerIncome = useMemo(
    () => customerSummaries.reduce((sum, row) => sum + (row.totalFee || 0), 0),
    [customerSummaries],
  );

  const transitStores = data?.transitStores ?? [];
  const recentPacks = data?.recentPacks ?? [];

  const pagedTransitStores = useMemo(
    () => paginateSlice(transitStores, storesPage, tablePageSize),
    [transitStores, storesPage, tablePageSize],
  );

  const pagedCustomers = useMemo(
    () => paginateSlice(customerSummaries, customersPage, tablePageSize),
    [customerSummaries, customersPage, tablePageSize],
  );

  const pagedPacks = useMemo(
    () => paginateSlice(recentPacks, packsPage, tablePageSize),
    [recentPacks, packsPage, tablePageSize],
  );

  const statsCards = useMemo(() => {
    if (!data?.stats) return [];
    const s = data.stats;
    return [
      {
        label: isEn ? 'Cross-border accounts' : '跨境账号',
        value: data.transitStores.length,
        hint: isEn ? 'Inventory App logins' : 'Inventory 登录账号',
      },
      {
        label: isEn ? 'Inventory items' : '库存订单',
        value: s.storeItemsTotal,
        hint: isEn ? `${s.storeItemsInStock} in stock` : `${s.storeItemsInStock} 件在库`,
      },
      {
        label: isEn ? 'Packs in transit' : '在途快递包',
        value: s.packsInTransit,
        hint: isEn ? 'Cloud tracking' : '云端追踪',
      },
      {
        label: isEn ? 'At hub' : '到站待处理',
        value: s.packsHubReceived,
        hint: isEn ? `${s.ordersHubReceived} orders scanned` : `${s.ordersHubReceived} 单已扫入站`,
      },
      {
        label: isEn ? 'Completed' : '已完成包裹',
        value: s.packsCompleted,
        hint: isEn ? `${s.packsCancelled} cancelled` : `${s.packsCancelled} 已取消`,
      },
      {
        label: isEn ? 'Orders in transit' : '在途订单',
        value: s.ordersInTransit,
        hint: isEn ? 'Order-level tracking' : '订单级追踪',
      },
    ];
  }, [data, isEn]);

  const packFilters: { id: PackStatusFilter; label: string }[] = [
    { id: 'active', label: isEn ? 'Active' : '进行中' },
    { id: 'in_transit', label: isEn ? 'In transit' : '在途' },
    { id: 'hub_received', label: isEn ? 'Hub received' : '到站' },
    { id: 'completed', label: isEn ? 'Completed' : '已完成' },
    { id: 'all', label: isEn ? 'All' : '全部' },
  ];

  const copyLogin = async () => {
    if (!lastCreated) return;
    const text = isEn
      ? `Inventory App login\nStore code: ${lastCreated.login.storeCode}\nPassword: ${lastCreated.login.password}\nHub: ${lastCreated.login.hubCode}`
      : `Inventory App 登录\n店铺代码：${lastCreated.login.storeCode}\n密码：${lastCreated.login.password}\n枢纽码：${lastCreated.login.hubCode}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  };

  const openFinanceDetail = (store: InventoryTransitStore, mode: StoreFinanceDetailMode) => {
    setFinanceModalStore(store);
    setFinanceModalMode(mode);
  };

  const handleCreated = (result: CreateCrossBorderAccountResult) => {
    setLastCreated(result);
    load();
  };

  const closeFinanceDetail = () => setFinanceModalStore(null);

  return (
    <div className="cbl-page">
      <div className="cbl-inner">
        <header className="cbl-hero">
          <div>
            <h1 className="cbl-hero__title">
              {isEn ? 'Cross-border logistics' : '跨境物流'}
            </h1>
            <p className="cbl-hero__sub">
              {isEn
                ? 'Inventory App control center — multi-hub transit (MUSE → MDY → YGN). Create login accounts here; manage cloud sync and in-transit packages.'
                : 'Inventory App 控制台 — 多区域中转物流（木姐 → 曼德勒 → 仰光）。在此创建登录账号，查看云端同步与在途包裹。'}
            </p>
            {data?.at && (
              <p className="cbl-hero__meta">
                {isEn ? 'Updated' : '更新于'} {formatDateTime(data.at, language)}
              </p>
            )}
          </div>
          <div className="cbl-hero__actions">
            <button
              type="button"
              className="cbl-btn cbl-btn--primary"
              onClick={() => setShowCreateModal(true)}
            >
              {isEn ? '+ Create account' : '+ 创建跨境账号'}
            </button>
            <button
              type="button"
              className="cbl-btn cbl-btn--ghost"
              onClick={() => setShowPricingModal(true)}
            >
              {isEn ? 'Pricing' : '跨境计费'}
            </button>
            <button
              type="button"
              className="cbl-btn cbl-btn--ghost"
              onClick={() => load()}
              disabled={loading}
            >
              {loading ? (isEn ? 'Loading…' : '加载中…') : isEn ? 'Refresh' : '刷新'}
            </button>
          </div>
        </header>

        {error && (
          <div className="cbl-alert cbl-alert--error">
            {error}
            <div style={{ marginTop: 6, fontSize: '0.82rem', opacity: 0.85 }}>
              {isEn
                ? 'Deploy Netlify functions and set SUPABASE_SERVICE_ROLE_KEY on production.'
                : '生产环境需部署 Netlify Functions 并配置 SUPABASE_SERVICE_ROLE_KEY。'}
            </div>
          </div>
        )}

        {data?.warnings && data.warnings.length > 0 && (
          <div className="cbl-alert cbl-alert--warn">
            {data.warnings.map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>
        )}

        {lastCreated && (
          <div className="cbl-login-card" style={{ marginTop: 14 }}>
            <div className="cbl-login-card__title">
              {isEn ? 'Account created — share with station staff' : '账号已创建 — 请交给站点人员'}
            </div>
            <div className="cbl-login-row">
              <span>
                {isEn ? 'Store code' : '店铺代码'}：
                <strong className="cbl-code">{lastCreated.login.storeCode}</strong>
              </span>
              <span>
                {isEn ? 'Password' : '密码'}：
                <strong className="cbl-code">{lastCreated.login.password}</strong>
              </span>
              <span>
                {isEn ? 'Hub' : '枢纽码'}：
                <strong className="cbl-code">{lastCreated.login.hubCode}</strong>
              </span>
            </div>
            <button
              type="button"
              className="cbl-btn cbl-btn--light"
              style={{ marginTop: 10 }}
              onClick={copyLogin}
            >
              {isEn ? 'Copy credentials' : '复制登录信息'}
            </button>
          </div>
        )}

        <div className="cbl-stats">
          {statsCards.map((card) => (
            <div key={card.label} className="cbl-stat">
              <div className="cbl-stat__label">{card.label}</div>
              <div className="cbl-stat__value">{card.value}</div>
              <div className="cbl-stat__hint">{card.hint}</div>
            </div>
          ))}
        </div>

        <div className="cbl-io-overview">
          <section className="cbl-io-overview-card cbl-io-overview-card--in">
            <h2 className="cbl-io-overview-card__title">
              {isEn ? 'Total income' : '总收入'}
            </h2>
            <p className="cbl-io-overview-card__amount">
              {formatMmK(totalCustomerIncome)} <span>MMK</span>
            </p>
            <p className="cbl-io-overview-card__hint">
              {isEn
                ? 'Sum of「Total fee」in Customer list (Inventory express details).'
                : '汇总「客户信息」卡片中所有客户的总费用。'}
            </p>
          </section>
          <section className="cbl-io-overview-card cbl-io-overview-card--out">
            <h2 className="cbl-io-overview-card__title">
              {isEn ? 'Total expense' : '总支出'}
            </h2>
            <p className="cbl-io-overview-card__amount">
              {formatMmK(data?.transportFeeTotal ?? 0)} <span>MMK</span>
            </p>
            <p className="cbl-io-overview-card__hint">
              {isEn
                ? 'Sum of all transport fees in「Transport details」(excl. cancelled).'
                : '汇总「运输明细」中全部包装车费（不含已取消）。'}
            </p>
          </section>
        </div>

        <div className="cbl-stack">
          <section className="cbl-card">
            <div className="cbl-card__head">
              <h2 className="cbl-card__title">
                {isEn ? 'Transit stations' : '中转站'}
              </h2>
              <button
                type="button"
                className="cbl-btn cbl-btn--light"
                onClick={() => setShowCreateModal(true)}
              >
                {isEn ? 'New' : '新建'}
              </button>
            </div>
            <div className="cbl-card__body">
              {data?.transitStores.length ? (
                <>
                <div className="cbl-table-wrap">
                  <table className="cbl-table cbl-table--finance">
                    <thead>
                      <tr>
                        <th>{isEn ? 'Login code' : '登录代码'}</th>
                        <th>{isEn ? 'Name' : '名称'}</th>
                        <th>{isEn ? 'Region' : '区域'}</th>
                        <th>{isEn ? 'Status' : '状态'}</th>
                        <th>{isEn ? 'Ledger' : '流水'}</th>
                        <th>{isEn ? 'Collected MMK' : '已收MMK'}</th>
                        <th>{isEn ? 'Unpaid transport MMK' : '待支付MMK'}</th>
                        <th>{isEn ? 'Paid MMK' : '已支付MMK'}</th>
                        <th>{isEn ? 'Pending MMK' : '待入账MMK'}</th>
                        <th>{isEn ? 'Statement' : '对账'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedTransitStores.map((store) => {
                        const finance = store.finance;
                        const rc = finance?.reconciliation;
                        const cash = stationCashFlow(rc);
                        return (
                          <tr key={store.id}>
                            <td>
                              <span className="cbl-code">{store.store_code}</span>
                            </td>
                            <td>{store.store_name}</td>
                            <td>{hubLabel(store.region)}</td>
                            <td>
                              <span
                                className={
                                  store.status === 'active'
                                    ? 'cbl-badge cbl-badge--green'
                                    : 'cbl-badge cbl-badge--gray'
                                }
                              >
                                {store.status === 'active'
                                  ? isEn
                                    ? 'Active'
                                    : '启用'
                                  : store.status || '—'}
                              </span>
                            </td>
                            <td className="cbl-finance-cell">
                              <button
                                type="button"
                                className="cbl-finance-btn"
                                onClick={() => openFinanceDetail(store, 'ledger')}
                              >
                                <span className="cbl-finance-count">
                                  {finance?.ledgerEntryCount ?? 0}
                                </span>
                                <span className="cbl-finance-unit">{isEn ? 'entries' : '条'}</span>
                              </button>
                            </td>
                            <td className="cbl-finance-cell cbl-finance-cell--in">
                              <div className="cbl-io-cell">
                                <span className="cbl-io-cell__main cbl-io-cell__main--in">
                                  +{formatMmK(cash.collected)}
                                </span>
                                <span className="cbl-io-cell__sub">
                                  {isEn ? 'Prepaid + signed here' : '预付 + 本站签收'}
                                </span>
                              </div>
                            </td>
                            <td className="cbl-finance-cell cbl-finance-cell--out">
                              <div className="cbl-io-cell">
                                <span className="cbl-io-cell__main cbl-io-cell__main--out">
                                  −{formatMmK(cash.unpaidTransport)}
                                </span>
                                <span className="cbl-io-cell__sub">
                                  {isEn ? 'Unpaid truck fees' : '未付装车车费'}
                                </span>
                              </div>
                            </td>
                            <td className="cbl-finance-cell">
                              <div className="cbl-io-cell">
                                <span className="cbl-io-cell__main">
                                  {formatMmK(cash.paidTransport)}
                                </span>
                                <span className="cbl-io-cell__sub">
                                  {isEn ? 'Paid transport fees' : '已付运输车费'}
                                </span>
                              </div>
                            </td>
                            <td className="cbl-finance-cell">
                              <div className="cbl-io-cell">
                                <span className="cbl-io-cell__main">
                                  {formatMmK(cash.pending)}
                                </span>
                                <span className="cbl-io-cell__sub">
                                  {isEn ? 'Pending at this hub' : '本站待收订单款'}
                                </span>
                              </div>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="cbl-btn cbl-btn--primary cbl-btn--sm"
                                onClick={() => setReconcileModalStore(store)}
                              >
                                {isEn ? 'Statement' : '对账单'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <CblTablePagination
                  page={storesPage}
                  pageSize={tablePageSize}
                  totalItems={transitStores.length}
                  onPageChange={setStoresPage}
                  onPageSizeChange={setTablePageSize}
                  isEn={isEn}
                />
                </>
              ) : (
                <div className="cbl-empty">
                  {isEn
                    ? 'No accounts yet. Click「Create account」to add Inventory App login.'
                    : '暂无跨境账号。点击「创建跨境账号」为 Inventory App 开通登录。'}
                </div>
              )}
              {data?.transitStores.length ? (
                <p className="cbl-finance-hint">
                  {isEn
                    ? 'Collected = prepaid + signed at this hub. Unpaid transport = truck fees not yet paid to origin. Paid = transport fees already settled. Pending = order fees to collect at this hub (not in-transit from other stations). Open Statement for details.'
                    : '已收 = 预付 + 本站签收；待支付 = 尚未向发站支付的装车车费；已支付 = 已结清的车费；待入账 = 本站待收订单款（不含发站在途到付）。点击「对账单」查看明细。'}
                </p>
              ) : null}
            </div>
          </section>

          <section className="cbl-card">
            <div className="cbl-card__head">
              <h2 className="cbl-card__title">{isEn ? 'Customers' : '客户信息'}</h2>
            </div>
            <div className="cbl-card__body">
              <p className="cbl-card-hint">
                {isEn
                  ? 'Aggregated from Inventory App「Express details」cloud data. Click a name for all parcels.'
                  : '汇总 Inventory App「快递明细」云端订单。点击客户姓名查看其全部快递。'}
              </p>
              {customersLoading ? (
                <div className="cbl-empty">{isEn ? 'Loading customers…' : '加载客户信息…'}</div>
              ) : customerSummaries.length ? (
                <>
                <div className="cbl-table-wrap">
                  <table className="cbl-table cbl-table--customers">
                    <thead>
                      <tr>
                        <th>{isEn ? 'Customer' : '客户姓名'}</th>
                        <th>{isEn ? 'Phone' : '电话号码'}</th>
                        <th>{isEn ? 'Total pieces' : '总件数'}</th>
                        <th>{isEn ? 'Total weight' : '总重量'}</th>
                        <th>{isEn ? 'Total fee' : '总费用'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedCustomers.map((row) => (
                        <tr key={row.customerKey}>
                          <td>
                            <button
                              type="button"
                              className="cbl-customer-name-btn"
                              onClick={() => setCustomerModalTarget(row)}
                            >
                              {row.customerName}
                            </button>
                          </td>
                          <td>{row.customerPhone}</td>
                          <td>{row.totalPieces}</td>
                          <td>
                            {row.totalWeightKg > 0 ? `${row.totalWeightKg} Kg` : '—'}
                          </td>
                          <td>{formatMmK(row.totalFee)} MMK</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <CblTablePagination
                  page={customersPage}
                  pageSize={tablePageSize}
                  totalItems={customerSummaries.length}
                  onPageChange={setCustomersPage}
                  onPageSizeChange={setTablePageSize}
                  isEn={isEn}
                />
                </>
              ) : (
                <div className="cbl-empty">
                  {isEn
                    ? 'No customer orders in cloud yet. Sync from Inventory App express details.'
                    : '暂无客户订单。请先在 Inventory App 入库并同步云端。'}
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="cbl-card" style={{ marginTop: 16 }}>
          <div className="cbl-card__head">
            <h2 className="cbl-card__title">{isEn ? 'Transport details' : '运输明细'}</h2>
            <div className="cbl-chip-row">
              {packFilters.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`cbl-chip ${packFilter === f.id ? 'is-active' : ''}`}
                  onClick={() => setPackFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="cbl-card__body">
            <p className="cbl-card-hint">
              {isEn
                ? 'Live data from Supabase inventory_pkg_tracking — written when Inventory App stock-out syncs to cloud.'
                : '实时读取云端 inventory_pkg_tracking；Inventory App 装车出库并成功同步后才会出现记录。'}
            </p>
            {loading && !data ? (
              <div className="cbl-empty">{isEn ? 'Loading…' : '加载中…'}</div>
            ) : data?.recentPacks.length ? (
              <>
              <div className="cbl-table-wrap">
                <table className="cbl-table">
                  <thead>
                    <tr>
                      <th>{isEn ? 'Pack' : '包装号'}</th>
                      <th>{isEn ? 'Route' : '路线'}</th>
                      <th>{isEn ? 'Leg' : '本段'}</th>
                      <th>{isEn ? 'Items' : '件数'}</th>
                      <th>{isEn ? 'Fee' : '车费'}</th>
                      <th>{isEn ? 'Status' : '状态'}</th>
                      {!isMobile && <th>{isEn ? 'Loaded' : '装车'}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedPacks.map((pack: InventoryPackRow) => (
                      <tr key={pack.id}>
                        <td>
                          <div style={{ fontWeight: 650 }}>{pack.pack_barcode}</div>
                          {pack.pack_name && (
                            <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                              {pack.pack_name}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: 650 }}>{packLegRoute(pack)}</div>
                          {packFinalDestHint(pack) ? (
                            <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                              {packFinalDestHint(pack)}
                            </div>
                          ) : null}
                        </td>
                        <td>{pack.leg_destination_code || '—'}</td>
                        <td>
                          {pack.item_count}
                          {pack.total_weight ? (
                            <span style={{ color: '#94a3b8', fontSize: '0.76rem' }}>
                              {' '}
                              / {pack.total_weight}
                            </span>
                          ) : null}
                        </td>
                        <td>{formatPackTransportFee(pack.transport_fee)}</td>
                        <td>
                          <span className={statusBadgeClass(pack.status)}>
                            {PACK_STATUS_LABELS[pack.status]?.[isEn ? 'en' : 'zh'] || pack.status}
                          </span>
                        </td>
                        {!isMobile && (
                          <td>{formatDateTime(pack.truck_loaded_at, language)}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <CblTablePagination
                page={packsPage}
                pageSize={tablePageSize}
                totalItems={recentPacks.length}
                onPageChange={setPacksPage}
                onPageSizeChange={setTablePageSize}
                isEn={isEn}
              />
              </>
            ) : (
              <div className="cbl-empty">
                {isEn
                  ? 'No packages for this filter. Stock out in Inventory App and ensure cloud sync succeeded.'
                  : '当前筛选下无包裹。请在 Inventory App 装车出库并确认云端同步成功。'}
              </div>
            )}
          </div>
        </section>
      </div>

      <CreateCrossBorderAccountModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        existingStores={data?.transitStores ?? []}
        onCreated={handleCreated}
      />

      <CrossBorderPricingModal
        open={showPricingModal}
        onClose={() => setShowPricingModal(false)}
      />

      <CustomerExpressItemsModal
        open={customerModalTarget != null}
        onClose={() => setCustomerModalTarget(null)}
        customer={customerModalTarget}
      />

      <StoreFinanceDetailModal
        open={financeModalStore != null}
        onClose={closeFinanceDetail}
        store={financeModalStore}
        mode={financeModalMode}
      />

      <StationReconciliationModal
        open={reconcileModalStore != null}
        onClose={() => setReconcileModalStore(null)}
        store={reconcileModalStore}
      />
    </div>
  );
};

export default CrossBorderLogisticsPage;
