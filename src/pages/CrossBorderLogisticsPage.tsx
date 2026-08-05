import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useResponsive } from '../hooks/useResponsive';
import CrossBorderAccountManagementModal from '../components/CrossBorderAccountManagementModal';
import CrossBorderPricingModal from '../components/CrossBorderPricingModal';
import CrossBorderManualEntryModal from '../components/CrossBorderManualEntryModal';
import CrossBorderClearTestDataModal from '../components/CrossBorderClearTestDataModal';
import CreateCrossBorderCustomerModal from '../components/CreateCrossBorderCustomerModal';
import CustomerExpressItemsModal from '../components/CustomerExpressItemsModal';
import StoreFinanceDetailModal from '../components/StoreFinanceDetailModal';
import StationReconciliationModal from '../components/StationReconciliationModal';
import CblTablePagination, { paginateSlice } from '../components/CblTablePagination';
import {
  fetchInventoryConsoleFinance,
  fetchInventoryConsoleOverview,
  fetchInventoryConsolePacks,
  fetchInventoryCustomerSummaries,
  fetchCrossBorderRegisteredCustomers,
  type CreateCrossBorderAccountResult,
  type CrossBorderRegisteredCustomer,
  type UpdateCrossBorderAccountResult,
  type InventoryConsoleData,
  type InventoryCustomerSummary,
  type InventoryPackRow,
  type InventoryTransitStore,
  type InventoryTransitStoreFinance,
  type PackStatusFilter,
  type StoreFinanceDetailMode,
  type CrossBorderExpenseCategory,
} from '../services/inventoryConsoleService';
import { CROSS_BORDER_HUBS } from '../utils/crossBorderHubs';
import { formatSalespersonEmployeeCodeDisplay } from '../utils/crossBorderSalespersons';
import {
  PACK_DISPLAY_STATUS_LABELS,
  packDisplayStatusBadgeClass,
} from '../utils/packDisplayStatus';
import { buildTripFeeGroupMap, isPrimaryTripFeePack, tripTransportGroupKey } from '../utils/tripTransportFee';
import '../styles/crossBorderLogistics.css';

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

function formatIsoDate(value?: string | null, lang: string = 'zh'): string {
  if (!value) return '—';
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value;
  try {
    const loc = lang === 'en' ? 'en-US' : 'zh-CN';
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).toLocaleDateString(
      loc,
      { year: 'numeric', month: 'short', day: 'numeric' },
    );
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

function formatPackTransportFeeForRow(
  pack: InventoryPackRow,
  tripGroupMap: ReturnType<typeof buildTripFeeGroupMap>,
  isEn: boolean,
): string {
  const trip = pack.trip_number?.trim().toUpperCase() ?? '';
  const loadBatch = {
    truck_loaded_at: pack.truck_loaded_at,
    origin_store_code: pack.origin_store_code,
    leg_destination_code: pack.leg_destination_code,
    destination_code: pack.destination_code,
  };
  const groupKey = tripTransportGroupKey(trip, pack.pack_barcode, loadBatch);
  const group = tripGroupMap.get(groupKey);
  const isPrimary = isPrimaryTripFeePack(pack.pack_barcode, trip, tripGroupMap, loadBatch);
  if (!isPrimary) {
    if (trip) return isEn ? `In trip ${trip}` : `含于车次 ${trip}`;
    if (group && group.packCount > 1) {
      return isEn ? `In same load (${group.packCount} pkgs)` : `含于同车 ${group.packCount} 包`;
    }
    return '—';
  }
  const feeLabel = formatPackTransportFee(group?.fee ?? pack.transport_fee);
  if (group && group.packCount > 1) {
    if (trip) {
      return isEn
        ? `${feeLabel} · ${group.packCount} pkgs/trip`
        : `${feeLabel} · 本车次 ${group.packCount} 包`;
    }
    return isEn ? `${feeLabel} · ${group.packCount} pkgs/load` : `${feeLabel} · 本车 ${group.packCount} 包`;
  }
  return feeLabel;
}

function stationCashFlow(finance?: InventoryTransitStoreFinance) {
  const cb = finance?.crossBorderSummary;
  if (cb) {
    return {
      collected: cb.collectedTotal,
      unpaidTransport: cb.transportUnpaidTotal,
      paidTransport: cb.transportPaidTotal,
      pending: cb.pendingInflowTotal,
    };
  }
  const rc = finance?.reconciliation;
  const collected =
    rc?.inflowTotal ?? (rc?.originPrepaid ?? 0) + (rc?.destLocalCollected ?? 0);
  const unpaidTransport =
    rc?.transportUnpaidTotal ??
    rc?.outflowTotal ??
    (rc?.transportInboundUnpaid ?? 0) + (rc?.transportOutbound ?? 0);
  const paidTransport = rc?.transportPaidTotal ?? rc?.transportInboundPaid ?? 0;
  const pending = rc?.pendingInflowTotal ?? (rc?.destPendingTotal ?? 0);
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

function expenseCategoryLabel(cat: CrossBorderExpenseCategory, isEn: boolean): string {
  if (cat === 'transport_unpaid') return isEn ? 'Truck fee · unpaid' : '装车车费 · 待付';
  if (cat === 'transport_paid') return isEn ? 'Truck fee · paid' : '装车车费 · 已付';
  if (cat === 'pending_inflow') return isEn ? 'COD pending' : '到付待入账';
  if (cat === 'collected') return isEn ? 'Collected' : '已收';
  if (cat === 'manual_income') return isEn ? 'Other income' : '其它收入';
  if (cat === 'manual_expense') return isEn ? 'Other expense' : '其它支出';
  return isEn ? 'Agency remit' : '代转应结';
}

function isIncomeExpenseRow(cat: CrossBorderExpenseCategory): boolean {
  return cat === 'manual_income' || cat === 'collected';
}

function expenseStatusClass(cat: CrossBorderExpenseCategory, statusLabel: string): string {
  if (cat === 'manual_income' || cat === 'collected' || statusLabel === '收入' || statusLabel === '已收') {
    return 'cbl-badge cbl-badge--green';
  }
  if (cat === 'transport_paid' || statusLabel === '已支付') return 'cbl-badge cbl-badge--green';
  if (cat === 'pending_inflow' || statusLabel === '待入账') return 'cbl-badge cbl-badge--amber';
  if (cat === 'agency_remit') return 'cbl-badge cbl-badge--amber';
  if (cat === 'manual_expense') return 'cbl-badge cbl-badge--red';
  return 'cbl-badge cbl-badge--red';
}

function packTransportStatusLabel(pack: InventoryPackRow, isEn: boolean): string {
  if (pack.status === 'cancelled') {
    return isEn ? 'Cancelled' : '已取消';
  }
  if (pack.display_status) {
    return PACK_DISPLAY_STATUS_LABELS[pack.display_status][isEn ? 'en' : 'zh'];
  }
  if (pack.display_status_label) return pack.display_status_label;
  return pack.status || '—';
}

function packTransportStatusBadgeClass(pack: InventoryPackRow): string {
  if (pack.status === 'cancelled') return 'cbl-badge cbl-badge--gray';
  if (pack.display_status) return packDisplayStatusBadgeClass(pack.display_status);
  return 'cbl-badge cbl-badge--gray';
}

const CrossBorderLogisticsPage: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { isMobile } = useResponsive();
  const isEn = language === 'en';

  const [loading, setLoading] = useState(true);
  const [financeLoading, setFinanceLoading] = useState(true);
  const [packsLoading, setPacksLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InventoryConsoleData | null>(null);
  const [packFilter, setPackFilter] = useState<PackStatusFilter>('active');
  const [showAccountMgmtModal, setShowAccountMgmtModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [showClearTestModal, setShowClearTestModal] = useState(false);
  const [financeModalStore, setFinanceModalStore] = useState<InventoryTransitStore | null>(null);
  const [financeModalMode, setFinanceModalMode] = useState<StoreFinanceDetailMode>('ledger');
  const [reconcileModalStore, setReconcileModalStore] = useState<InventoryTransitStore | null>(
    null,
  );
  const [customerSummaries, setCustomerSummaries] = useState<InventoryCustomerSummary[]>([]);
  const [registeredCustomers, setRegisteredCustomers] = useState<CrossBorderRegisteredCustomer[]>(
    [],
  );
  const [customersLoading, setCustomersLoading] = useState(false);
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [customerModalTarget, setCustomerModalTarget] = useState<InventoryCustomerSummary | null>(
    null,
  );
  const [lastCreated, setLastCreated] = useState<CreateCrossBorderAccountResult | null>(null);
  const [storesPage, setStoresPage] = useState(1);
  const [customersPage, setCustomersPage] = useState(1);
  const [registeredCustomersPage, setRegisteredCustomersPage] = useState(1);
  const [packsPage, setPacksPage] = useState(1);
  const [financePage, setFinancePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(DEFAULT_PAGE_SIZE);

  const hubLabel = (regionId?: string) => {
    const hub = CROSS_BORDER_HUBS.find((h) => h.regionId === regionId);
    if (!hub) return regionId || '—';
    return isEn ? hub.nameEn : hub.nameZh;
  };

  const packsFilterLoadedRef = React.useRef<PackStatusFilter | null>(null);
  const financePageRef = React.useRef(financePage);
  const tablePageSizeRef = React.useRef(tablePageSize);
  const financePaginationInitRef = React.useRef(true);
  const customersSectionRef = React.useRef<HTMLElement | null>(null);
  const incomeOverviewRef = React.useRef<HTMLDivElement | null>(null);
  const customersFetchStartedRef = React.useRef(false);

  financePageRef.current = financePage;
  tablePageSizeRef.current = tablePageSize;

  const loadCustomers = useCallback(async () => {
    setCustomersLoading(true);
    try {
      const [inventoryResult, registeredResult] = await Promise.all([
        fetchInventoryCustomerSummaries(),
        fetchCrossBorderRegisteredCustomers(),
      ]);
      setCustomerSummaries(inventoryResult.summaries);
      setRegisteredCustomers(registeredResult);
    } catch {
      setCustomerSummaries([]);
      setRegisteredCustomers([]);
    } finally {
      setCustomersLoading(false);
    }
  }, []);

  const scheduleCustomersLoad = useCallback(() => {
    if (customersFetchStartedRef.current) return;
    customersFetchStartedRef.current = true;
    setCustomersLoading(true);

    const run = () => {
      void loadCustomers();
    };

    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(run, { timeout: 2500 });
    } else {
      window.setTimeout(run, 200);
    }
  }, [loadCustomers]);

  const loadFinanceEntries = useCallback(async (page: number, pageSize: number) => {
    setFinanceLoading(true);
    try {
      const result = await fetchInventoryConsoleFinance(page, pageSize);
      setData((prev) =>
        prev
          ? {
              ...prev,
              transitStores: result.transitStores,
              crossBorderFinance: result.crossBorderFinance,
            }
          : prev,
      );
    } catch {
      /* 保留当前财务数据 */
    } finally {
      setFinanceLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    financePaginationInitRef.current = true;
    const shouldReloadCustomers = customersFetchStartedRef.current;
    setLoading(true);
    setFinanceLoading(true);
    setPacksLoading(true);
    setError(null);

    const [overviewSettled, financeSettled, packsSettled] = await Promise.allSettled([
      fetchInventoryConsoleOverview(),
      fetchInventoryConsoleFinance(financePageRef.current, tablePageSizeRef.current),
      fetchInventoryConsolePacks(packFilter),
    ]);

    if (overviewSettled.status === 'fulfilled') {
      const overview = overviewSettled.value;
      const warnings = [...(overview.warnings ?? [])];
      if (financeSettled.status === 'fulfilled' && financeSettled.value.warnings?.length) {
        warnings.push(...financeSettled.value.warnings);
      }
      if (packsSettled.status === 'fulfilled' && packsSettled.value.warnings?.length) {
        warnings.push(...packsSettled.value.warnings);
      }

      setData({
        ok: true,
        at: new Date().toISOString(),
        transitStores:
          financeSettled.status === 'fulfilled'
            ? financeSettled.value.transitStores
            : overview.transitStores,
        stats: overview.stats,
        transportFeeTotal: overview.transportFeeTotal,
        recentPacks:
          packsSettled.status === 'fulfilled' ? packsSettled.value.recentPacks : [],
        packStatusFilter:
          packsSettled.status === 'fulfilled'
            ? (packsSettled.value.packStatusFilter ?? packFilter)
            : packFilter,
        crossBorderFinance:
          financeSettled.status === 'fulfilled'
            ? financeSettled.value.crossBorderFinance
            : undefined,
        warnings,
      });

      if (packsSettled.status === 'fulfilled') {
        packsFilterLoadedRef.current = packFilter;
      }
    } else {
      setData(null);
      const reason = overviewSettled.reason;
      setError(reason instanceof Error ? reason.message : '加载失败');
    }

    setLoading(false);
    setFinanceLoading(false);
    setPacksLoading(false);

    if (shouldReloadCustomers) {
      void loadCustomers();
    }
  }, [packFilter, loadCustomers]);

  const initialLoadDoneRef = React.useRef(false);

  useEffect(() => {
    void load().then(() => {
      initialLoadDoneRef.current = true;
      packsFilterLoadedRef.current = packFilter;
      scheduleCustomersLoad();
    });
  }, [load, scheduleCustomersLoad]);

  useEffect(() => {
    const targets = [customersSectionRef.current, incomeOverviewRef.current].filter(Boolean);
    if (!targets.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          scheduleCustomersLoad();
        }
      },
      { rootMargin: '320px' },
    );

    for (const el of targets) {
      observer.observe(el as Element);
    }
    return () => observer.disconnect();
  }, [scheduleCustomersLoad]);

  useEffect(() => {
    if (!initialLoadDoneRef.current) return;
    if (financePaginationInitRef.current) {
      financePaginationInitRef.current = false;
      return;
    }
    void loadFinanceEntries(financePage, tablePageSize);
  }, [financePage, tablePageSize, loadFinanceEntries]);

  useEffect(() => {
    if (!initialLoadDoneRef.current) return;
    if (packsFilterLoadedRef.current === packFilter) return;
    packsFilterLoadedRef.current = packFilter;
    setPacksPage(1);
    setPacksLoading(true);
    void fetchInventoryConsolePacks(packFilter)
      .then((result) => {
        setData((prev) =>
          prev
            ? {
                ...prev,
                recentPacks: result.recentPacks,
                packStatusFilter: packFilter,
              }
            : prev,
        );
      })
      .finally(() => setPacksLoading(false));
  }, [packFilter]);

  useEffect(() => {
    setStoresPage(1);
    setCustomersPage(1);
    setPacksPage(1);
  }, [tablePageSize]);

  useEffect(() => {
    setFinancePage(1);
  }, [tablePageSize]);

  const crossBorderFinance = data?.crossBorderFinance;
  const expenseEntries = crossBorderFinance?.entries ?? [];
  const expenseSummary = crossBorderFinance?.summary;
  const expensePagination = crossBorderFinance?.pagination;
  const expenseTotalItems = expensePagination?.totalItems ?? expenseSummary?.entryCount ?? 0;

  /** 总收入/总支出与下方「跨境财务」同源：全站汇总 */
  const totalIncomeAllStations = useMemo(() => {
    if (!expenseSummary) return null;
    return (
      (expenseSummary.collectedTotal ?? 0) +
      (expenseSummary.pendingInflowTotal ?? 0) +
      (expenseSummary.manualIncomeTotal ?? 0)
    );
  }, [expenseSummary]);

  const totalExpenseAllStations = useMemo(() => {
    if (!expenseSummary) return null;
    return (
      (expenseSummary.transportUnpaidTotal ?? 0) +
      (expenseSummary.transportPaidTotal ?? 0) +
      (expenseSummary.manualExpenseTotal ?? 0)
    );
  }, [expenseSummary]);

  const transitStores = data?.transitStores ?? [];
  const recentPacks = data?.recentPacks ?? [];
  const packTripGroupMap = useMemo(
    () =>
      buildTripFeeGroupMap(
        recentPacks.map((pack) => ({
          pack_barcode: pack.pack_barcode,
          trip_number: pack.trip_number,
          transport_fee: pack.transport_fee,
          truck_loaded_at: pack.truck_loaded_at,
          origin_store_code: pack.origin_store_code,
          leg_destination_code: pack.leg_destination_code,
          destination_code: pack.destination_code,
        })),
      ),
    [recentPacks],
  );

  const pagedTransitStores = useMemo(
    () => paginateSlice(transitStores, storesPage, tablePageSize),
    [transitStores, storesPage, tablePageSize],
  );

  const pagedCustomers = useMemo(
    () => paginateSlice(customerSummaries, customersPage, tablePageSize),
    [customerSummaries, customersPage, tablePageSize],
  );

  const pagedRegisteredCustomers = useMemo(
    () => paginateSlice(registeredCustomers, registeredCustomersPage, tablePageSize),
    [registeredCustomers, registeredCustomersPage, tablePageSize],
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

  const handleAccountUpdated = (result: UpdateCrossBorderAccountResult) => {
    if (result.login) {
      setLastCreated({
        ok: true,
        store: result.store,
        login: result.login,
      });
    }
    load();
  };

  const handleAccountDeleted = () => {
    load();
  };

  const closeFinanceDetail = () => setFinanceModalStore(null);

  const hubTitle = isEn ? 'Cross-border logistics' : '跨境物流';
  const hubKicker = 'ML Express · Admin';
  const backLabel = isEn ? 'Dashboard' : '控制台';

  return (
    <div className="cbl-page cbl-page--standalone">
      <div className="cbl-inner">
        <header className="cbl-standalone-header">
          <div className="cbl-standalone-header__main">
            <div className="cbl-standalone-header__kicker">{hubKicker}</div>
            <h1 className="cbl-standalone-header__title">{hubTitle}</h1>
            <p className="cbl-standalone-header__sub">
              {isEn
                ? 'Inventory App control center — multi-hub transit (MUSE → MDY → YGN). Transit login accounts are managed here only (not in Merchant stores).'
                : 'Inventory App 控制台 — 多区域中转物流（木姐 → 曼德勒 → 仰光）。中转站登录账号仅在此模块管理，与「商家管理」合伙店铺分离。'}
            </p>
            {data?.at && (
              <p className="cbl-standalone-header__meta">
                {isEn ? 'Updated' : '更新于'} {formatDateTime(data.at, language)}
              </p>
            )}
          </div>
          <div className="cbl-standalone-header__actions">
            <button
              type="button"
              className="cbl-btn cbl-btn--primary"
              onClick={() => setShowAccountMgmtModal(true)}
            >
              {isEn ? 'Account management' : '跨境账号管理'}
            </button>
            <button
              type="button"
              className="cbl-btn cbl-btn--ghost-light"
              onClick={() => setShowPricingModal(true)}
            >
              {isEn ? 'Pricing' : '跨境计费'}
            </button>
            <button
              type="button"
              className="cbl-btn cbl-btn--danger-outline"
              onClick={() => setShowClearTestModal(true)}
            >
              {isEn ? 'Clear test data' : '清空测试数据'}
            </button>
            <button
              type="button"
              className="cbl-btn cbl-btn--ghost-light"
              onClick={() => load()}
              disabled={loading}
            >
              {loading ? (isEn ? 'Loading…' : '加载中…') : isEn ? 'Refresh' : '刷新'}
            </button>
            <button
              type="button"
              className="cbl-btn cbl-btn--ghost-light"
              onClick={() => navigate('/admin/dashboard')}
            >
              ← {backLabel}
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

        <div className="cbl-io-overview" ref={incomeOverviewRef}>
          <section className="cbl-io-overview-card cbl-io-overview-card--in">
            <h2 className="cbl-io-overview-card__title">
              {isEn ? 'Total income' : '总收入'}
            </h2>
            <p className="cbl-io-overview-card__amount">
              {financeLoading && totalIncomeAllStations == null ? (
                <span className="cbl-dim">{isEn ? 'Loading…' : '加载中…'}</span>
              ) : (
                <>
                  {formatMmK(totalIncomeAllStations ?? 0)} <span>MMK</span>
                </>
              )}
            </p>
            <p className="cbl-io-overview-card__hint">
              {isEn
                ? 'All stations · Collected + Pending inflow + Other income (same as「Cross-border finance」).'
                : '所有站点合计 · 已收 + 待入账 + 其它收入（与下方「跨境财务」同源）。'}
            </p>
          </section>
          <section className="cbl-io-overview-card cbl-io-overview-card--out">
            <h2 className="cbl-io-overview-card__title">
              {isEn ? 'Total expense' : '总支出'}
            </h2>
            <p className="cbl-io-overview-card__amount">
              {financeLoading && totalExpenseAllStations == null ? (
                <span className="cbl-dim">{isEn ? 'Loading…' : '加载中…'}</span>
              ) : (
                <>
                  {formatMmK(totalExpenseAllStations ?? 0)} <span>MMK</span>
                </>
              )}
            </p>
            <p className="cbl-io-overview-card__hint">
              {isEn
                ? 'All stations · Unpaid truck + Paid truck + Other expense (same as「Cross-border finance」).'
                : '所有站点合计 · 待付车费 + 已付车费 + 其它支出（与下方「跨境财务」同源）。'}
            </p>
          </section>
        </div>

        <section className="cbl-card cbl-card--finance-expense">
          <div className="cbl-card__head">
            <h2 className="cbl-card__title">{isEn ? 'Cross-border finance' : '跨境财务'}</h2>
            {financeLoading ? (
              <div className="cbl-card__head-actions">
                <span className="cbl-card__status">
                  {isEn ? 'Loading finance…' : '财务加载中…'}
                </span>
              </div>
            ) : null}
          </div>
          <div className="cbl-card__body">
            <div className="cbl-finance-intro">
              <p className="cbl-card-hint cbl-finance-intro__hint">
                {isEn
                  ? 'System ledger (truck fees, agency remit) plus manual entries via「+ Other」.'
                  : '含系统自动汇总（车费、代转）与「+ 其它开销」手工登记的收入/支出。'}
              </p>
              <button
                type="button"
                className="cbl-btn cbl-btn--primary cbl-btn--sm cbl-finance-intro__btn"
                onClick={() => setShowManualEntryModal(true)}
              >
                {isEn ? '+ Other' : '+ 其它开销'}
              </button>
            </div>
            <div className="cbl-expense-summary">
              <div className="cbl-expense-summary__item">
                <span className="cbl-expense-summary__label">
                  {isEn ? 'Pending inflow' : '待入账'}
                </span>
                <strong>{formatMmK(expenseSummary?.pendingInflowTotal ?? 0)}</strong>
              </div>
              <div className="cbl-expense-summary__item">
                <span className="cbl-expense-summary__label">
                  {isEn ? 'Collected' : '已收'}
                </span>
                <strong className="cbl-expense-summary__in">
                  +{formatMmK(expenseSummary?.collectedTotal ?? 0)}
                </strong>
              </div>
              <div className="cbl-expense-summary__item">
                <span className="cbl-expense-summary__label">
                  {isEn ? 'Other income' : '其它收入'}
                </span>
                <strong className="cbl-expense-summary__in">
                  +{formatMmK(expenseSummary?.manualIncomeTotal ?? 0)}
                </strong>
              </div>
              <div className="cbl-expense-summary__item">
                <span className="cbl-expense-summary__label">
                  {isEn ? 'Truck · unpaid' : '待付车费'}
                </span>
                <strong>{formatMmK(expenseSummary?.transportUnpaidTotal ?? 0)}</strong>
              </div>
              <div className="cbl-expense-summary__item">
                <span className="cbl-expense-summary__label">
                  {isEn ? 'Truck · paid' : '已付车费'}
                </span>
                <strong>{formatMmK(expenseSummary?.transportPaidTotal ?? 0)}</strong>
              </div>
              <div className="cbl-expense-summary__item">
                <span className="cbl-expense-summary__label">
                  {isEn ? 'Other expense' : '其它支出'}
                </span>
                <strong>{formatMmK(expenseSummary?.manualExpenseTotal ?? 0)}</strong>
              </div>
              <div className="cbl-expense-summary__item cbl-expense-summary__item--muted">
                <span className="cbl-expense-summary__label">
                  {isEn ? 'Entries' : '记录条数'}
                </span>
                <strong>{expenseSummary?.entryCount ?? 0}</strong>
              </div>
            </div>
            {financeLoading && expenseTotalItems === 0 && !expenseEntries.length ? (
              <div className="cbl-empty">{isEn ? 'Loading finance…' : '正在加载财务数据…'}</div>
            ) : expenseTotalItems > 0 ? (
              <>
                <div className="cbl-table-wrap">
                  <table className="cbl-table cbl-table--expense">
                    <thead>
                      <tr>
                        <th>{isEn ? 'Time' : '时间'}</th>
                        <th>{isEn ? 'Type' : '类型'}</th>
                        <th>{isEn ? 'Detail' : '说明'}</th>
                        <th>{isEn ? 'Station' : '归属站点'}</th>
                        <th>{isEn ? 'Amount MMK' : '金额MMK'}</th>
                        <th>{isEn ? 'Status' : '状态'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenseEntries.map((row) => (
                        <tr key={row.id}>
                          <td className="cbl-dim">{formatDateTime(row.occurredAt, language)}</td>
                          <td>
                            <span className="cbl-expense-type">
                              {expenseCategoryLabel(row.category, isEn)}
                            </span>
                          </td>
                          <td>
                            <div className="cbl-expense-detail">
                              <span className="cbl-expense-detail__title">{row.title}</span>
                              <span className="cbl-expense-detail__sub">{row.subtitle}</span>
                            </div>
                          </td>
                          <td>
                            <span className="cbl-code">{row.stationCode}</span>
                            <span className="cbl-dim"> · {row.stationName}</span>
                          </td>
                          <td
                            className={
                              isIncomeExpenseRow(row.category)
                                ? 'cbl-finance-cell cbl-finance-cell--in'
                                : 'cbl-finance-cell cbl-finance-cell--out'
                            }
                          >
                            {isIncomeExpenseRow(row.category) ? '+' : '−'}
                            {formatMmK(row.amount)}
                          </td>
                          <td>
                            <span className={expenseStatusClass(row.category, row.statusLabel)}>
                              {row.statusLabel}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <CblTablePagination
                  page={financePage}
                  pageSize={tablePageSize}
                  totalItems={expenseTotalItems}
                  onPageChange={setFinancePage}
                  onPageSizeChange={setTablePageSize}
                  isEn={isEn}
                />
              </>
            ) : (
              <div className="cbl-empty">
                {isEn
                  ? 'No expense records yet. Truck fees and agency remit appear after Inventory sync.'
                  : '暂无开销记录。装车出库、到站签收并同步云端后会出现车费与代转明细。'}
              </div>
            )}
          </div>
        </section>

        <div className="cbl-stack">
          <section className="cbl-card">
            <div className="cbl-card__head">
              <h2 className="cbl-card__title">
                {isEn ? 'Station details' : '站点明细'}
              </h2>
              <div className="cbl-card__head-actions">
                {financeLoading ? (
                  <span className="cbl-card__status">
                    {isEn ? 'Loading finance…' : '财务加载中…'}
                  </span>
                ) : null}
              </div>
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
                        <th>{isEn ? 'Pending MMK' : '待入账MMK'}</th>
                        <th>{isEn ? 'Collected MMK' : '已收MMK'}</th>
                        <th>{isEn ? 'Unpaid truck MMK' : '待付车费MMK'}</th>
                        <th>{isEn ? 'Paid truck MMK' : '已付车费MMK'}</th>
                        <th>{isEn ? 'Statement' : '对账'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedTransitStores.map((store) => {
                        const finance = store.finance;
                        const cash = stationCashFlow(finance);
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
                            <td className="cbl-finance-cell">
                              <div className="cbl-io-cell">
                                <span className="cbl-io-cell__main cbl-io-cell__main--in">
                                  +{formatMmK(cash.pending)}
                                </span>
                                <span className="cbl-io-cell__sub">
                                  {isEn ? 'COD from other hubs' : '其它地区发往本站到付'}
                                </span>
                              </div>
                            </td>
                            <td className="cbl-finance-cell cbl-finance-cell--in">
                              <div className="cbl-io-cell">
                                <span className="cbl-io-cell__main cbl-io-cell__main--in">
                                  +{formatMmK(cash.collected)}
                                </span>
                                <span className="cbl-io-cell__sub">
                                  {isEn ? 'Prepaid + signed' : '预付 + 已签收'}
                                </span>
                              </div>
                            </td>
                            <td className="cbl-finance-cell cbl-finance-cell--out">
                              <div className="cbl-io-cell">
                                <span className="cbl-io-cell__main cbl-io-cell__main--out">
                                  −{formatMmK(cash.unpaidTransport)}
                                </span>
                                <span className="cbl-io-cell__sub">
                                  {isEn ? 'Inbound truck unpaid' : '本站待付装车车费'}
                                </span>
                              </div>
                            </td>
                            <td className="cbl-finance-cell">
                              <div className="cbl-io-cell">
                                <span className="cbl-io-cell__main">
                                  {formatMmK(cash.paidTransport)}
                                </span>
                                <span className="cbl-io-cell__sub">
                                  {isEn ? 'Inbound truck paid' : '本站已付装车车费'}
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
                    ? 'No accounts yet. Open「Account management」→「+ Add account」.'
                    : '暂无跨境账号。请点击顶部「跨境账号管理」→「+ 添加跨境账号」。'}
                </div>
              )}
              {data?.transitStores.length ? (
                <p className="cbl-finance-hint">
                  {isEn
                    ? 'Pending inflow = COD from other hubs inbound to this station. Collected = prepaid + signed (incl. agency). Unpaid/paid truck = inbound fees at this hub only. Same rules as Inventory App「Cross-border finance」.'
                    : '待入账 = 其它地区装车发往本站的到付待收；已收 = 预付 + 已签收（含代收）；待付/已付车费 = 本站 inbound 装车车费。与 Inventory App「跨境财务」同源。点击「对账单」查看明细。'}
                </p>
              ) : null}
            </div>
          </section>

          <section className="cbl-card" ref={customersSectionRef}>
            <div className="cbl-card__head">
              <h2 className="cbl-card__title">{isEn ? 'Customers' : '客户信息'}</h2>
              <div className="cbl-card__head-actions">
                <button
                  type="button"
                  className="cbl-btn cbl-btn--primary cbl-btn--sm"
                  onClick={() => setShowCreateCustomerModal(true)}
                >
                  {isEn ? '+ Add customer' : '+ 添加客户'}
                </button>
              </div>
            </div>
            <div className="cbl-card__body">
              <p className="cbl-card-hint">
                {isEn
                  ? 'Registered customers and Inventory App「Express details」aggregates. Click a name for parcels.'
                  : '登记客户与 Inventory App「快递明细」汇总（按客户编码合并）。App 填写客户编码后自动带出电话。'}
              </p>

              {registeredCustomers.length ? (
                <>
                  <h3 className="cbl-customer-section-title">
                    {isEn ? 'Registered customers' : '登记客户'}
                  </h3>
                  <div className="cbl-table-wrap">
                    <table className="cbl-table cbl-table--customers">
                      <thead>
                        <tr>
                          <th>{isEn ? 'Customer code' : '客户编码'}</th>
                          <th>{isEn ? 'Name' : '客户姓名'}</th>
                          <th>{isEn ? 'Phone' : '电话'}</th>
                          <th>{isEn ? 'Delivery city' : '送货城市'}</th>
                          <th>{isEn ? 'Salesperson' : '推销员'}</th>
                          <th>{isEn ? 'Applied' : '申请日期'}</th>
                          <th>{isEn ? 'Notes' : '备注'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedRegisteredCustomers.map((row) => (
                          <tr key={row.id}>
                            <td>
                              <span className="cbl-code">{row.customer_code}</span>
                            </td>
                            <td>{row.customer_name}</td>
                            <td>{row.phone || '—'}</td>
                            <td>
                              {hubLabel(row.delivery_region_id)}
                              <span className="cbl-dim"> · {row.delivery_area_code}</span>
                            </td>
                            <td>{formatSalespersonEmployeeCodeDisplay(row.salesperson_employee_code) || '—'}</td>
                            <td className="cbl-dim">{formatIsoDate(row.application_date, language)}</td>
                            <td className="cbl-dim">{row.address_notes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <CblTablePagination
                    page={registeredCustomersPage}
                    pageSize={tablePageSize}
                    totalItems={registeredCustomers.length}
                    onPageChange={setRegisteredCustomersPage}
                    onPageSizeChange={setTablePageSize}
                    isEn={isEn}
                  />
                </>
              ) : null}

              <h3 className="cbl-customer-section-title">
                {isEn ? 'Express summary' : '快递明细汇总'}
              </h3>
              {customersLoading ? (
                <div className="cbl-empty">{isEn ? 'Loading customers…' : '加载客户信息…'}</div>
              ) : customerSummaries.length ? (
                <>
                <div className="cbl-table-wrap">
                  <table className="cbl-table cbl-table--customers">
                    <thead>
                      <tr>
                        <th>{isEn ? 'Customer code' : '客户编码'}</th>
                        <th>{isEn ? 'Customer name' : '客户姓名'}</th>
                        <th>{isEn ? 'Phone' : '电话'}</th>
                        <th>{isEn ? 'Total pieces' : '总件数'}</th>
                        <th>{isEn ? 'Total weight' : '总重量'}</th>
                        <th>{isEn ? 'Total fee' : '总费用'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedCustomers.map((row) => (
                        <tr key={row.customerKey}>
                          <td>
                            {row.customerCode ? (
                              <span className="cbl-code">{row.customerCode}</span>
                            ) : (
                              <span className="cbl-dim">—</span>
                            )}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="cbl-customer-name-btn"
                              onClick={() => setCustomerModalTarget(row)}
                            >
                              <span className="cbl-customer-name-btn__name">{row.customerName}</span>
                            </button>
                          </td>
                          <td>{row.customerPhone && row.customerPhone !== '—' ? row.customerPhone : '—'}</td>
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
            <div className="cbl-card__head-actions">
              {packsLoading ? (
                <span className="cbl-card__status">
                  {isEn ? 'Loading packs…' : '运输明细加载中…'}
                </span>
              ) : null}
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
          </div>
          <div className="cbl-card__body">
            <p className="cbl-card-hint">
              {isEn
                ? 'Live data from Supabase inventory_pkg_tracking — written when Inventory App stock-out syncs to cloud.'
                : '实时读取云端 inventory_pkg_tracking；Inventory App 装车出库并成功同步后才会出现记录。'}
            </p>
            {packsLoading && !recentPacks.length ? (
              <div className="cbl-empty">{isEn ? 'Loading transport…' : '正在加载运输明细…'}</div>
            ) : recentPacks.length ? (
              <>
              <div className="cbl-table-wrap">
                <table className="cbl-table">
                  <thead>
                    <tr>
                      <th>{isEn ? 'Pack' : '包装号'}</th>
                      <th>{isEn ? 'Trip' : '车次'}</th>
                      <th>{isEn ? 'Route' : '路线'}</th>
                      <th>{isEn ? 'Leg' : '本段'}</th>
                      <th>{isEn ? 'Items' : '件数'}</th>
                      <th>{isEn ? 'Trip fee' : '车费'}</th>
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
                          {pack.trip_number ? (
                            <span className="cbl-code">{pack.trip_number}</span>
                          ) : (
                            <span className="cbl-dim">—</span>
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
                        <td>{formatPackTransportFeeForRow(pack, packTripGroupMap, isEn)}</td>
                        <td>
                          <span className={packTransportStatusBadgeClass(pack)}>
                            {packTransportStatusLabel(pack, isEn)}
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

      <CrossBorderAccountManagementModal
        open={showAccountMgmtModal}
        onClose={() => setShowAccountMgmtModal(false)}
        stores={data?.transitStores ?? []}
        isEn={isEn}
        onCreated={handleCreated}
        onUpdated={handleAccountUpdated}
        onDeleted={handleAccountDeleted}
      />

      <CrossBorderPricingModal
        open={showPricingModal}
        onClose={() => setShowPricingModal(false)}
      />

      <CrossBorderManualEntryModal
        open={showManualEntryModal}
        onClose={() => setShowManualEntryModal(false)}
        onSaved={() => void load()}
      />

      <CrossBorderClearTestDataModal
        open={showClearTestModal}
        onClose={() => setShowClearTestModal(false)}
        isEn={isEn}
        onCleared={() => {
          void load();
          window.alert(
            isEn
              ? 'Inventory test data cleared from cloud. Devices will reconcile on next sync.'
              : '云端 Inventory 测试数据已清空。各中转站 App 下次同步后将自动清理本机对应订单与包裹。',
          );
        }}
      />

      <CustomerExpressItemsModal
        open={customerModalTarget != null}
        onClose={() => setCustomerModalTarget(null)}
        customer={customerModalTarget}
      />

      <CreateCrossBorderCustomerModal
        open={showCreateCustomerModal}
        onClose={() => setShowCreateCustomerModal(false)}
        onCreated={(customer) => {
          setRegisteredCustomers((prev) => [customer, ...prev]);
          setRegisteredCustomersPage(1);
        }}
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
