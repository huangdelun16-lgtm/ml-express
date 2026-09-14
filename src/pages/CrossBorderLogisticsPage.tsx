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
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  fetchCrossBorderSalespersons,
  setCrossBorderRegisteredCustomerStatus,
  type CreateCrossBorderAccountResult,
  type CrossBorderSalesperson,
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
  INVENTORY_CONSOLE_LIST_LIMIT,
} from '../services/inventoryConsoleService';
import {
  orderTrackingStatusBadgeClass,
  orderTrackingStatusLabel,
} from '../utils/inventoryOrderTracking';
import { filterOrders, filterPacks } from '../utils/crossBorderConsoleSearch';
import {
  filterCustomersByKind,
  filterUnifiedCustomers,
  mergeConsoleCustomers,
  type ConsoleCustomerKindFilter,
} from '../utils/crossBorderConsoleCustomers';
import {
  orderTouchesStation,
  packTouchesStation,
  stationFilterKeys,
} from '../utils/crossBorderStationFilter';
import { CROSS_BORDER_HUBS } from '../utils/crossBorderHubs';
import DualMoney from '../components/DualMoney';
import {
  CROSS_BORDER_FX_HISTORY_SETTINGS_KEY,
  CROSS_BORDER_FX_SETTINGS_KEY,
  appendCrossBorderFxHistory,
  buildCrossBorderFxHistorySetting,
  buildCrossBorderFxSetting,
  displayRateForCustomerCategory,
  isCustomerLedgerCategory,
  mmkToCny,
  parseCrossBorderFxHistory,
  parseMmkPerCnyRate,
  pickMmkPerCnyRate,
  type CrossBorderFxHistoryEntry,
} from '../utils/crossBorderFx';
import {
  collectPricingCustomerOptions,
  summarizeRoutePricing,
  type RoutePricingSummary,
} from '../utils/crossBorderRoutePricing';
import { auditLogService, systemSettingsService } from '../services/supabase';
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
import OrderPickupVisibilityCell from '../components/OrderPickupVisibilityCell';
import CblSearchCombobox, { type CblSearchOption } from '../components/CblSearchCombobox';
import CblContactActions from '../components/CblContactActions';
import type { PackOrdersTarget } from '../components/PackOrdersModal';
import { downloadHqFinanceExcel } from '../utils/crossBorderFinanceExport';
import {
  type FinancePeriodKind,
  resolveFinancePeriod,
  yangonTodayYmd,
} from '../utils/yangonFinancePeriod';
import { parseCblPageTab, withCblPageTab, type CblPageTab } from '../utils/cblPageTabs';
import { CblRowMenu, CblTableSkeleton } from '../components/CblOpsUi';

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
const PackOrdersModal = lazy(() => import('../components/PackOrdersModal'));

function CblLazyModal({ open, children }: { open: boolean; children: ReactNode }) {
  if (!open) return null;
  return <Suspense fallback={null}>{children}</Suspense>;
}

function transportQueryKey(filter: string, stationKeys: string[]): string {
  return `${filter}|${stationKeys.slice().sort().join(',')}`;
}

function resolveStationKeys(
  stores: InventoryTransitStore[] | undefined,
  storeCode: string,
): string[] {
  const code = String(storeCode || '').trim();
  if (!code) return [];
  const store = (stores || []).find((item) => item.store_code === code);
  return stationFilterKeys(store ?? { store_code: code });
}

function CblTruncationHint({ show, isEn }: { show: boolean; isEn: boolean }) {
  if (!show) return null;
  return (
    <p className="cbl-truncation-hint">
      {isEn
        ? `Showing the latest ${INVENTORY_CONSOLE_LIST_LIMIT} rows. Use search or a station filter to narrow the list.`
        : `仅显示最近 ${INVENTORY_CONSOLE_LIST_LIMIT} 条。请用搜索或站点筛选缩小范围。`}
    </p>
  );
}

function joinSearchDetail(...parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => String(part || '').trim())
    .filter((part) => part && part !== '—')
    .join(' · ');
}

const DEFAULT_PAGE_SIZE = 10;
const FX_HISTORY_DISPLAY_LIMIT = 5;

function readCblAdminActor(): { id: string; name: string } {
  const id =
    sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser') || 'admin';
  const name =
    sessionStorage.getItem('currentUserName') ||
    localStorage.getItem('currentUserName') ||
    '系统管理员';
  return { id, name };
}

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

function formatCblPeriodHeading(kind: FinancePeriodKind, date: string, isEn: boolean): string {
  const range = resolveFinancePeriod(kind, date);
  if (kind === 'year') return isEn ? range.label : `${range.label}年`;
  if (kind === 'month') {
    const [y, m] = range.label.split('-');
    return isEn ? range.label : `${y}年${Number(m)}月`;
  }
  return range.label;
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

const CBL_TAB_ITEMS: { id: CblPageTab; zh: string; en: string }[] = [
  { id: 'overview', zh: '总览', en: 'Overview' },
  { id: 'finance', zh: '财务', en: 'Finance' },
  { id: 'customers', zh: '客户', en: 'Customers' },
  { id: 'transport', zh: '运输', en: 'Transport' },
  { id: 'settings', zh: '设置', en: 'Settings' },
];

type StatCardAction =
  | { kind: 'exceptions' }
  | { kind: 'orders'; filter: OrderStatusFilter }
  | { kind: 'finance' };

type StatCard = {
  id: string;
  label: string;
  value: string;
  hint: string;
  action: StatCardAction;
  tone?: 'alert' | 'warn';
};

function orderCustomerLabel(order: InventoryOrderRow): string {
  return order.recipient_name || order.order_name || '—';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { language } = useLanguage();
  const { isMobile } = useResponsive();
  const isEn = language === 'en';

  const [loading, setLoading] = useState(true);
  const [financeLoading, setFinanceLoading] = useState(true);
  const [packsLoading, setPacksLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InventoryConsoleData | null>(null);
  const [packFilter, setPackFilter] = useState<PackStatusFilter>('hub_received');
  const [orderFilter, setOrderFilter] = useState<OrderStatusFilter>('awaiting_pickup');
  const [transportView, setTransportView] = useState<TransportView>('orders');
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
  const [viewingPack, setViewingPack] = useState<PackOrdersTarget | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerKindFilter, setCustomerKindFilter] =
    useState<ConsoleCustomerKindFilter>('unfiled');
  const [customerPrefill, setCustomerPrefill] = useState<{
    customer_name: string;
    phone: string;
  } | null>(null);
  const [transportSearch, setTransportSearch] = useState('');
  const [customerSummaries, setCustomerSummaries] = useState<InventoryCustomerSummary[]>([]);
  const [registeredCustomers, setRegisteredCustomers] = useState<CrossBorderRegisteredCustomer[]>(
    [],
  );
  const [customersLoading, setCustomersLoading] = useState(false);
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CrossBorderRegisteredCustomer | null>(
    null,
  );
  const [customerStatusBusyId, setCustomerStatusBusyId] = useState<string | null>(null);
  const [customerModalTarget, setCustomerModalTarget] = useState<InventoryCustomerSummary | null>(
    null,
  );
  const [lastCreated, setLastCreated] = useState<CreateCrossBorderAccountResult | null>(null);
  const [storesPage, setStoresPage] = useState(1);
  const [customersPage, setCustomersPage] = useState(1);
  const [packsPage, setPacksPage] = useState(1);
  const [transportStoreCode, setTransportStoreCode] = useState('');
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
  const [fxHistory, setFxHistory] = useState<CrossBorderFxHistoryEntry[]>([]);
  const [fxUpdatedAt, setFxUpdatedAt] = useState<string | null>(null);
  const [salespersons, setSalespersons] = useState<CrossBorderSalesperson[]>([]);
  const [salespersonsReady, setSalespersonsReady] = useState(false);
  const [pricingSummary, setPricingSummary] = useState<RoutePricingSummary | null>(null);
  const activeTab = parseCblPageTab(searchParams.get('tab'));

  const setActiveTab = useCallback(
    (tab: CblPageTab) => {
      setSearchParams((prev) => withCblPageTab(prev, tab), { replace: true });
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    },
    [setSearchParams],
  );

  const hubLabel = (regionId?: string) => {
    const hub = CROSS_BORDER_HUBS.find((h) => h.regionId === regionId);
    if (!hub) return regionId || '—';
    return isEn ? hub.nameEn : hub.nameZh;
  };

  const packsFilterLoadedRef = useRef(transportQueryKey('hub_received', []));
  const ordersFilterLoadedRef = useRef(transportQueryKey('awaiting_pickup', []));
  const packFilterRef = useRef(packFilter);
  const orderFilterRef = useRef(orderFilter);
  const transportStoreCodeRef = useRef(transportStoreCode);
  const transportStationKeysRef = useRef<string[]>([]);
  const financePageRef = useRef(financePage);
  const tablePageSizeRef = useRef(tablePageSize);
  const periodKindRef = useRef(periodKind);
  const periodDateRef = useRef(periodDate);
  const financeStoreCodeRef = useRef(financeStoreCode);
  const customersFetchStartedRef = useRef(false);
  const loadSeqRef = useRef(0);
  const financeReqIdRef = useRef(0);
  const packsReqIdRef = useRef(0);
  const ordersReqIdRef = useRef(0);

  packFilterRef.current = packFilter;
  orderFilterRef.current = orderFilter;
  transportStoreCodeRef.current = transportStoreCode;
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
      const rows = await systemSettingsService.getSettingsByKeys([
        CROSS_BORDER_FX_SETTINGS_KEY,
        CROSS_BORDER_FX_HISTORY_SETTINGS_KEY,
      ]);
      applyFxRate(pickMmkPerCnyRate(rows));
      const fxRow = rows.find((row) => row.settings_key === CROSS_BORDER_FX_SETTINGS_KEY);
      setFxUpdatedAt(fxRow?.updated_at ?? null);
      const historyRow = rows.find(
        (row) => row.settings_key === CROSS_BORDER_FX_HISTORY_SETTINGS_KEY,
      );
      setFxHistory(parseCrossBorderFxHistory(historyRow?.settings_value));
    } catch {
      applyFxRate(null);
      setFxUpdatedAt(null);
      setFxHistory([]);
    }
  }, [applyFxRate]);

  const saveFxRate = useCallback(async () => {
    const parsed = parseMmkPerCnyRate(fxDraft);
    if (parsed == null) {
      feedbackService.notify(isEn ? 'Enter a rate greater than 0.' : '请填写大于 0 的汇率。');
      return;
    }
    if (fxRate != null && parsed === fxRate) {
      feedbackService.success(isEn ? 'Rate unchanged' : '汇率未变化');
      return;
    }
    const actor = readCblAdminActor();
    const at = new Date().toISOString();
    const nextHistory = appendCrossBorderFxHistory(fxHistory, {
      at,
      by: actor.name,
      from: fxRate,
      to: parsed,
    });
    setFxSaving(true);
    try {
      const result = await systemSettingsService.upsertSettings([
        buildCrossBorderFxSetting(parsed, actor.name),
        buildCrossBorderFxHistorySetting(nextHistory, actor.name),
      ]);
      if (!result.ok) {
        feedbackService.notify(
          isEn
            ? `Failed to save rate.${result.error ? ` ${result.error}` : ''}`
            : `汇率保存失败${result.error ? `：${result.error}` : ''}`,
        );
        return;
      }
      applyFxRate(parsed);
      setFxHistory(nextHistory);
      setFxUpdatedAt(at);
      void auditLogService.log({
        user_id: actor.id,
        user_name: actor.name,
        action_type: 'update',
        module: 'settings',
        target_id: CROSS_BORDER_FX_SETTINGS_KEY,
        target_name: isEn ? 'Cross-border FX' : '跨境汇率',
        action_description: isEn
          ? `FX ${fxRate ?? '—'} → ${parsed} MMK per CNY`
          : `汇率 ${fxRate ?? '—'} → ${parsed} 缅币/人民币`,
        old_value: fxRate == null ? '' : String(fxRate),
        new_value: String(parsed),
      });
      feedbackService.success(isEn ? 'Exchange rate saved' : '汇率已保存');
    } catch (err) {
      feedbackService.notify(err instanceof Error ? err.message : isEn ? 'Save failed' : '保存失败');
    } finally {
      setFxSaving(false);
    }
  }, [applyFxRate, fxDraft, fxHistory, fxRate, isEn]);

  const loadSettingsExtras = useCallback(async () => {
    try {
      const [salespersonRows, pricingRows] = await Promise.all([
        fetchCrossBorderSalespersons().catch(() => [] as CrossBorderSalesperson[]),
        systemSettingsService.getSettingsByKeyPrefix('pricing.cross_border.'),
      ]);
      setSalespersons(salespersonRows);
      setSalespersonsReady(true);
      setPricingSummary(summarizeRoutePricing(pricingRows));
    } catch {
      setSalespersons([]);
      setSalespersonsReady(true);
      setPricingSummary(summarizeRoutePricing([]));
    }
  }, []);

  useEffect(() => {
    void loadFxRate();
  }, [loadFxRate]);

  useEffect(() => {
    if (activeTab !== 'settings') return;
    void loadSettingsExtras();
  }, [activeTab, loadSettingsExtras]);

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
    const stationKeys = transportStationKeysRef.current;
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
      fetchInventoryConsolePacks(filter, stationKeys),
      fetchInventoryConsoleOrders(nextOrderFilter, stationKeys),
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
        packsTruncated: packsResult && packsFresh
          ? Boolean(packsResult.packsTruncated)
          : prev?.packsTruncated,
        ordersTruncated: ordersResult && ordersFresh
          ? Boolean(ordersResult.ordersTruncated)
          : prev?.ordersTruncated,
        crossBorderFinance: financeResult && financeFresh
          ? financeResult.crossBorderFinance
          : prev?.crossBorderFinance,
        warnings,
      }));

      if (packsFresh) {
        packsFilterLoadedRef.current = transportQueryKey(filter, stationKeys);
      }
      if (ordersFresh) {
        ordersFilterLoadedRef.current = transportQueryKey(nextOrderFilter, stationKeys);
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
    if (activeTab === 'customers') scheduleCustomersLoad();
  }, [activeTab, scheduleCustomersLoad]);

  useEffect(() => {
    if (!initialLoadDoneRef.current) return;
    void loadFinanceEntries(financePage, tablePageSize);
  }, [financePage, tablePageSize, loadFinanceEntries, periodKind, periodDate, financeStoreCode]);

  useEffect(() => {
    const nextKey = transportQueryKey(packFilter, transportStationKeysRef.current);
    if (packsFilterLoadedRef.current === nextKey) return;
    const reqId = ++packsReqIdRef.current;
    setPacksPage(1);
    setPacksLoading(true);
    void fetchInventoryConsolePacks(packFilter, transportStationKeysRef.current)
      .then((result) => {
        if (reqId !== packsReqIdRef.current) return;
        packsFilterLoadedRef.current = nextKey;
        setData((prev) =>
          prev
            ? {
                ...prev,
                recentPacks: result.recentPacks,
                packStatusFilter: packFilter,
                packsTruncated: Boolean(result.packsTruncated),
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
  }, [packFilter, transportStoreCode]);

  useEffect(() => {
    const nextKey = transportQueryKey(orderFilter, transportStationKeysRef.current);
    if (ordersFilterLoadedRef.current === nextKey) return;
    const reqId = ++ordersReqIdRef.current;
    setOrdersPage(1);
    setOrdersLoading(true);
    void fetchInventoryConsoleOrders(orderFilter, transportStationKeysRef.current)
      .then((result) => {
        if (reqId !== ordersReqIdRef.current) return;
        ordersFilterLoadedRef.current = nextKey;
        setData((prev) =>
          prev
            ? {
                ...prev,
                recentOrders: result.recentOrders,
                orderStatusFilter: orderFilter,
                ordersTruncated: Boolean(result.ordersTruncated),
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
  }, [orderFilter, transportStoreCode]);

  useEffect(() => {
    setStoresPage(1);
    setCustomersPage(1);
    setPacksPage(1);
    setOrdersPage(1);
    setFinancePage(1);
  }, [tablePageSize]);

  useEffect(() => {
    setCustomersPage(1);
  }, [customerSearch, customerKindFilter]);

  useEffect(() => {
    setPacksPage(1);
    setOrdersPage(1);
  }, [transportSearch]);

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
      const store = (data?.transitStores ?? []).find((item) => item.store_code === financeStoreCode);
      await downloadHqFinanceExcel(`ML-finance-${periodKind}-${periodDate.slice(0, 10)}.xlsx`, {
        entries: result.crossBorderFinance?.entries ?? [],
        summary: result.crossBorderFinance?.summary,
        periodLabel: `${periodKind} ${periodDate}`,
        stationLabel: financeStoreCode
          ? `${financeStoreCode}${store?.store_name ? ` · ${store.store_name}` : ''}`
          : isEn
            ? 'All stations'
            : '全部站点',
        isEn,
        liveRate: fxRate,
      });
    } catch (e) {
      feedbackService.notify(e instanceof Error ? e.message : isEn ? 'Export failed' : '导出失败');
    } finally {
      setExportingCsv(false);
    }
  }, [periodKind, periodDate, financeStoreCode, isEn, fxRate, data?.transitStores]);

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
  const transportStationKeys = useMemo(
    () => resolveStationKeys(transitStores, transportStoreCode),
    [transitStores, transportStoreCode],
  );
  transportStationKeysRef.current = transportStationKeys;

  const accountStatusText = useMemo(() => {
    if (loading && !transitStores.length) {
      return isEn ? 'Loading station accounts…' : '站点账号加载中…';
    }
    const activeCount = transitStores.filter((store) => store.status === 'active').length;
    const inactiveCount = Math.max(0, transitStores.length - activeCount);
    const salespersonText = salespersonsReady
      ? isEn
        ? `${salespersons.length} sales`
        : `推销员 ${salespersons.length}`
      : isEn
        ? 'sales…'
        : '推销员 …';
    return isEn
      ? `${activeCount} active · ${inactiveCount} inactive · ${salespersonText}`
      : `启用 ${activeCount} · 停用 ${inactiveCount} · ${salespersonText}`;
  }, [isEn, loading, salespersons.length, salespersonsReady, transitStores]);

  const pricingSummaryText = useMemo(() => {
    if (!pricingSummary) {
      return isEn ? 'Loading pricing…' : '计费摘要加载中…';
    }
    const custom = isEn
      ? `${pricingSummary.customCustomerCount} customers with custom rates`
      : `${pricingSummary.customCustomerCount} 个客户有专属价`;
    if (!pricingSummary.defaultUpdatedAt) {
      return isEn ? `Default matrix not saved yet · ${custom}` : `尚未保存默认矩阵 · ${custom}`;
    }
    const when = formatDateTime(pricingSummary.defaultUpdatedAt, language);
    return isEn ? `Default matrix saved ${when} · ${custom}` : `默认矩阵更新于 ${when} · ${custom}`;
  }, [isEn, language, pricingSummary]);

  const visibleFxHistory = fxHistory.slice(0, FX_HISTORY_DISPLAY_LIMIT);

  const recentPacks = useMemo(
    () =>
      (data?.recentPacks ?? []).filter(
        (pack) =>
          matchesPackTransportFilter(pack, packFilter) &&
          packTouchesStation(pack, transportStationKeys),
      ),
    [data?.recentPacks, packFilter, transportStationKeys],
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

  const unifiedCustomers = useMemo(
    () => mergeConsoleCustomers(registeredCustomers, customerSummaries),
    [registeredCustomers, customerSummaries],
  );
  const customerKindCounts = useMemo(
    () => ({
      registered: unifiedCustomers.filter((row) => row.kind === 'registered').length,
      unfiled: unifiedCustomers.filter((row) => row.kind === 'express').length,
    }),
    [unifiedCustomers],
  );
  const kindFilteredCustomers = useMemo(
    () => filterCustomersByKind(unifiedCustomers, customerKindFilter),
    [unifiedCustomers, customerKindFilter],
  );
  const filteredUnifiedCustomers = useMemo(
    () => filterUnifiedCustomers(kindFilteredCustomers, customerSearch),
    [kindFilteredCustomers, customerSearch],
  );
  const pagedUnifiedCustomers = useMemo(
    () => paginateSlice(filteredUnifiedCustomers, customersPage, tablePageSize),
    [filteredUnifiedCustomers, customersPage, tablePageSize],
  );

  const handleRegisteredCustomerStatus = useCallback(
    async (row: CrossBorderRegisteredCustomer, nextStatus: 'active' | 'inactive') => {
      const pause = nextStatus === 'inactive';
      const ok = window.confirm(
        pause
          ? isEn
            ? `Pause ${row.customer_name} (${row.customer_code})? Inventory App will stop auto-filling this customer code.`
            : `暂停「${row.customer_name}」(${row.customer_code})？暂停后 Inventory App 填写该客户编码将不再自动带出姓名和电话。`
          : isEn
            ? `Resume ${row.customer_name} (${row.customer_code})?`
            : `恢复「${row.customer_name}」(${row.customer_code})？恢复后 App 可再次用客户编码带出资料。`,
      );
      if (!ok) return;
      setCustomerStatusBusyId(row.id);
      try {
        const updated = await setCrossBorderRegisteredCustomerStatus(row.id, nextStatus);
        setRegisteredCustomers((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item)),
        );
        feedbackService.success(
          pause
            ? isEn
              ? 'Customer paused'
              : '客户已暂停'
            : isEn
              ? 'Customer resumed'
              : '客户已恢复',
        );
      } catch (err) {
        feedbackService.notify(err instanceof Error ? err.message : isEn ? 'Update failed' : '更新失败');
      } finally {
        setCustomerStatusBusyId(null);
      }
    },
    [isEn],
  );

  const pricingCustomers = useMemo(
    () => collectPricingCustomerOptions(registeredCustomers, customerSummaries),
    [registeredCustomers, customerSummaries],
  );

  const filteredPacks = useMemo(
    () => filterPacks(recentPacks, transportSearch),
    [recentPacks, transportSearch],
  );
  const pagedPacks = useMemo(
    () => paginateSlice(filteredPacks, packsPage, tablePageSize),
    [filteredPacks, packsPage, tablePageSize],
  );

  const recentOrders = useMemo(
    () =>
      (data?.recentOrders ?? []).filter((order) =>
        orderTouchesStation(order, transportStationKeys),
      ),
    [data?.recentOrders, transportStationKeys],
  );
  const filteredOrders = useMemo(
    () => filterOrders(recentOrders, transportSearch),
    [recentOrders, transportSearch],
  );
  const pagedOrders = useMemo(
    () => paginateSlice(filteredOrders, ordersPage, tablePageSize),
    [filteredOrders, ordersPage, tablePageSize],
  );

  const customerSearchOptions = useMemo((): CblSearchOption[] => {
    const seenCodes = new Set<string>();
    const options: CblSearchOption[] = [];
    for (const row of registeredCustomers) {
      const code = String(row.customer_code || '').trim();
      if (code) seenCodes.add(code.toUpperCase());
      options.push({
        id: `reg:${row.id}`,
        label: row.customer_name || code || row.phone || '—',
        detail: joinSearchDetail(code, row.phone),
        value: code || row.phone || row.customer_name,
      });
    }
    for (const row of customerSummaries) {
      const code = String(row.customerCode || '').trim();
      if (code && seenCodes.has(code.toUpperCase())) continue;
      options.push({
        id: `sum:${row.customerKey}`,
        label: row.customerName || code || row.customerPhone || '—',
        detail: joinSearchDetail(code, row.customerPhone),
        value: code || row.customerPhone || row.customerName,
      });
    }
    return options;
  }, [registeredCustomers, customerSummaries]);

  const transportSearchOptions = useMemo((): CblSearchOption[] => {
    if (transportView === 'orders') {
      return recentOrders.map((order) => ({
        id: order.id,
        label: order.order_barcode || order.express_barcode || '—',
        detail: joinSearchDetail(
          order.express_barcode && order.express_barcode !== order.order_barcode
            ? order.express_barcode
            : '',
          orderCustomerLabel(order),
          order.recipient_phone,
          order.pack_barcode,
        ),
        value: order.order_barcode || order.express_barcode || order.pack_barcode,
      }));
    }
    return recentPacks.map((pack) => ({
      id: pack.id,
      label: pack.pack_barcode,
      detail: joinSearchDetail(pack.trip_number, packLegRoute(pack), pack.pack_name),
      value: pack.pack_barcode,
    }));
  }, [transportView, recentOrders, recentPacks]);

  const statsCards = useMemo((): StatCard[] => {
    if (!data?.stats) return [];
    const s = data.stats;
    const exceptions = data.openExceptionCount ?? 0;
    const pendingIn = expenseSummary?.pendingInflowTotal ?? 0;
    const unpaidTruck = expenseSummary?.transportUnpaidTotal ?? 0;
    return [
      {
        id: 'exceptions',
        label: isEn ? 'Open exceptions' : '未关异常',
        value: String(exceptions),
        hint: isEn ? 'Needs HQ review' : '需总部处理',
        action: { kind: 'exceptions' },
        tone: exceptions > 0 ? 'alert' : undefined,
      },
      {
        id: 'orders-in-transit',
        label: isEn ? 'In transit' : '在途订单',
        value: String(s.ordersInTransit),
        hint: isEn ? 'Not yet scanned in' : '尚未到站扫入',
        action: { kind: 'orders', filter: 'in_transit' },
      },
      {
        id: 'awaiting-pickup',
        label: isEn ? 'Awaiting pickup' : '到站待签收',
        value: String(s.ordersHubReceived),
        hint: isEn ? 'Arrived at a hub' : '已扫入站、待签收',
        action: { kind: 'orders', filter: 'awaiting_pickup' },
      },
      {
        id: 'pending-inflow',
        label: isEn ? 'Pending inflow' : '待入账',
        value: formatMmK(pendingIn),
        hint: isEn ? 'COD still to collect · MMK' : '到付待收 · 缅币',
        action: { kind: 'finance' },
        tone: pendingIn > 0 ? 'warn' : undefined,
      },
      {
        id: 'unpaid-truck',
        label: isEn ? 'Unpaid truck' : '待付车费',
        value: formatMmK(unpaidTruck),
        hint: isEn ? 'Inbound truck fees · MMK' : '待付装车费 · 缅币',
        action: { kind: 'finance' },
        tone: unpaidTruck > 0 ? 'warn' : undefined,
      },
    ];
  }, [data, expenseSummary, isEn]);

  const isStatCardActive = (action: StatCardAction) => {
    if (action.kind === 'orders') return transportView === 'orders' && orderFilter === action.filter;
    return false;
  };

  const handleStatClick = (action: StatCardAction) => {
    if (action.kind === 'exceptions') {
      setActiveTab('overview');
      if ((data?.openExceptionCount ?? 0) > 0) {
        window.requestAnimationFrame(() => {
          document.getElementById('cbl-open-exceptions')?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        });
      }
      return;
    }
    if (action.kind === 'finance') {
      setActiveTab('finance');
      return;
    }
    setTransportView('orders');
    setOrderFilter(action.filter);
    setActiveTab('transport');
  };

  const packFilters: { id: PackStatusFilter; label: string }[] = [
    { id: 'hub_received', label: isEn ? 'Needs action' : '待处理' },
    { id: 'in_transit', label: isEn ? 'In transit' : '在途' },
    { id: 'completed', label: isEn ? 'Completed' : '已完成' },
    { id: 'all', label: isEn ? 'All' : '全部' },
  ];

  const orderFilters: { id: OrderStatusFilter; label: string }[] = [
    { id: 'awaiting_pickup', label: isEn ? 'Needs action' : '待处理' },
    { id: 'in_transit', label: isEn ? 'In transit' : '在途' },
    { id: 'signed', label: isEn ? 'Signed' : '已签收' },
    { id: 'all', label: isEn ? 'All' : '全部' },
  ];

  const openPackOrders = (target: PackOrdersTarget) => {
    const code = String(target.pack_barcode || '').trim();
    if (!code) return;
    setViewingPack({ ...target, pack_barcode: code });
  };

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
    setActiveTab('settings');
    load();
    void loadSettingsExtras();
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
    void loadSettingsExtras();
  };

  const handleAccountDeleted = () => {
    load();
    void loadSettingsExtras();
  };

  const closeFinanceDetail = () => setFinanceModalStore(null);

  const hubTitle = isEn ? 'Cross-border logistics' : '跨境物流';
  const backLabel = isEn ? 'Dashboard' : '控制台';
  const refreshLabel = loading ? (isEn ? 'Loading…' : '加载中…') : isEn ? 'Refresh' : '刷新';
  const openExceptions = data?.openExceptions ?? [];
  const oldestOpenExceptionAt = openExceptions.reduce<string | null>((acc, row) => {
    if (!row.created_at) return acc;
    if (!acc || row.created_at < acc) return row.created_at;
    return acc;
  }, null);

  return (
    <div className="cbl-page cbl-page--standalone">
      <div className="cbl-inner">
        <div className="cbl-page-chrome">
          <header className="cbl-standalone-header">
            <div className="cbl-standalone-header__title-row">
              <h1 className="cbl-standalone-header__title">{hubTitle}</h1>
              {data?.at ? (
                <span className="cbl-standalone-header__meta">
                  {isEn ? 'Updated' : '更新于'} {formatDateTime(data.at, language)}
                </span>
              ) : null}
            </div>
            <div className="cbl-standalone-header__actions">
              <button
                type="button"
                className="cbl-chrome-btn cbl-chrome-btn--icon"
                onClick={() => load()}
                disabled={loading}
                aria-label={refreshLabel}
                title={refreshLabel}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 12a9 9 0 1 1-2.3-6M21 3v6h-6"
                  />
                </svg>
              </button>
              <button
                type="button"
                className="cbl-chrome-btn cbl-chrome-btn--back"
                onClick={() => navigate('/admin/dashboard')}
              >
                {backLabel}
              </button>
            </div>
          </header>
          <div className="cbl-page-tabs" role="tablist" aria-label={isEn ? 'Page sections' : '页面分区'}>
            {CBL_TAB_ITEMS.map((tab) => {
              const selected = activeTab === tab.id;
              const exceptionCount = data?.openExceptionCount ?? 0;
              const showAlert = tab.id === 'overview' && exceptionCount > 0;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`cbl-tab-${tab.id}`}
                  aria-selected={selected}
                  aria-controls={`cbl-panel-${tab.id}`}
                  className={`cbl-page-tabs__tab${selected ? ' is-on' : ''}${showAlert ? ' has-alert' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {isEn ? tab.en : tab.zh}
                  {showAlert ? (
                    <span className="cbl-page-tabs__count">{exceptionCount}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="cbl-alert cbl-alert--error">
            {error}
            <div style={{ marginTop: 6, fontSize: '0.82rem', opacity: 0.85 }}>
              {isEn
                ? 'Deploy Netlify functions and set SUPABASE_SERVICE_ROLE_KEY on production.'
                : '生产环境需部署 Netlify Functions 并配置 SUPABASE_SERVICE_ROLE_KEY。'}
            </div>
            <div className="cbl-alert__retry">
              <button type="button" className="cbl-btn cbl-btn--light cbl-btn--sm" onClick={() => void load()}>
                {isEn ? 'Retry' : '重试'}
              </button>
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

        {activeTab === 'overview' && (
        <div id="cbl-panel-overview" role="tabpanel" aria-labelledby="cbl-tab-overview">
        <h2 className="cbl-section-label">{isEn ? 'Needs attention' : '要处理'}</h2>
        <div className="cbl-stats">
          {statsCards.length
            ? statsCards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  className={`cbl-stat cbl-stat--btn${isStatCardActive(card.action) ? ' is-active' : ''}${
                    card.tone ? ` cbl-stat--${card.tone}` : ''
                  }`}
                  onClick={() => handleStatClick(card.action)}
                >
                  <div className="cbl-stat__label">{card.label}</div>
                  <div className="cbl-stat__value">{card.value}</div>
                  <div className="cbl-stat__hint">{card.hint}</div>
                </button>
              ))
            : Array.from({ length: 5 }, (_, i) => (
                <div key={`cbl-stat-skel-${i}`} className="cbl-stat is-skeleton" aria-hidden>
                  <div className="cbl-stat__label">{'\u00a0'}</div>
                  <div className="cbl-stat__value">{'\u00a0'}</div>
                  <div className="cbl-stat__hint">{'\u00a0'}</div>
                </div>
              ))}
        </div>

        <h2 className="cbl-section-label">
          {isEn ? 'Period totals' : '本期合计'}
          <span className="cbl-section-label__meta">
            {formatCblPeriodHeading(periodKind, periodDate, isEn)}
            {financeStoreCode ? ` · ${financeStoreCode}` : ''}
          </span>
        </h2>
        <div className="cbl-io-overview">
          <button
            type="button"
            className="cbl-io-overview-card cbl-io-overview-card--in cbl-io-overview-card--btn"
            onClick={() => setActiveTab('finance')}
          >
            <h3 className="cbl-io-overview-card__title">
              {isEn ? 'Customer ledger' : '客户账'}
            </h3>
            <p className="cbl-io-overview-card__amount">
              {financeLoading && totalIncomeAllStations == null ? (
                <span className="cbl-skel-line cbl-skel-line--money" aria-hidden />
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
              {isEn ? 'Collected + pending + other income' : '已收 + 待入账 + 其它收入'}
            </p>
          </button>
          <button
            type="button"
            className="cbl-io-overview-card cbl-io-overview-card--out cbl-io-overview-card--btn"
            onClick={() => setActiveTab('finance')}
          >
            <h3 className="cbl-io-overview-card__title">
              {isEn ? 'Myanmar ledger' : '缅甸账'}
            </h3>
            <p className="cbl-io-overview-card__amount">
              {financeLoading && totalExpenseAllStations == null ? (
                <span className="cbl-skel-line cbl-skel-line--money" aria-hidden />
              ) : (
                <>
                  {formatMmK(totalExpenseAllStations ?? 0)} <span>MMK</span>
                </>
              )}
            </p>
            <p className="cbl-io-overview-card__hint">
              {isEn ? 'Unpaid truck + paid truck + other expense' : '待付车费 + 已付车费 + 其它支出'}
            </p>
          </button>
        </div>

        {openExceptions.length > 0 ? (
        <section className="cbl-card" id="cbl-open-exceptions">
          <div className="cbl-card__head">
            <h2 className="cbl-card__title">
              {isEn ? 'Open exceptions' : '未关单异常件'}
              <span className="cbl-card__title-meta">
                {openExceptions.length}
                {oldestOpenExceptionAt
                  ? ` · ${isEn ? 'oldest' : '最早'} ${formatIsoDate(oldestOpenExceptionAt, language)}`
                  : ''}
              </span>
            </h2>
          </div>
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
                  {openExceptions.map((row: InventoryExceptionConsoleRow) => (
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
        </section>
        ) : null}
        </div>
        )}

        {activeTab === 'finance' && (
        <div id="cbl-panel-finance" role="tabpanel" aria-labelledby="cbl-tab-finance">
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
          </div>
          <div className="cbl-card__body">
            <div className="cbl-finance-intro">
              <p className="cbl-card-hint cbl-finance-intro__hint">
                {isEn
                  ? 'Breakdown for this period. Grand totals are on Overview.'
                  : '本期分项。合计在「总览」。'}
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
              <CblTableSkeleton rows={6} cols={6} />
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
                                rate={displayRateForCustomerCategory(
                                  row.category,
                                  row.fxMmkPerCny,
                                  fxRate,
                                )}
                                cny={
                                  row.paidCny != null && row.paidCny > 0 ? row.paidCny : undefined
                                }
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
            </div>
            <div className="cbl-card__body">
              {loading && !transitStores.length ? (
                <CblTableSkeleton rows={5} cols={8} />
              ) : data?.transitStores.length ? (
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
                              <span className="cbl-io-cell__main cbl-io-cell__main--in">
                                <DualMoney mmk={cash.pending} rate={fxRate} prefix="+" />
                              </span>
                            </td>
                            <td className="cbl-finance-cell cbl-finance-cell--in">
                              <span className="cbl-io-cell__main cbl-io-cell__main--in">
                                <DualMoney
                                  mmk={cash.collected}
                                  rate={fxRate}
                                  cny={cash.collectedCny}
                                  prefix="+"
                                />
                              </span>
                            </td>
                            <td className="cbl-finance-cell cbl-finance-cell--out">
                              <span className="cbl-io-cell__main cbl-io-cell__main--out">
                                −{formatMmK(cash.unpaidTransport)} MMK
                              </span>
                            </td>
                            <td className="cbl-finance-cell">
                              <span className="cbl-io-cell__main">
                                {formatMmK(cash.paidTransport)} MMK
                              </span>
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
                                className="cbl-btn cbl-btn--light cbl-btn--sm"
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
                    ? 'No accounts yet. Open Settings → Account management → + Add account.'
                    : '暂无跨境账号。请打开「设置」→「跨境账号管理」→「+ 添加跨境账号」。'}
                </div>
              )}
              {data?.transitStores.length ? (
                <p className="cbl-finance-hint">
                  {isEn
                    ? 'Station split of the same period. Open Statement for the ledger.'
                    : '各站拆分同一周期。点「对账单」看流水。'}
                </p>
              ) : null}
            </div>
          </section>
        </div>
        </div>
        )}

        {activeTab === 'customers' && (
        <div id="cbl-panel-customers" role="tabpanel" aria-labelledby="cbl-tab-customers">
          <section className="cbl-card cbl-card--customers">
            <div className="cbl-card__head">
              <div className="cbl-card__head-copy">
                <h2 className="cbl-card__title">{isEn ? 'Customers' : '客户信息'}</h2>
                <p className="cbl-card-hint cbl-card-hint--in-head">
                  {isEn
                    ? 'Two lists. Unfiled = inbound names not in HQ yet. Registered = HQ records the App can auto-fill. Use Register on an unfiled row.'
                    : '两套名单：未建档是库存扫到、还没登记的客户；已登记是总部建档、App 可带出电话的。未建档请点「补登记」。'}
                </p>
              </div>
              <div className="cbl-card__head-actions">
                <button
                  type="button"
                  className="cbl-btn cbl-btn--primary cbl-btn--sm"
                  onClick={() => {
                    setEditingCustomer(null);
                    setCustomerPrefill(null);
                    setShowCreateCustomerModal(true);
                  }}
                >
                  {isEn ? '+ Add customer' : '+ 添加客户'}
                </button>
              </div>
            </div>
            <div className="cbl-card__body">
              <div className="cbl-list-toolbar" role="tablist" aria-label={isEn ? 'Customer lists' : '客户名单'}>
                {(
                  [
                    { id: 'unfiled', zh: '未建档', en: 'Unfiled', count: customerKindCounts.unfiled },
                    {
                      id: 'registered',
                      zh: '已登记',
                      en: 'Registered',
                      count: customerKindCounts.registered,
                    },
                    {
                      id: 'all',
                      zh: '全部',
                      en: 'All',
                      count: customerKindCounts.unfiled + customerKindCounts.registered,
                    },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={customerKindFilter === item.id}
                    className={`cbl-chip ${customerKindFilter === item.id ? 'is-active' : ''}`}
                    onClick={() => setCustomerKindFilter(item.id)}
                  >
                    {isEn ? item.en : item.zh}
                    <span className="cbl-chip__count">{item.count}</span>
                  </button>
                ))}
              </div>
              {registeredCustomers.length || customerSummaries.length ? (
                <CblSearchCombobox
                  value={customerSearch}
                  onChange={setCustomerSearch}
                  options={customerSearchOptions}
                  placeholder={
                    isEn
                      ? 'Search name, phone, customer code…'
                      : '搜索姓名、电话、客户编码…'
                  }
                  emptyText={isEn ? 'No matching customers' : '没有匹配的客户'}
                  count={filteredUnifiedCustomers.length}
                  isEn={isEn}
                />
              ) : null}
              {customersLoading ? (
                <CblTableSkeleton rows={6} cols={7} />
              ) : filteredUnifiedCustomers.length ? (
                <>
                  <div className="cbl-table-wrap">
                    <table className="cbl-table cbl-table--customers">
                      <thead>
                        <tr>
                          <th>{isEn ? 'Customer code' : '客户编码'}</th>
                          <th>{isEn ? 'Name' : '客户姓名'}</th>
                          <th>{isEn ? 'Phone' : '电话'}</th>
                          <th>{isEn ? 'Notify' : '通知方式'}</th>
                          <th>{isEn ? 'City / pieces' : '城市 / 件数'}</th>
                          <th>{isEn ? 'Fee' : '费用'}</th>
                          <th>{isEn ? 'Action' : '操作'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedUnifiedCustomers.map((row) => {
                          const registered = row.registered;
                          const summary = row.summary;
                          const paused = registered?.status === 'inactive';
                          const busy = registered ? customerStatusBusyId === registered.id : false;
                          const name = registered?.customer_name || summary?.customerName || '—';
                          const phone = registered?.phone || summary?.customerPhone || '';
                          const code = registered?.customer_code || summary?.customerCode || '';
                          const modalTarget = registered
                            ? registeredCustomerToSummary(registered, customerSummaries)
                            : summary ?? null;
                          return (
                            <tr
                              key={row.key}
                              className={paused ? 'cbl-table-row--paused' : undefined}
                            >
                              <td>
                                {code ? (
                                  <button
                                    type="button"
                                    className="cbl-customer-name-btn"
                                    onClick={() => modalTarget && setCustomerModalTarget(modalTarget)}
                                  >
                                    <span className="cbl-code">{code}</span>
                                  </button>
                                ) : (
                                  <span className="cbl-dim">—</span>
                                )}
                                {row.kind === 'express' ? (
                                  <span className="cbl-badge cbl-badge--amber">
                                    {isEn ? 'Unfiled' : '未建档'}
                                  </span>
                                ) : (
                                  <span className="cbl-badge cbl-badge--green">
                                    {isEn ? 'Registered' : '已登记'}
                                  </span>
                                )}
                              </td>
                              <td>
                                <div className="cbl-customer-name-cell">
                                  <button
                                    type="button"
                                    className="cbl-customer-name-btn"
                                    onClick={() => modalTarget && setCustomerModalTarget(modalTarget)}
                                  >
                                    <span className="cbl-customer-name-btn__name">{name}</span>
                                  </button>
                                  {paused ? (
                                    <span className="cbl-badge cbl-badge--gray">
                                      {isEn ? 'Paused' : '已暂停'}
                                    </span>
                                  ) : null}
                                </div>
                              </td>
                              <td>
                                <CblContactActions
                                  phone={phone}
                                  notifyMethod={registered?.notify_method}
                                  notifyAccount={registered?.notify_account}
                                  isEn={isEn}
                                  message={
                                    isEn
                                      ? `Hello, this is ML Express regarding your shipment.`
                                      : `您好，我是 ML Express，关于您的跨境快件。`
                                  }
                                />
                              </td>
                              <td>
                                {registered
                                  ? formatCustomerNotifyDisplay(
                                      registered.notify_method,
                                      registered.notify_account,
                                    )
                                  : '—'}
                              </td>
                              <td>
                                {registered ? (
                                  <>
                                    {hubLabel(registered.delivery_region_id)}
                                    <span className="cbl-dim"> · {registered.delivery_area_code}</span>
                                  </>
                                ) : (
                                  <span className="cbl-dim">—</span>
                                )}
                                <div className="cbl-dim">
                                  {summary
                                    ? `${summary.totalPieces} ${isEn ? 'pcs' : '件'}${
                                        summary.totalWeightKg > 0 ? ` · ${summary.totalWeightKg} Kg` : ''
                                      }`
                                    : isEn
                                      ? 'No inbound yet'
                                      : '暂无入库'}
                                </div>
                              </td>
                              <td>
                                {summary ? <DualMoney mmk={summary.totalFee} rate={fxRate} /> : '—'}
                              </td>
                              <td>
                                {registered ? (
                                  <CblRowMenu
                                    label={isEn ? 'Row actions' : '行操作'}
                                    items={[
                                      {
                                        id: 'edit',
                                        label: isEn ? 'Edit' : '编辑',
                                        onClick: () => {
                                          setEditingCustomer(registered);
                                          setShowCreateCustomerModal(true);
                                        },
                                      },
                                      {
                                        id: 'status',
                                        label: busy
                                          ? isEn
                                            ? 'Saving…'
                                            : '保存中…'
                                          : paused
                                            ? isEn
                                              ? 'Resume'
                                              : '恢复'
                                            : isEn
                                              ? 'Pause'
                                              : '暂停',
                                        danger: !paused,
                                        disabled: busy,
                                        onClick: () =>
                                          void handleRegisteredCustomerStatus(
                                            registered,
                                            paused ? 'active' : 'inactive',
                                          ),
                                      },
                                    ]}
                                  />
                                ) : (
                                  <button
                                    type="button"
                                    className="cbl-btn cbl-btn--primary cbl-btn--sm"
                                    onClick={() => {
                                      setEditingCustomer(null);
                                      setCustomerPrefill({
                                        customer_name: summary?.customerName || name,
                                        phone: summary?.customerPhone || phone,
                                      });
                                      setShowCreateCustomerModal(true);
                                    }}
                                  >
                                    {isEn ? 'Register' : '补登记'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <CblTablePagination
                    page={customersPage}
                    pageSize={tablePageSize}
                    totalItems={filteredUnifiedCustomers.length}
                    onPageChange={setCustomersPage}
                    onPageSizeChange={setTablePageSize}
                    isEn={isEn}
                  />
                </>
              ) : (
                <div className="cbl-empty cbl-empty--in-card">
                  {customerSearch.trim()
                    ? isEn
                      ? 'No matching customers.'
                      : '没有匹配的客户。'
                    : customerKindFilter === 'unfiled'
                      ? isEn
                        ? 'No unfiled inbound names. Switch to Registered for HQ records.'
                        : '没有未建档客户。库存扫到但没匹配客户编码的会出现在这里。'
                      : customerKindFilter === 'registered'
                        ? isEn
                          ? 'No registered customers yet. Use「+ Add customer」.'
                          : '暂无已登记客户。请点右上角「+ 添加客户」。'
                        : isEn
                          ? 'No customers yet. Use「+ Add customer」, or sync inbound from Inventory App.'
                          : '暂无客户。请点右上角「+ 添加客户」，或先在 Inventory App 入库并同步。'}
                  {customerKindFilter === 'unfiled' && !customerSearch.trim() && customerKindCounts.registered > 0 ? (
                    <div className="cbl-empty__action">
                      <button
                        type="button"
                        className="cbl-btn cbl-btn--light cbl-btn--sm"
                        onClick={() => setCustomerKindFilter('registered')}
                      >
                        {isEn ? 'View registered' : '查看已登记'}
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </section>
        </div>
        )}

        {activeTab === 'transport' && (
        <div id="cbl-panel-transport" role="tabpanel" aria-labelledby="cbl-tab-transport">
        <section className="cbl-card">
          <div className="cbl-card__head">
            <h2 className="cbl-card__title">{isEn ? 'Transport details' : '运输明细'}</h2>
            <div className="cbl-card__head-actions">
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
              <select
                className="cbl-station-select"
                value={transportStoreCode}
                onChange={(event) => setTransportStoreCode(event.target.value)}
                aria-label={isEn ? 'Station' : '站点'}
              >
                <option value="">{isEn ? 'All stations' : '全部站点'}</option>
                {transitStores.map((store) => (
                  <option key={store.id} value={store.store_code}>
                    {store.store_code} · {store.store_name}
                  </option>
                ))}
              </select>
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
                  ? 'Notify/sign come from station Inventory App; HQ does not sign for customers.'
                  : '通知/签收来自站点 Inventory App，总部不代签。'
                : isEn
                  ? 'Click a pack barcode to see orders inside.'
                  : '点包装号可看包内订单。'}
            </p>
            <CblTruncationHint
              show={
                transportView === 'packs'
                  ? Boolean(data?.packsTruncated)
                  : Boolean(data?.ordersTruncated)
              }
              isEn={isEn}
            />
            {(recentPacks.length || recentOrders.length) ? (
              <CblSearchCombobox
                value={transportSearch}
                onChange={setTransportSearch}
                options={transportSearchOptions}
                placeholder={
                  transportView === 'orders'
                    ? isEn
                      ? 'Search order, express, pack, name or phone…'
                      : '搜索订单条码、快递单、包装号、姓名或电话…'
                    : isEn
                      ? 'Search pack, trip or route…'
                      : '搜索包装号、车次或路线…'
                }
                emptyText={
                  transportView === 'orders'
                    ? isEn
                      ? 'No matching orders'
                      : '没有匹配的订单'
                    : isEn
                      ? 'No matching packs'
                      : '没有匹配的包裹'
                }
                count={transportView === 'orders' ? filteredOrders.length : filteredPacks.length}
                isEn={isEn}
              />
            ) : null}
            {transportView === 'packs' ? (
              packsLoading && !recentPacks.length ? (
                <CblTableSkeleton rows={6} cols={isMobile ? 7 : 8} />
              ) : filteredPacks.length ? (
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
                              <button
                                type="button"
                                className="cbl-customer-name-btn"
                                onClick={() =>
                                  openPackOrders({
                                    pack_barcode: pack.pack_barcode,
                                    pack_name: pack.pack_name,
                                    trip_number: pack.trip_number,
                                    routeLabel: packLegRoute(pack),
                                  })
                                }
                              >
                                <span className="cbl-customer-name-btn__name">{pack.pack_barcode}</span>
                              </button>
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
                    totalItems={filteredPacks.length}
                    onPageChange={setPacksPage}
                    onPageSizeChange={setTablePageSize}
                    isEn={isEn}
                  />
                </>
              ) : (
                <div className="cbl-empty">
                  {transportSearch.trim()
                    ? isEn
                      ? 'No matching packs.'
                      : '没有匹配的包裹。'
                    : isEn
                      ? 'No packages for this filter. Stock out in Inventory App and ensure cloud sync succeeded.'
                      : '当前筛选下无包裹。请在 Inventory App 装车出库并确认云端同步成功。'}
                </div>
              )
            ) : ordersLoading && !recentOrders.length ? (
              <CblTableSkeleton rows={6} cols={isMobile ? 8 : 9} />
            ) : filteredOrders.length ? (
              <>
                <div className={`cbl-table-wrap${ordersLoading ? ' is-loading' : ''}`}>
                  <table className="cbl-table">
                    <thead>
                      <tr>
                        <th>{isEn ? 'Order' : '订单条码'}</th>
                        <th>{isEn ? 'Customer' : '客户 / 品名'}</th>
                        <th>{isEn ? 'Phone' : '电话'}</th>
                        <th>{isEn ? 'Pack' : '包装号'}</th>
                        <th>{isEn ? 'Destination' : '目的地'}</th>
                        <th>{isEn ? 'Hub' : '到站站点'}</th>
                        <th>{isEn ? 'Status' : '状态'}</th>
                        <th>{isEn ? 'Notify / sign' : '通知 / 签收'}</th>
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
                          <td>
                            <CblContactActions
                              phone={order.recipient_phone}
                              isEn={isEn}
                              message={
                                isEn
                                  ? `Hello, this is ML Express regarding ${order.order_barcode || 'your shipment'}.`
                                  : `您好，我是 ML Express，关于快件 ${order.order_barcode || ''}。`
                              }
                            />
                          </td>
                          <td>
                            {order.pack_barcode ? (
                              <button
                                type="button"
                                className="cbl-customer-name-btn"
                                onClick={() => openPackOrders({ pack_barcode: order.pack_barcode })}
                              >
                                <span className="cbl-code">{order.pack_barcode}</span>
                              </button>
                            ) : (
                              <span className="cbl-code">—</span>
                            )}
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
                          <td>
                            <OrderPickupVisibilityCell order={order} isEn={isEn} />
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
                  totalItems={filteredOrders.length}
                  onPageChange={setOrdersPage}
                  onPageSizeChange={setTablePageSize}
                  isEn={isEn}
                />
              </>
            ) : (
              <div className="cbl-empty">
                {transportSearch.trim()
                  ? isEn
                    ? 'No matching orders.'
                    : '没有匹配的订单。'
                  : isEn
                    ? 'No orders for this filter. Scan inbound at a hub in Inventory App after cloud sync.'
                    : '当前筛选下无订单。请在 Inventory App 装车/到站扫码并确认云端同步成功。'}
              </div>
            )}
          </div>
        </section>
        </div>
        )}

        {activeTab === 'settings' && (
          <div id="cbl-panel-settings" role="tabpanel" aria-labelledby="cbl-tab-settings" className="cbl-settings">
            <section className="cbl-card">
              <div className="cbl-card__head">
                <h2 className="cbl-card__title">{isEn ? 'Exchange rate' : '汇率'}</h2>
              </div>
              <div className="cbl-card__body">
                <p className="cbl-card-hint">
                  {isEn
                    ? 'Used for CNY display on this console. Inventory App reads the same cloud setting.'
                    : '用于本页人民币金额显示。Inventory App 读取同一条云端汇率。'}
                </p>
                <div className="cbl-fx-bar cbl-fx-bar--on-card">
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
                    className="cbl-btn cbl-btn--primary cbl-btn--sm cbl-fx-bar__save"
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
                <div className="cbl-fx-history">
                  <h3 className="cbl-fx-history__title">{isEn ? 'Recent changes' : '最近变更'}</h3>
                  {visibleFxHistory.length ? (
                    <ul className="cbl-fx-history__list">
                      {visibleFxHistory.map((row) => (
                        <li key={`${row.at}-${row.to}`} className="cbl-fx-history__item">
                          <time dateTime={row.at}>{formatDateTime(row.at, language)}</time>
                          <span className="cbl-fx-history__who">{row.by}</span>
                          <span className="cbl-fx-history__rates">
                            {row.from == null ? '—' : row.from} → {row.to}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="cbl-card-hint cbl-card-hint--tight">
                      {fxUpdatedAt
                        ? isEn
                          ? `Current rate last saved ${formatDateTime(fxUpdatedAt, language)}. New saves will appear here.`
                          : `当前汇率上次保存于 ${formatDateTime(fxUpdatedAt, language)}。保存后会出现变更记录。`
                        : isEn
                          ? 'Changes will appear here after you save.'
                          : '保存后会出现变更记录。'}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="cbl-card">
              <div className="cbl-card__head">
                <h2 className="cbl-card__title">{isEn ? 'Accounts' : '账号'}</h2>
              </div>
              <div className="cbl-card__body">
                <p className="cbl-settings-status">{accountStatusText}</p>
                <p className="cbl-card-hint">
                  {isEn ? 'Reset passwords in account management.' : '改密码进账号管理。'}
                </p>
                <div className="cbl-settings-actions">
                  <button
                    type="button"
                    className="cbl-btn cbl-btn--primary"
                    onClick={() => setShowAccountMgmtModal(true)}
                  >
                    {isEn ? 'Account management' : '跨境账号管理'}
                  </button>
                </div>
              </div>
            </section>

            <section className="cbl-card">
              <div className="cbl-card__head">
                <h2 className="cbl-card__title">{isEn ? 'Pricing' : '计费'}</h2>
              </div>
              <div className="cbl-card__body">
                <p className="cbl-settings-status">{pricingSummaryText}</p>
                <div className="cbl-settings-actions">
                  <button
                    type="button"
                    className="cbl-btn cbl-btn--primary"
                    onClick={() => setShowPricingModal(true)}
                  >
                    {isEn ? 'Pricing' : '跨境计费'}
                  </button>
                </div>
              </div>
            </section>

            <section className="cbl-card">
              <div className="cbl-card__head">
                <h2 className="cbl-card__title">{isEn ? 'Danger zone' : '危险操作'}</h2>
              </div>
              <div className="cbl-card__body">
                <p className="cbl-card-hint">
                  {isEn
                    ? 'Clears all cross-border business data in the cloud. Station apps will reconcile on next sync.'
                    : '清空云端全部跨境业务数据。各中转站 App 下次同步后会清理本机对应订单与包裹。'}
                </p>
                <button
                  type="button"
                  className="cbl-btn cbl-btn--danger-outline"
                  onClick={() => setShowClearTestModal(true)}
                >
                  {isEn ? 'Clear all business data' : '清空全部跨境业务数据'}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>

      <CblLazyModal open={showAccountMgmtModal}>
        <CrossBorderAccountManagementModal
          open={showAccountMgmtModal}
          onClose={() => {
            setShowAccountMgmtModal(false);
            void loadSettingsExtras();
          }}
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
          onClose={() => {
            setShowPricingModal(false);
            void loadSettingsExtras();
          }}
          customers={pricingCustomers}
          onSaved={() => void loadSettingsExtras()}
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
          fxRate={fxRate}
        />
      </CblLazyModal>

      <CblLazyModal open={showCreateCustomerModal}>
        <CreateCrossBorderCustomerModal
          open={showCreateCustomerModal}
          onClose={() => {
            setShowCreateCustomerModal(false);
            setEditingCustomer(null);
            setCustomerPrefill(null);
          }}
          existingCustomers={registeredCustomers}
          editingCustomer={editingCustomer}
          prefill={customerPrefill}
          onCreated={(customer) => {
            setRegisteredCustomers((prev) => [customer, ...prev]);
            setCustomersPage(1);
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
          fxRate={fxRate}
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

      <CblLazyModal open={viewingPack != null}>
        <PackOrdersModal
          open={viewingPack != null}
          pack={viewingPack}
          isEn={isEn}
          language={language}
          onClose={() => setViewingPack(null)}
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
