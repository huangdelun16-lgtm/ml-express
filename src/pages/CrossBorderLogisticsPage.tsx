import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
  type ReactNode,
  type RefObject,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useResponsive } from '../hooks/useResponsive';
import CblTablePagination, { paginateSlice } from '../components/CblTablePagination';
import {
  fetchInventoryConsoleFinance,
  fetchInventoryConsoleOverview,
  fetchInventoryConsoleOrders,
  fetchInventoryConsolePacks,
  fetchInventoryCustomerSummaries,
  fetchCrossBorderRegisteredCustomers,
  type CreateCrossBorderAccountResult,
  type CrossBorderRegisteredCustomer,
  type UpdateCrossBorderAccountResult,
  type InventoryConsoleData,
  type InventoryExceptionConsoleRow,
  type InventoryCustomerSummary,
  type InventoryOrderRow,
  type InventoryPackRow,
  type InventoryTransitStore,
  type InventoryTransitStoreFinance,
  type OrderStatusFilter,
  type PackStatusFilter,
  type StoreFinanceDetailMode,
  type CrossBorderExpenseCategory,
  type FinancePeriodParams,
} from '../services/inventoryConsoleService';
import {
  orderTrackingStatusBadgeClass,
  orderTrackingStatusLabel,
} from '../utils/inventoryOrderTracking';
import { CROSS_BORDER_HUBS } from '../utils/crossBorderHubs';
import {
  CROSS_BORDER_FX_SETTINGS_KEY,
  buildCrossBorderFxSetting,
  formatCnyAmount,
  isCustomerLedgerCategory,
  mmkToCny,
  parseMmkPerCnyRate,
  pickMmkPerCnyRate,
} from '../utils/crossBorderFx';
import { collectPricingCustomerOptions } from '../utils/crossBorderRoutePricing';
import { systemSettingsService } from '../services/supabase';
import { formatSalespersonEmployeeCodeDisplay } from '../utils/crossBorderSalespersons';
import { formatCustomerNotifyDisplay } from '../utils/customerNotifyMethod';
import {
  PACK_DISPLAY_STATUS_LABELS,
  matchesPackTransportFilter,
  packDisplayStatusBadgeClass,
} from '../utils/packDisplayStatus';
import { buildTripFeeGroupMap, isPrimaryTripFeePack, tripTransportGroupKey } from '../utils/tripTransportFee';
import '../styles/crossBorderLogistics.css';
import { feedbackService } from '../services/FeedbackService';
import CrossBorderFinancePeriodBar from '../components/CrossBorderFinancePeriodBar';
import StationSettlementQueue from '../components/StationSettlementQueue';
import { buildHqFinanceExportCsv, downloadCsv } from '../utils/crossBorderFinanceExport';
import {
  type FinancePeriodKind,
  yangonTodayYmd,
} from '../utils/yangonFinancePeriod';

const CrossBorderAccountManagementModal = lazy(
  () => import('../components/CrossBorderAccountManagementModal'),
);
const CrossBorderPricingModal = lazy(() => import('../components/CrossBorderPricingModal'));
const CrossBorderManualEntryModal = lazy(() => import('../components/CrossBorderManualEntryModal'));
const CrossBorderClearTestDataModal = lazy(
  () => import('../components/CrossBorderClearTestDataModal'),
);
const CreateCrossBorderCustomerModal = lazy(
  () => import('../components/CreateCrossBorderCustomerModal'),
);
const CustomerExpressItemsModal = lazy(() => import('../components/CustomerExpressItemsModal'));
const StoreFinanceDetailModal = lazy(() => import('../components/StoreFinanceDetailModal'));
const StationReconciliationModal = lazy(() => import('../components/StationReconciliationModal'));
const InventoryExceptionPhotosModal = lazy(() => import('../components/InventoryExceptionPhotosModal'));

function CblLazyModal({ open, children }: { open: boolean; children: ReactNode }) {
  if (!open) return null;
  return <Suspense fallback={null}>{children}</Suspense>;
}

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

function DualMoney({
  mmk,
  rate,
  cny,
  prefix = '',
}: {
  mmk?: number | null;
  rate: number | null;
  cny?: number | null;
  prefix?: string;
}) {
  const value = mmk ?? 0;
  const converted = cny !== undefined ? cny : mmkToCny(value, rate);
  if (converted == null) {
    return (
      <span className="cbl-money">
        {prefix}
        {formatMmK(value)} <span className="cbl-money-ccy">MMK</span>
      </span>
    );
  }
  return (
    <span className="cbl-money cbl-money--dual">
      <span className="cbl-money-main">
        {prefix}
        {formatCnyAmount(converted)} <span className="cbl-money-ccy">CNY</span>
      </span>
      <span className="cbl-money-sub">{formatMmK(value)} MMK</span>
    </span>
  );
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

function blendCustomerLedgerCny(
  collectedMmk: number,
  collectedCny: number | null | undefined,
  pendingMmk: number,
  manualMmk: number,
  liveRate: number | null,
): number | null {
  const pendingCny = mmkToCny(pendingMmk, liveRate);
  const manualCny = mmkToCny(manualMmk, liveRate);
  const collectedReady = collectedMmk <= 0 || collectedCny != null;
  const floatingReady = pendingMmk + manualMmk <= 0 || liveRate != null;
  if (!collectedReady || !floatingReady) return null;
  return (collectedMmk > 0 ? collectedCny ?? 0 : 0) + (pendingCny ?? 0) + (manualCny ?? 0);
}

function stationCashFlow(finance?: InventoryTransitStoreFinance) {
  const cb = finance?.crossBorderSummary;
  if (cb) {
    return {
      collected: cb.collectedTotal,
      collectedCny: cb.collectedCny,
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
  return { collected, collectedCny: undefined as number | null | undefined, unpaidTransport, paidTransport, pending };
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

function exceptionTypeLabel(type: string, isEn: boolean): string {
  const map: Record<string, [string, string]> = {
    damage: ['破损', 'Damage'],
    shortage: ['短少', 'Shortage'],
    excess: ['多件', 'Excess'],
    lost: ['丢失', 'Lost'],
    wrong_item: ['错件', 'Wrong item'],
    return_origin: ['退回发站', 'Return to origin'],
  };
  const pair = map[type];
  return pair ? pair[isEn ? 1 : 0] : type;
}

function packTransportStatusBadgeClass(pack: InventoryPackRow): string {
  if (pack.status === 'cancelled') return 'cbl-badge cbl-badge--gray';
  if (pack.display_status) return packDisplayStatusBadgeClass(pack.display_status);
  return 'cbl-badge cbl-badge--gray';
}

type TransportView = 'packs' | 'orders';

type StatCardAction =
  | { kind: 'accounts' }
  | { kind: 'customers' }
  | { kind: 'exceptions' }
  | { kind: 'packs'; filter: PackStatusFilter }
  | { kind: 'orders'; filter: OrderStatusFilter };

type StatCard = {
  id: string;
  label: string;
  value: number;
  hint: string;
  action: StatCardAction;
};

function orderCustomerLabel(order: InventoryOrderRow): string {
  return order.recipient_name || order.order_name || '—';
}

function scrollToSection(ref: RefObject<HTMLElement | null>) {
  ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function registeredCustomerToSummary(
  row: CrossBorderRegisteredCustomer,
  summaries: InventoryCustomerSummary[],
): InventoryCustomerSummary {
  const code = String(row.customer_code || '').trim().toUpperCase();
  const match = summaries.find(
    (item) => String(item.customerCode || '').trim().toUpperCase() === code,
  );
  return {
    customerKey: match?.customerKey ?? row.customer_code,
    customerCode: row.customer_code,
    customerName: row.customer_name,
    customerPhone: row.phone || match?.customerPhone || '',
    totalPieces: match?.totalPieces ?? 0,
    totalWeightKg: match?.totalWeightKg ?? 0,
    totalFee: match?.totalFee ?? 0,
    orderCount: match?.orderCount ?? 0,
  };
}

const CrossBorderLogisticsPage: FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { isMobile } = useResponsive();
  const isEn = language === 'en';

  const [loading, setLoading] = useState(true);
  const [financeLoading, setFinanceLoading] = useState(true);
  const [packsLoading, setPacksLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InventoryConsoleData | null>(null);
  const [packFilter, setPackFilter] = useState<PackStatusFilter>('active');
  const [orderFilter, setOrderFilter] = useState<OrderStatusFilter>('active');
  const [transportView, setTransportView] = useState<TransportView>('packs');
  const [showAccountMgmtModal, setShowAccountMgmtModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [showClearTestModal, setShowClearTestModal] = useState(false);
  const [financeModalStore, setFinanceModalStore] = useState<InventoryTransitStore | null>(null);
  const [financeModalMode, setFinanceModalMode] = useState<StoreFinanceDetailMode>('ledger');
  const [reconcileModalStore, setReconcileModalStore] = useState<InventoryTransitStore | null>(
    null,
  );
  const [viewingException, setViewingException] = useState<InventoryExceptionConsoleRow | null>(
    null,
  );
  const [customerSummaries, setCustomerSummaries] = useState<InventoryCustomerSummary[]>([]);
  const [registeredCustomers, setRegisteredCustomers] = useState<CrossBorderRegisteredCustomer[]>(
    [],
  );
  const [customersLoading, setCustomersLoading] = useState(false);
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CrossBorderRegisteredCustomer | null>(
    null,
  );
  const [customerModalTarget, setCustomerModalTarget] = useState<InventoryCustomerSummary | null>(
    null,
  );
  const [lastCreated, setLastCreated] = useState<CreateCrossBorderAccountResult | null>(null);
  const [storesPage, setStoresPage] = useState(1);
  const [customersPage, setCustomersPage] = useState(1);
  const [registeredCustomersPage, setRegisteredCustomersPage] = useState(1);
  const [packsPage, setPacksPage] = useState(1);
  const [ordersPage, setOrdersPage] = useState(1);
  const [financePage, setFinancePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(DEFAULT_PAGE_SIZE);
  const [periodKind, setPeriodKind] = useState<FinancePeriodKind>('month');
  const [periodDate, setPeriodDate] = useState(() => yangonTodayYmd());
  const [financeStoreCode, setFinanceStoreCode] = useState('');
  const [exportingCsv, setExportingCsv] = useState(false);
  const [fxRate, setFxRate] = useState<number | null>(null);
  const [fxDraft, setFxDraft] = useState('');
  const [fxSaving, setFxSaving] = useState(false);

  const hubLabel = (regionId?: string) => {
    const hub = CROSS_BORDER_HUBS.find((h) => h.regionId === regionId);
    if (!hub) return regionId || '—';
    return isEn ? hub.nameEn : hub.nameZh;
  };

  const packsFilterLoadedRef = useRef<PackStatusFilter>('active');
  const ordersFilterLoadedRef = useRef<OrderStatusFilter>('active');
  const packFilterRef = useRef(packFilter);
  const orderFilterRef = useRef(orderFilter);
  const financePageRef = useRef(financePage);
  const tablePageSizeRef = useRef(tablePageSize);
  const periodKindRef = useRef(periodKind);
  const periodDateRef = useRef(periodDate);
  const financeStoreCodeRef = useRef(financeStoreCode);
  const customersSectionRef = useRef<HTMLElement | null>(null);
  const exceptionsSectionRef = useRef<HTMLElement | null>(null);
  const transportSectionRef = useRef<HTMLElement | null>(null);
  const customersFetchStartedRef = useRef(false);
  const loadSeqRef = useRef(0);
  const financeReqIdRef = useRef(0);
  const packsReqIdRef = useRef(0);
  const ordersReqIdRef = useRef(0);

  packFilterRef.current = packFilter;
  orderFilterRef.current = orderFilter;
  financePageRef.current = financePage;
  tablePageSizeRef.current = tablePageSize;
  periodKindRef.current = periodKind;
  periodDateRef.current = periodDate;
  financeStoreCodeRef.current = financeStoreCode;

  const financePeriodParams = useMemo((): FinancePeriodParams => {
    return {
      period: periodKind,
      date: periodDate,
      storeCode: financeStoreCode || undefined,
    };
  }, [periodKind, periodDate, financeStoreCode]);

  const statementPeriod = useMemo((): FinancePeriodParams => {
    return { period: periodKind, date: periodDate };
  }, [periodKind, periodDate]);

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

  const applyFxRate = useCallback((rate: number | null) => {
    setFxRate(rate);
    setFxDraft(rate == null ? '' : String(rate));
  }, []);

  const loadFxRate = useCallback(async () => {
    try {
      const rows = await systemSettingsService.getSettingsByKeys([CROSS_BORDER_FX_SETTINGS_KEY]);
      applyFxRate(pickMmkPerCnyRate(rows));
    } catch {
      applyFxRate(null);
    }
  }, [applyFxRate]);

  const saveFxRate = useCallback(async () => {
    const parsed = parseMmkPerCnyRate(fxDraft);
    if (parsed == null) {
      feedbackService.notify(isEn ? 'Enter a rate greater than 0.' : '请填写大于 0 的汇率。');
      return;
    }
    setFxSaving(true);
    try {
      const result = await systemSettingsService.upsertSettings([buildCrossBorderFxSetting(parsed)]);
      if (!result.ok) {
        feedbackService.notify(
          isEn
            ? `Failed to save rate.${result.error ? ` ${result.error}` : ''}`
            : `汇率保存失败${result.error ? `：${result.error}` : ''}`,
        );
        return;
      }
      applyFxRate(parsed);
      feedbackService.success(isEn ? 'Exchange rate saved' : '汇率已保存');
    } catch (err) {
      feedbackService.notify(err instanceof Error ? err.message : isEn ? 'Save failed' : '保存失败');
    } finally {
      setFxSaving(false);
    }
  }, [applyFxRate, fxDraft, isEn]);

  useEffect(() => {
    void loadFxRate();
  }, [loadFxRate]);

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
    const reqId = ++financeReqIdRef.current;
    setFinanceLoading(true);
    try {
      const result = await fetchInventoryConsoleFinance(page, pageSize, {
        period: periodKindRef.current,
        date: periodDateRef.current,
        storeCode: financeStoreCodeRef.current || undefined,
      });
      if (reqId !== financeReqIdRef.current) return;
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
      if (reqId === financeReqIdRef.current) {
        setFinanceLoading(false);
      }
    }
  }, []);

  const load = useCallback(async () => {
    const loadId = ++loadSeqRef.current;
    const financeReqId = ++financeReqIdRef.current;
    const packsReqId = ++packsReqIdRef.current;
    const ordersReqId = ++ordersReqIdRef.current;
    const filter = packFilterRef.current;
    const nextOrderFilter = orderFilterRef.current;
    const shouldReloadCustomers = customersFetchStartedRef.current;
    setLoading(true);
    setFinanceLoading(true);
    setPacksLoading(true);
    setOrdersLoading(true);
    setError(null);

    const [overviewSettled, financeSettled, packsSettled, ordersSettled] = await Promise.allSettled([
      fetchInventoryConsoleOverview(),
      fetchInventoryConsoleFinance(financePageRef.current, tablePageSizeRef.current, {
        period: periodKindRef.current,
        date: periodDateRef.current,
        storeCode: financeStoreCodeRef.current || undefined,
      }),
      fetchInventoryConsolePacks(filter),
      fetchInventoryConsoleOrders(nextOrderFilter),
    ]);

    if (loadId !== loadSeqRef.current) return;

    const financeResult = financeSettled.status === 'fulfilled' ? financeSettled.value : null;
    const packsResult = packsSettled.status === 'fulfilled' ? packsSettled.value : null;
    const ordersResult = ordersSettled.status === 'fulfilled' ? ordersSettled.value : null;
    const financeFresh = financeReqId === financeReqIdRef.current && financeResult != null;
    const packsFresh = packsReqId === packsReqIdRef.current && packsResult != null;
    const ordersFresh = ordersReqId === ordersReqIdRef.current && ordersResult != null;

    if (overviewSettled.status === 'fulfilled') {
      const overview = overviewSettled.value;
      const warnings = [...(overview.warnings ?? [])];
      if (financeResult?.warnings?.length) {
        warnings.push(...financeResult.warnings);
      }
      if (packsResult?.warnings?.length) {
        warnings.push(...packsResult.warnings);
      }
      if (ordersResult?.warnings?.length) {
        warnings.push(...ordersResult.warnings);
      }

      setData((prev) => ({
        ok: true,
        at: new Date().toISOString(),
        transitStores: financeResult && financeFresh
          ? financeResult.transitStores
          : (prev?.transitStores ?? overview.transitStores),
        stats: overview.stats,
        transportFeeTotal: overview.transportFeeTotal,
        openExceptionCount: overview.openExceptionCount ?? 0,
        openExceptions: overview.openExceptions ?? [],
        recentPacks: packsResult && packsFresh ? packsResult.recentPacks : (prev?.recentPacks ?? []),
        recentOrders: ordersResult && ordersFresh
          ? ordersResult.recentOrders
          : (prev?.recentOrders ?? []),
        packStatusFilter: packsResult && packsFresh
          ? (packsResult.packStatusFilter ?? filter)
          : (prev?.packStatusFilter ?? filter),
        orderStatusFilter: ordersResult && ordersFresh
          ? (ordersResult.orderStatusFilter ?? nextOrderFilter)
          : (prev?.orderStatusFilter ?? nextOrderFilter),
        crossBorderFinance: financeResult && financeFresh
          ? financeResult.crossBorderFinance
          : prev?.crossBorderFinance,
        warnings,
      }));

      if (packsFresh) {
        packsFilterLoadedRef.current = filter;
      }
      if (ordersFresh) {
        ordersFilterLoadedRef.current = nextOrderFilter;
      }
    } else {
      const reason = overviewSettled.reason;
      setError(reason instanceof Error ? reason.message : '加载失败');
    }

    setLoading(false);
    if (financeReqId === financeReqIdRef.current) {
      setFinanceLoading(false);
    }
    if (packsReqId === packsReqIdRef.current) {
      setPacksLoading(false);
    }
    if (ordersReqId === ordersReqIdRef.current) {
      setOrdersLoading(false);
    }

    if (shouldReloadCustomers) {
      void loadCustomers();
    }
  }, [loadCustomers]);

  const initialLoadDoneRef = useRef(false);

  useEffect(() => {
    void load().then(() => {
      initialLoadDoneRef.current = true;
    });
  }, [load]);

  useEffect(() => {
    const target = customersSectionRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          scheduleCustomersLoad();
        }
      },
      { rootMargin: '320px' },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [scheduleCustomersLoad]);

  useEffect(() => {
    if (!initialLoadDoneRef.current) return;
    void loadFinanceEntries(financePage, tablePageSize);
  }, [financePage, tablePageSize, loadFinanceEntries, periodKind, periodDate, financeStoreCode]);

  useEffect(() => {
    if (packsFilterLoadedRef.current === packFilter) return;
    const reqId = ++packsReqIdRef.current;
    setPacksPage(1);
    setPacksLoading(true);
    void fetchInventoryConsolePacks(packFilter)
      .then((result) => {
        if (reqId !== packsReqIdRef.current) return;
        packsFilterLoadedRef.current = packFilter;
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
      .catch(() => {
        /* 保留当前运输明细 */
      })
      .finally(() => {
        if (reqId === packsReqIdRef.current) {
          setPacksLoading(false);
        }
      });
  }, [packFilter]);

  useEffect(() => {
    if (ordersFilterLoadedRef.current === orderFilter) return;
    const reqId = ++ordersReqIdRef.current;
    setOrdersPage(1);
    setOrdersLoading(true);
    void fetchInventoryConsoleOrders(orderFilter)
      .then((result) => {
        if (reqId !== ordersReqIdRef.current) return;
        ordersFilterLoadedRef.current = orderFilter;
        setData((prev) =>
          prev
            ? {
                ...prev,
                recentOrders: result.recentOrders,
                orderStatusFilter: orderFilter,
              }
            : prev,
        );
      })
      .catch(() => {
        /* 保留当前订单明细 */
      })
      .finally(() => {
        if (reqId === ordersReqIdRef.current) {
          setOrdersLoading(false);
        }
      });
  }, [orderFilter]);

  useEffect(() => {
    setStoresPage(1);
    setCustomersPage(1);
    setPacksPage(1);
    setOrdersPage(1);
    setFinancePage(1);
  }, [tablePageSize]);

  const crossBorderFinance = data?.crossBorderFinance;
  const expenseEntries = crossBorderFinance?.entries ?? [];
  const expenseSummary = crossBorderFinance?.summary;
  const expensePagination = crossBorderFinance?.pagination;
  const expenseTotalItems = expensePagination?.totalItems ?? expenseSummary?.entryCount ?? 0;

  const handleExportFinanceCsv = useCallback(async () => {
    setExportingCsv(true);
    try {
      const result = await fetchInventoryConsoleFinance(1, 100, {
        period: periodKind,
        date: periodDate,
        storeCode: financeStoreCode || undefined,
        financeExport: true,
      });
      const csv = buildHqFinanceExportCsv({
        entries: result.crossBorderFinance?.entries ?? [],
        summary: result.crossBorderFinance?.summary,
        periodLabel: `${periodKind} ${periodDate}`,
        stationLabel: financeStoreCode || (isEn ? 'All stations' : '全部站点'),
        isEn,
      });
      downloadCsv(
        `ML-finance-${periodKind}-${periodDate.slice(0, 10)}.csv`,
        csv,
      );
    } catch (e) {
      feedbackService.notify(e instanceof Error ? e.message : isEn ? 'Export failed' : '导出失败');
    } finally {
      setExportingCsv(false);
    }
  }, [periodKind, periodDate, financeStoreCode, isEn]);

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
  const recentPacks = useMemo(
    () =>
      (data?.recentPacks ?? []).filter((pack) =>
        matchesPackTransportFilter(pack, packFilter),
      ),
    [data?.recentPacks, packFilter],
  );
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

  const pricingCustomers = useMemo(
    () => collectPricingCustomerOptions(registeredCustomers, customerSummaries),
    [registeredCustomers, customerSummaries],
  );

  const pagedPacks = useMemo(
    () => paginateSlice(recentPacks, packsPage, tablePageSize),
    [recentPacks, packsPage, tablePageSize],
  );

  const recentOrders = useMemo(() => data?.recentOrders ?? [], [data?.recentOrders]);
  const pagedOrders = useMemo(
    () => paginateSlice(recentOrders, ordersPage, tablePageSize),
    [recentOrders, ordersPage, tablePageSize],
  );

  const statsCards = useMemo((): StatCard[] => {
    if (!data?.stats) return [];
    const s = data.stats;
    return [
      {
        id: 'accounts',
        label: isEn ? 'Cross-border accounts' : '跨境账号',
        value: data.transitStores.length,
        hint: isEn ? 'Inventory App logins' : 'Inventory 登录账号',
        action: { kind: 'accounts' },
      },
      {
        id: 'items',
        label: isEn ? 'Inventory items' : '库存订单',
        value: s.storeItemsTotal,
        hint: isEn ? `${s.storeItemsInStock} items in stock` : `${s.storeItemsInStock} 件在库`,
        action: { kind: 'customers' },
      },
      {
        id: 'packs-in-transit',
        label: isEn ? 'Packs in transit' : '在途快递包',
        value: s.packsInTransit,
        hint: isEn ? 'Packages still on the road' : '尚未到站的快递包',
        action: { kind: 'packs', filter: 'in_transit' },
      },
      {
        id: 'packs-at-hub',
        label: isEn ? 'Packs at hub' : '到站快递包',
        value: s.packsHubReceived,
        hint: isEn ? 'Packages scanned into a hub' : '已扫入站的快递包',
        action: { kind: 'packs', filter: 'hub_received' },
      },
      {
        id: 'packs-completed',
        label: isEn ? 'Completed packs' : '已完成包裹',
        value: s.packsCompleted,
        hint: isEn ? 'Signed off at destination' : '已签收完成的快递包',
        action: { kind: 'packs', filter: 'completed' },
      },
      {
        id: 'orders-in-transit',
        label: isEn ? 'Orders in transit' : '在途订单',
        value: s.ordersInTransit,
        hint: isEn ? 'Orders not yet scanned in' : '尚未扫入站的订单',
        action: { kind: 'orders', filter: 'in_transit' },
      },
      {
        id: 'orders-at-hub',
        label: isEn ? 'Orders at hub' : '到站订单',
        value: s.ordersHubReceived,
        hint: isEn ? 'Orders scanned into a hub' : '已扫入站的订单',
        action: { kind: 'orders', filter: 'hub_received' },
      },
      {
        id: 'exceptions',
        label: isEn ? 'Open exceptions' : '未关单异常',
        value: data.openExceptionCount ?? 0,
        hint: isEn ? 'Inventory App reports' : '库存 App 现场登记',
        action: { kind: 'exceptions' },
      },
    ];
  }, [data, isEn]);

  const isStatCardActive = (action: StatCardAction) => {
    if (action.kind === 'packs') return transportView === 'packs' && packFilter === action.filter;
    if (action.kind === 'orders') return transportView === 'orders' && orderFilter === action.filter;
    return false;
  };

  const handleStatClick = (action: StatCardAction) => {
    if (action.kind === 'accounts') {
      setShowAccountMgmtModal(true);
      return;
    }
    if (action.kind === 'customers') {
      scheduleCustomersLoad();
      scrollToSection(customersSectionRef);
      return;
    }
    if (action.kind === 'exceptions') {
      scrollToSection(exceptionsSectionRef);
      return;
    }
    if (action.kind === 'packs') {
      setTransportView('packs');
      setPackFilter(action.filter);
      scrollToSection(transportSectionRef);
      return;
    }
    setTransportView('orders');
    setOrderFilter(action.filter);
    scrollToSection(transportSectionRef);
  };

  const packFilters: { id: PackStatusFilter; label: string }[] = [
    { id: 'active', label: isEn ? 'Active' : '进行中' },
    { id: 'in_transit', label: isEn ? 'In transit' : '在途' },
    { id: 'hub_received', label: isEn ? 'Hub received' : '到站' },
    { id: 'completed', label: isEn ? 'Completed' : '已完成' },
    { id: 'all', label: isEn ? 'All' : '全部' },
  ];

  const orderFilters: { id: OrderStatusFilter; label: string }[] = [
    { id: 'active', label: isEn ? 'Active' : '进行中' },
    { id: 'in_transit', label: isEn ? 'In transit' : '在途' },
    { id: 'hub_received', label: isEn ? 'Arrived' : '到站' },
    { id: 'released_at_hub', label: isEn ? 'Released' : '已释放' },
    { id: 'all', label: isEn ? 'All' : '全部' },
  ];

  const transportLoading = transportView === 'packs' ? packsLoading : ordersLoading;

  const copyLogin = async () => {
    if (!lastCreated) return;
    const text = isEn
      ? `Inventory App login\nStore code: ${lastCreated.login.storeCode}\nPassword: ${lastCreated.login.password}\nHub: ${lastCreated.login.hubCode}`
      : `Inventory App 登录\n店铺代码：${lastCreated.login.storeCode}\n密码：${lastCreated.login.password}\n枢纽码：${lastCreated.login.hubCode}`;
    try {
      await navigator.clipboard.writeText(text);
      feedbackService.success(isEn ? 'Login credentials copied' : '登录信息已复制');
    } catch {
      feedbackService.error(isEn ? 'Copy failed' : '复制失败');
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
            <div className="cbl-fx-bar">
              <label className="cbl-fx-bar__label" htmlFor="cbl-fx-rate">
                {isEn ? '1 CNY =' : '1 人民币 ='}
              </label>
              <input
                id="cbl-fx-rate"
                className="cbl-fx-bar__input"
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={fxDraft}
                onChange={(e) => setFxDraft(e.target.value)}
                placeholder={isEn ? 'MMK' : '缅币'}
                disabled={fxSaving}
              />
              <span className="cbl-fx-bar__unit">{isEn ? 'MMK' : '缅币'}</span>
              <button
                type="button"
                className="cbl-btn cbl-btn--light cbl-fx-bar__save"
                onClick={() => void saveFxRate()}
                disabled={fxSaving}
              >
                {fxSaving ? (isEn ? 'Saving…' : '保存中…') : isEn ? 'Save rate' : '保存汇率'}
              </button>
              {!fxRate ? (
                <span className="cbl-fx-bar__hint">
                  {isEn
                    ? 'No rate yet — amounts stay in MMK.'
                    : '尚未设置汇率，金额只显示缅币。'}
                </span>
              ) : null}
            </div>
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
              {isEn ? 'Clear all business data' : '清空全部跨境业务数据'}
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
          {statsCards.length
            ? statsCards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  className={`cbl-stat cbl-stat--btn${isStatCardActive(card.action) ? ' is-active' : ''}`}
                  onClick={() => handleStatClick(card.action)}
                >
                  <div className="cbl-stat__label">{card.label}</div>
                  <div className="cbl-stat__value">{card.value}</div>
                  <div className="cbl-stat__hint">{card.hint}</div>
                </button>
              ))
            : Array.from({ length: 8 }, (_, i) => (
                <div key={`cbl-stat-skel-${i}`} className="cbl-stat is-skeleton" aria-hidden>
                  <div className="cbl-stat__label">{'\u00a0'}</div>
                  <div className="cbl-stat__value">{'\u00a0'}</div>
                  <div className="cbl-stat__hint">{'\u00a0'}</div>
                </div>
              ))}
        </div>

        <div className="cbl-io-overview">
          <section className="cbl-io-overview-card cbl-io-overview-card--in">
            <h2 className="cbl-io-overview-card__title">
              {isEn ? 'Customer ledger (CNY)' : '客户账（人民币）'}
            </h2>
            <p className="cbl-io-overview-card__amount">
              {financeLoading && totalIncomeAllStations == null ? (
                <span className="cbl-dim">{isEn ? 'Loading…' : '加载中…'}</span>
              ) : (
                <DualMoney
                  mmk={totalIncomeAllStations ?? 0}
                  rate={fxRate}
                  cny={
                    expenseSummary
                      ? blendCustomerLedgerCny(
                          expenseSummary.collectedTotal ?? 0,
                          expenseSummary.collectedCny,
                          expenseSummary.pendingInflowTotal ?? 0,
                          expenseSummary.manualIncomeTotal ?? 0,
                          fxRate,
                        )
                      : undefined
                  }
                />
              )}
            </p>
            <p className="cbl-io-overview-card__hint">
              {isEn
                ? 'All stations · Collected + Pending inflow + Other income. Not added to Myanmar expenses.'
                : '所有站点合计 · 已收 + 待入账 + 其它收入。不与缅甸开销加总。'}
            </p>
          </section>
          <section className="cbl-io-overview-card cbl-io-overview-card--out">
            <h2 className="cbl-io-overview-card__title">
              {isEn ? 'Myanmar ledger (MMK)' : '缅甸账（缅币）'}
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

        <section className="cbl-card" ref={exceptionsSectionRef}>
          <div className="cbl-card__head">
            <h2 className="cbl-card__title">{isEn ? 'Open exceptions' : '未关单异常件'}</h2>
          </div>
          {(data?.openExceptions ?? []).length === 0 ? (
            <div className="cbl-empty">
              {isEn ? 'No open inventory exceptions.' : '暂无未关单异常。'}
            </div>
          ) : (
            <div className="cbl-table-wrap">
              <table className="cbl-table">
                <thead>
                  <tr>
                    <th>{isEn ? 'Type' : '类型'}</th>
                    <th>{isEn ? 'Barcode' : '条码'}</th>
                    <th>{isEn ? 'Station' : '站点'}</th>
                    <th>{isEn ? 'Note' : '说明'}</th>
                    <th>{isEn ? 'Reported' : '登记时间'}</th>
                    <th>{isEn ? 'Action' : '操作'}</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.openExceptions ?? []).map((row: InventoryExceptionConsoleRow) => (
                    <tr key={row.id}>
                      <td>{exceptionTypeLabel(row.exception_type, isEn)}</td>
                      <td>
                        <span className="cbl-code">
                          {row.express_barcode || row.item_barcode}
                        </span>
                      </td>
                      <td>{row.reported_store_code || row.reported_hub_code}</td>
                      <td>{row.note}</td>
                      <td>{row.created_at ? new Date(row.created_at).toLocaleString() : '—'}</td>
                      <td>
                        <button
                          type="button"
                          className="cbl-btn cbl-btn--primary cbl-btn--sm"
                          onClick={() => setViewingException(row)}
                        >
                          {isEn ? 'Review' : '处理'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <StationSettlementQueue
          isEn={isEn}
          stores={transitStores}
          year={Number(periodDate.slice(0, 4)) || new Date().getFullYear()}
          storeCode={financeStoreCode}
          onChanged={() => void loadFinanceEntries(financePage, tablePageSize)}
        />

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
            <CrossBorderFinancePeriodBar
              kind={periodKind}
              date={periodDate}
              storeCode={financeStoreCode}
              stores={transitStores}
              isEn={isEn}
              exporting={exportingCsv}
              onKindChange={(kind) => {
                setPeriodKind(kind);
                setFinancePage(1);
              }}
              onDateChange={(next) => {
                setPeriodDate(next);
                setFinancePage(1);
              }}
              onStoreCodeChange={(code) => {
                setFinanceStoreCode(code);
                setFinancePage(1);
              }}
              onExport={() => void handleExportFinanceCsv()}
            />
            <div className="cbl-expense-summary">
              <div className="cbl-expense-summary__item">
                <span className="cbl-expense-summary__label">
                  {isEn ? 'Pending inflow' : '待入账'}
                </span>
                <strong>
                  <DualMoney mmk={expenseSummary?.pendingInflowTotal ?? 0} rate={fxRate} />
                </strong>
              </div>
              <div className="cbl-expense-summary__item">
                <span className="cbl-expense-summary__label">
                  {isEn ? 'Collected' : '已收'}
                </span>
                <strong className="cbl-expense-summary__in">
                  <DualMoney
                    mmk={expenseSummary?.collectedTotal ?? 0}
                    rate={fxRate}
                    cny={expenseSummary?.collectedCny}
                    prefix="+"
                  />
                </strong>
              </div>
              <div className="cbl-expense-summary__item">
                <span className="cbl-expense-summary__label">
                  {isEn ? 'Other income' : '其它收入'}
                </span>
                <strong className="cbl-expense-summary__in">
                  <DualMoney mmk={expenseSummary?.manualIncomeTotal ?? 0} rate={fxRate} prefix="+" />
                </strong>
              </div>
              <div className="cbl-expense-summary__item">
                <span className="cbl-expense-summary__label">
                  {isEn ? 'Truck · unpaid' : '待付车费'}
                </span>
                <strong>
                  {formatMmK(expenseSummary?.transportUnpaidTotal ?? 0)} MMK
                </strong>
              </div>
              <div className="cbl-expense-summary__item">
                <span className="cbl-expense-summary__label">
                  {isEn ? 'Truck · paid' : '已付车费'}
                </span>
                <strong>{formatMmK(expenseSummary?.transportPaidTotal ?? 0)} MMK</strong>
              </div>
              <div className="cbl-expense-summary__item">
                <span className="cbl-expense-summary__label">
                  {isEn ? 'Other expense' : '其它支出'}
                </span>
                <strong>{formatMmK(expenseSummary?.manualExpenseTotal ?? 0)} MMK</strong>
              </div>
              <div className="cbl-expense-summary__item">
                <span className="cbl-expense-summary__label">
                  {isEn ? 'Remitted' : '已汇发站'}
                </span>
                <strong>{formatMmK(expenseSummary?.agencyRemittedTotal ?? 0)} MMK</strong>
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
                        <th>{isEn ? 'Amount' : '金额'}</th>
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
                            {isCustomerLedgerCategory(row.category) ? (
                              <DualMoney
                                mmk={row.amount}
                                rate={row.category === 'collected' ? row.fxMmkPerCny ?? null : fxRate}
                                prefix={isIncomeExpenseRow(row.category) || row.category === 'pending_inflow' ? '+' : ''}
                              />
                            ) : (
                              <>
                                {isIncomeExpenseRow(row.category) ? '+' : '−'}
                                {formatMmK(row.amount)} MMK
                              </>
                            )}
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
                        <th>{isEn ? 'Pending' : '待入账'}</th>
                        <th>{isEn ? 'Collected' : '已收'}</th>
                        <th>{isEn ? 'Unpaid truck MMK' : '待付车费MMK'}</th>
                        <th>{isEn ? 'Paid truck MMK' : '已付车费MMK'}</th>
                        <th>{isEn ? 'Manual' : '手工收支'}</th>
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
                                  <DualMoney mmk={cash.pending} rate={fxRate} prefix="+" />
                                </span>
                                <span className="cbl-io-cell__sub">
                                  {isEn ? 'COD from other hubs' : '其它地区发往本站到付'}
                                </span>
                              </div>
                            </td>
                            <td className="cbl-finance-cell cbl-finance-cell--in">
                              <div className="cbl-io-cell">
                                <span className="cbl-io-cell__main cbl-io-cell__main--in">
                                  <DualMoney
                                    mmk={cash.collected}
                                    rate={fxRate}
                                    cny={cash.collectedCny}
                                    prefix="+"
                                  />
                                </span>
                                <span className="cbl-io-cell__sub">
                                  {isEn ? 'Prepaid + signed' : '预付 + 已签收'}
                                </span>
                              </div>
                            </td>
                            <td className="cbl-finance-cell cbl-finance-cell--out">
                              <div className="cbl-io-cell">
                                <span className="cbl-io-cell__main cbl-io-cell__main--out">
                                  −{formatMmK(cash.unpaidTransport)} MMK
                                </span>
                                <span className="cbl-io-cell__sub">
                                  {isEn ? 'Inbound truck unpaid' : '本站待付装车车费'}
                                </span>
                              </div>
                            </td>
                            <td className="cbl-finance-cell">
                              <div className="cbl-io-cell">
                                <span className="cbl-io-cell__main">
                                  {formatMmK(cash.paidTransport)} MMK
                                </span>
                                <span className="cbl-io-cell__sub">
                                  {isEn ? 'Inbound truck paid' : '本站已付装车车费'}
                                </span>
                              </div>
                            </td>
                            <td className="cbl-finance-cell">
                              <div className="cbl-io-cell">
                                <span className="cbl-io-cell__main cbl-io-cell__main--in">
                                  <DualMoney
                                    mmk={finance?.crossBorderSummary?.manualIncomeTotal ?? 0}
                                    rate={fxRate}
                                    prefix="+"
                                  />
                                </span>
                                <span className="cbl-io-cell__sub cbl-io-cell__main--out">
                                  −{formatMmK(finance?.crossBorderSummary?.manualExpenseTotal ?? 0)} MMK
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
                  onClick={() => {
                    setEditingCustomer(null);
                    setShowCreateCustomerModal(true);
                  }}
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
                          <th>{isEn ? 'Notify' : '通知方式'}</th>
                          <th>{isEn ? 'Delivery city' : '送货城市'}</th>
                          <th>{isEn ? 'Salesperson' : '推销员'}</th>
                          <th>{isEn ? 'Applied' : '申请日期'}</th>
                          <th>{isEn ? 'Notes' : '备注'}</th>
                          <th>{isEn ? 'Action' : '操作'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedRegisteredCustomers.map((row) => (
                          <tr key={row.id}>
                            <td>
                              <button
                                type="button"
                                className="cbl-customer-name-btn"
                                onClick={() =>
                                  setCustomerModalTarget(
                                    registeredCustomerToSummary(row, customerSummaries),
                                  )
                                }
                              >
                                <span className="cbl-code">{row.customer_code}</span>
                              </button>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="cbl-customer-name-btn"
                                onClick={() =>
                                  setCustomerModalTarget(
                                    registeredCustomerToSummary(row, customerSummaries),
                                  )
                                }
                              >
                                <span className="cbl-customer-name-btn__name">{row.customer_name}</span>
                              </button>
                            </td>
                            <td>{row.phone || '—'}</td>
                            <td>
                              {formatCustomerNotifyDisplay(row.notify_method, row.notify_account)}
                            </td>
                            <td>
                              {hubLabel(row.delivery_region_id)}
                              <span className="cbl-dim"> · {row.delivery_area_code}</span>
                            </td>
                            <td>{formatSalespersonEmployeeCodeDisplay(row.salesperson_employee_code) || '—'}</td>
                            <td className="cbl-dim">{formatIsoDate(row.application_date, language)}</td>
                            <td className="cbl-dim">{row.address_notes || '—'}</td>
                            <td>
                              <button
                                type="button"
                                className="cbl-btn cbl-btn--primary cbl-btn--sm"
                                onClick={() => {
                                  setEditingCustomer(row);
                                  setShowCreateCustomerModal(true);
                                }}
                              >
                                {isEn ? 'Edit' : '编辑'}
                              </button>
                            </td>
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
                          <td>
                            <DualMoney mmk={row.totalFee} rate={fxRate} />
                          </td>
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

        <section className="cbl-card" style={{ marginTop: 16 }} ref={transportSectionRef}>
          <div className="cbl-card__head">
            <h2 className="cbl-card__title">{isEn ? 'Transport details' : '运输明细'}</h2>
            <div className="cbl-card__head-actions">
              {transportLoading ? (
                <span className="cbl-card__status">
                  {transportView === 'orders'
                    ? isEn
                      ? 'Loading orders…'
                      : '订单明细加载中…'
                    : isEn
                      ? 'Loading packs…'
                      : '运输明细加载中…'}
                </span>
              ) : null}
              <div className="cbl-view-switch" role="tablist" aria-label={isEn ? 'Transport view' : '运输视图'}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={transportView === 'packs'}
                  className={`cbl-chip ${transportView === 'packs' ? 'is-active' : ''}`}
                  onClick={() => setTransportView('packs')}
                >
                  {isEn ? 'Packs' : '包裹'}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={transportView === 'orders'}
                  className={`cbl-chip ${transportView === 'orders' ? 'is-active' : ''}`}
                  onClick={() => setTransportView('orders')}
                >
                  {isEn ? 'Orders' : '订单'}
                </button>
              </div>
              <div className="cbl-chip-row">
                {(transportView === 'packs' ? packFilters : orderFilters).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`cbl-chip ${
                      (transportView === 'packs' ? packFilter : orderFilter) === f.id ? 'is-active' : ''
                    }`}
                    onClick={() => {
                      if (transportView === 'packs') {
                        setPackFilter(f.id as PackStatusFilter);
                      } else {
                        setOrderFilter(f.id as OrderStatusFilter);
                      }
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="cbl-card__body">
            <p className="cbl-card-hint">
              {transportView === 'orders'
                ? isEn
                  ? 'Live data from inventory_order_tracking — one row per express order inside a pack.'
                  : '实时读取云端 inventory_order_tracking；每个快递包内的订单一行。'
                : isEn
                  ? 'Live data from inventory_pkg_tracking — written when Inventory App stock-out syncs to cloud.'
                  : '实时读取云端 inventory_pkg_tracking；Inventory App 装车出库并成功同步后才会出现记录。'}
            </p>
            {transportView === 'packs' ? (
              packsLoading && !recentPacks.length ? (
                <div className="cbl-empty">{isEn ? 'Loading transport…' : '正在加载运输明细…'}</div>
              ) : recentPacks.length ? (
                <>
                  <div className={`cbl-table-wrap${packsLoading ? ' is-loading' : ''}`}>
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
              )
            ) : ordersLoading && !recentOrders.length ? (
              <div className="cbl-empty">{isEn ? 'Loading orders…' : '正在加载订单明细…'}</div>
            ) : recentOrders.length ? (
              <>
                <div className={`cbl-table-wrap${ordersLoading ? ' is-loading' : ''}`}>
                  <table className="cbl-table">
                    <thead>
                      <tr>
                        <th>{isEn ? 'Order' : '订单条码'}</th>
                        <th>{isEn ? 'Customer' : '客户 / 品名'}</th>
                        {!isMobile && <th>{isEn ? 'Phone' : '电话'}</th>}
                        <th>{isEn ? 'Pack' : '包装号'}</th>
                        <th>{isEn ? 'Destination' : '目的地'}</th>
                        <th>{isEn ? 'Hub' : '到站站点'}</th>
                        <th>{isEn ? 'Status' : '状态'}</th>
                        {!isMobile && <th>{isEn ? 'Arrived' : '到站时间'}</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {pagedOrders.map((order) => (
                        <tr key={order.id}>
                          <td>
                            <div style={{ fontWeight: 650 }}>{order.order_barcode || '—'}</div>
                            {order.express_barcode ? (
                              <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                                {order.express_barcode}
                              </div>
                            ) : null}
                          </td>
                          <td>
                            <div style={{ fontWeight: 650 }}>{orderCustomerLabel(order)}</div>
                            {order.order_name &&
                            order.recipient_name &&
                            order.order_name !== order.recipient_name ? (
                              <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                                {order.order_name}
                              </div>
                            ) : null}
                          </td>
                          {!isMobile && <td>{order.recipient_phone || '—'}</td>}
                          <td>
                            <span className="cbl-code">{order.pack_barcode || '—'}</span>
                          </td>
                          <td>{order.destination_code || '—'}</td>
                          <td>
                            {order.hub_received_by_store_code ||
                              order.hub_received_by_store_name ||
                              '—'}
                          </td>
                          <td>
                            <span className={orderTrackingStatusBadgeClass(order.status)}>
                              {orderTrackingStatusLabel(order.status, isEn)}
                            </span>
                          </td>
                          {!isMobile && (
                            <td>{formatDateTime(order.hub_received_at, language)}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <CblTablePagination
                  page={ordersPage}
                  pageSize={tablePageSize}
                  totalItems={recentOrders.length}
                  onPageChange={setOrdersPage}
                  onPageSizeChange={setTablePageSize}
                  isEn={isEn}
                />
              </>
            ) : (
              <div className="cbl-empty">
                {isEn
                  ? 'No orders for this filter. Scan inbound at a hub in Inventory App after cloud sync.'
                  : '当前筛选下无订单。请在 Inventory App 装车/到站扫码并确认云端同步成功。'}
              </div>
            )}
          </div>
        </section>
      </div>

      <CblLazyModal open={showAccountMgmtModal}>
        <CrossBorderAccountManagementModal
          open={showAccountMgmtModal}
          onClose={() => setShowAccountMgmtModal(false)}
          stores={data?.transitStores ?? []}
          isEn={isEn}
          onCreated={handleCreated}
          onUpdated={handleAccountUpdated}
          onDeleted={handleAccountDeleted}
        />
      </CblLazyModal>

      <CblLazyModal open={showPricingModal}>
        <CrossBorderPricingModal
          open={showPricingModal}
          onClose={() => setShowPricingModal(false)}
          customers={pricingCustomers}
          onFxSaved={applyFxRate}
        />
      </CblLazyModal>

      <CblLazyModal open={showManualEntryModal}>
        <CrossBorderManualEntryModal
          open={showManualEntryModal}
          onClose={() => setShowManualEntryModal(false)}
          onSaved={() => void load()}
          stores={transitStores}
        />
      </CblLazyModal>

      <CblLazyModal open={showClearTestModal}>
        <CrossBorderClearTestDataModal
          open={showClearTestModal}
          onClose={() => setShowClearTestModal(false)}
          isEn={isEn}
          onCleared={() => {
            void load();
            feedbackService.notify(
              isEn
                ? 'All cross-border business data cleared from cloud. Devices will reconcile on next sync.'
                : '云端全部跨境业务数据已清空。各中转站 App 下次同步后将自动清理本机对应订单与包裹。',
            );
          }}
        />
      </CblLazyModal>

      <CblLazyModal open={customerModalTarget != null}>
        <CustomerExpressItemsModal
          open={customerModalTarget != null}
          onClose={() => setCustomerModalTarget(null)}
          customer={customerModalTarget}
        />
      </CblLazyModal>

      <CblLazyModal open={showCreateCustomerModal}>
        <CreateCrossBorderCustomerModal
          open={showCreateCustomerModal}
          onClose={() => {
            setShowCreateCustomerModal(false);
            setEditingCustomer(null);
          }}
          existingCustomers={registeredCustomers}
          editingCustomer={editingCustomer}
          onCreated={(customer) => {
            setRegisteredCustomers((prev) => [customer, ...prev]);
            setRegisteredCustomersPage(1);
          }}
          onUpdated={(customer) => {
            setRegisteredCustomers((prev) =>
              prev.map((row) => (row.id === customer.id ? customer : row)),
            );
          }}
        />
      </CblLazyModal>

      <CblLazyModal open={financeModalStore != null}>
        <StoreFinanceDetailModal
          open={financeModalStore != null}
          onClose={closeFinanceDetail}
          store={financeModalStore}
          mode={financeModalMode}
          period={statementPeriod}
        />
      </CblLazyModal>

      <CblLazyModal open={reconcileModalStore != null}>
        <StationReconciliationModal
          open={reconcileModalStore != null}
          onClose={() => setReconcileModalStore(null)}
          store={reconcileModalStore}
          period={statementPeriod}
        />
      </CblLazyModal>

      <CblLazyModal open={viewingException != null}>
        <InventoryExceptionPhotosModal
          open={viewingException != null}
          row={viewingException}
          isEn={isEn}
          typeLabel={viewingException ? exceptionTypeLabel(viewingException.exception_type, isEn) : ''}
          onClose={() => setViewingException(null)}
          onClosed={(closed) => {
            setData((prev) =>
              prev
                ? {
                    ...prev,
                    openExceptions: (prev.openExceptions ?? []).filter((row) => row.id !== closed.id),
                    openExceptionCount: Math.max(0, (prev.openExceptionCount ?? 1) - 1),
                  }
                : prev,
            );
            feedbackService.notify(
              closed.status === 'cancelled'
                ? isEn
                  ? 'Exception rejected'
                  : '异常件已驳回'
                : isEn
                  ? 'Exception closed'
                  : '异常件已关单',
            );
          }}
        />
      </CblLazyModal>
    </div>
  );
};

export default CrossBorderLogisticsPage;
