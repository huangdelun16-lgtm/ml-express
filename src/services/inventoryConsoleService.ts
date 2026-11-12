import { adminAuthenticatedFetch } from './authService';
import { rewritePublicStorageUrl } from '../utils/supabaseBrowserUrl';
import type { SettlementSnapshot } from '../utils/yangonFinancePeriod';
import type { OrderStatusFilter } from '../utils/inventoryOrderTracking';

export type { OrderStatusFilter } from '../utils/inventoryOrderTracking';

export const INVENTORY_CONSOLE_LIST_LIMIT = 500;

export type FinanceOriginAttributionGroup = {
  originKey: string;
  label: string;
  total: number;
  count: number;
};

export type StationReconciliationSummary = {
  originPrepaid: number;
  originCodTransit: number;
  destLocalCollected: number;
  destPendingLocal: number;
  destPendingAgency: number;
  destPendingTotal: number;
  destPendingAgencyByOrigin: FinanceOriginAttributionGroup[];
  destAgencyCollected: number;
  destAgencyCollectedByOrigin: FinanceOriginAttributionGroup[];
  transportOutbound: number;
  transportInbound: number;
  transportInboundUnpaid?: number;
  transportInboundPaid?: number;
  transportUnpaidTotal: number;
  transportPaidTotal: number;
  transportCostTotal: number;
  agencyPayableTotal: number;
  ownRetainTotal: number;
  inflowTotal: number;
  outflowTotal: number;
  pendingInflowTotal: number;
  netCashFlow: number;
  netPositionHint: number;
};

export type ReconciliationEntryBucket = {
  total: number;
  count: number;
  items: FinanceLedgerEntryRow[];
};

export type StationReconciliationDetail = StationReconciliationSummary & {
  sections?: {
    origin_prepaid: ReconciliationEntryBucket;
    origin_cod_transit: ReconciliationEntryBucket;
    dest_local_collected: ReconciliationEntryBucket;
    dest_pending_local: ReconciliationEntryBucket;
    dest_pending_agency: ReconciliationEntryBucket;
    dest_agency_collected: ReconciliationEntryBucket;
    transport_out: ReconciliationEntryBucket;
    transport_in_unpaid: ReconciliationEntryBucket;
    transport_in_paid: ReconciliationEntryBucket;
    transport_out_paid: ReconciliationEntryBucket;
    dest_pending_agency_by_origin: Array<
      FinanceOriginAttributionGroup & { items: FinanceLedgerEntryRow[] }
    >;
    dest_agency_collected_by_origin: Array<
      FinanceOriginAttributionGroup & { items: FinanceLedgerEntryRow[] }
    >;
  };
};

export type CrossBorderStationSummary = {
  collectedTotal: number;
  collectedCny?: number | null;
  transportUnpaidTotal: number;
  transportPaidTotal: number;
  pendingInflowTotal: number;
  agencyPayableTotal: number;
  agencyRemittedTotal?: number;
  manualIncomeTotal: number;
  manualExpenseTotal: number;
};

export type InventoryTransitStoreFinance = {
  ledgerEntryCount: number;
  codPendingTotal: number;
  collectedTotal: number;
  transportCostTotal: number;
  collectedLocalTotal?: number;
  collectedAgencyTotal?: number;
  collectedAgencyByOrigin?: FinanceOriginAttributionGroup[];
  codLocalTotal?: number;
  codAgencyTotal?: number;
  codAgencyByOrigin?: FinanceOriginAttributionGroup[];
  reconciliation?: StationReconciliationSummary;
  crossBorderSummary?: CrossBorderStationSummary;
};

export type InventoryTransitStore = {
  id: string;
  store_name: string;
  store_code: string;
  region?: string;
  address?: string;
  phone?: string;
  status?: string;
  store_type?: string;
  created_at?: string;
  finance?: InventoryTransitStoreFinance;
};

export type InventoryPackRow = {
  id: string;
  pack_barcode: string;
  pack_name: string;
  origin_store_code: string;
  origin_store_name: string;
  destination_code: string;
  leg_destination_code?: string | null;
  item_count: number;
  total_weight?: string | null;
  status: 'in_transit' | 'hub_received' | 'split_at_hub' | 'completed' | 'cancelled';
  display_status?: 'pending_load' | 'loaded' | 'arrived' | 'completed' | null;
  display_status_label?: string | null;
  transport_fee?: number | null;
  trip_number?: string | null;
  truck_outbound_date?: string | null;
  truck_loaded_at?: string | null;
  hub_received_at?: string | null;
  hub_received_by_store_code?: string | null;
  hub_received_by_store_name?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type InventoryOrderRow = {
  id: string;
  pack_barcode: string;
  order_barcode: string;
  express_barcode: string;
  order_name: string;
  destination_code: string;
  qty: number;
  status: 'in_transit' | 'hub_received' | 'released_at_hub';
  recipient_name: string;
  recipient_phone: string;
  inbound_store_name: string;
  hub_received_at: string | null;
  hub_received_by_store_code: string | null;
  hub_received_by_store_name: string | null;
  customer_signed_at?: string | null;
  arrival_notified_at?: string | null;
  hub_arrived_at?: string | null;
  item_name?: string;
  weight?: string;
  spec?: string;
  trip_number?: string | null;
  created_at: string;
  updated_at: string;
};

export type InventoryConsoleStats = {
  storeItemsTotal: number;
  storeItemsInStock: number;
  packsInTransit: number;
  packsHubReceived: number;
  packsCompleted: number;
  packsCancelled: number;
  ordersInTransit: number;
  ordersHubReceived: number;
};

export type InventoryCustomerSummary = {
  customerKey: string;
  /** 登记客户编码（与登记客户表一致时合并汇总） */
  customerCode?: string;
  customerName: string;
  customerPhone: string;
  totalPieces: number;
  totalWeightKg: number;
  totalFee: number;
  /** 多个入库和有报价的订单，人民币只计一次 */
  totalQuoteCny?: number;
  /** 没有人民币报价、只记下缅币的费用 */
  feeWithoutQuote?: number;
  /** 和明细同一套：报价、签收锁定、未签收单价×重量 */
  totalCny?: number | null;
  totalMmk?: number | null;
  /** 订单目的地，未建档补登记时用来对上城市 */
  destinationHub?: string;
  /** 该客户全部已签收、且签收币种不是人民币的缅币。不含未签收。 */
  signedMmkIncome?: number;
  /** 该客户签收时明确选了人民币的金额。不含未签收，也不含缅币签收。 */
  signedCnyIncome?: number;
  orderCount: number;
  /** 未建档客户最早一笔入库时间，用来标出放太久的名单 */
  oldestInboundAt?: string;
};

export type InventoryCustomerExpressItem = {
  id: string;
  customerName: string;
  customerPhone: string;
  customerKey: string;
  productName: string;
  expressBarcode: string;
  inboundBarcode: string;
  packedBundleBarcode?: string | null;
  tripNumber?: string | null;
  packaging: string;
  origin: string;
  destination: string;
  weight: string;
  weightKg: number;
  packWeightKg?: number;
  qty: number;
  fee: number;
  quoteCny?: number;
  inboundNote?: string;
  paymentStatus: string;
  packageStatus: string;
  transportStatus: string;
  paymentLabel: string;
  ownerStoreCode: string;
  inboundAt: string;
  updatedAt: string;
  customerSigned?: boolean;
  fxMmkPerCny?: number | null;
  paidCurrency?: 'MMK' | 'CNY';
  paidCny?: number;
};

export type InventoryExceptionConsolePhoto = {
  id: string;
  public_url: string;
  storage_path?: string | null;
};

export type InventoryExceptionConsoleRow = {
  id: string;
  item_barcode: string;
  express_barcode: string | null;
  pack_barcode: string | null;
  exception_type: string;
  status: string;
  note: string;
  qty_expected: number | null;
  qty_actual: number | null;
  reported_store_code: string;
  reported_hub_code: string;
  reported_operator: string;
  resolved_at?: string | null;
  resolved_by?: string | null;
  resolve_note?: string | null;
  created_at: string;
  photos?: InventoryExceptionConsolePhoto[];
};

export type InventoryConsoleData = {
  ok: boolean;
  at: string;
  transitStores: InventoryTransitStore[];
  stats: InventoryConsoleStats;
  recentPacks: InventoryPackRow[];
  recentOrders?: InventoryOrderRow[];
  packStatusFilter: string;
  orderStatusFilter?: string;
  packsTruncated?: boolean;
  ordersTruncated?: boolean;
  /** 服务端分页总数。-1 表示当前筛选无法精确计数，配合 listHasMore 翻页。 */
  packsListTotal?: number;
  ordersListTotal?: number;
  packsListHasMore?: boolean;
  ordersListHasMore?: boolean;
  transportFeeTotal?: number;
  openExceptionCount?: number;
  openExceptions?: InventoryExceptionConsoleRow[];
  /** 全站待打包，口径同库存首页 */
  pendingPackCount?: number;
  /** 全站待装车 */
  pendingTruckLoadCount?: number;
  /** 全站已到站、还没通知客户 */
  pendingNotifyCount?: number;
  crossBorderFinance?: CrossBorderFinance;
  warnings?: string[];
};

export type CrossBorderExpenseCategory =
  | 'transport_unpaid'
  | 'transport_paid'
  | 'pending_inflow'
  | 'collected'
  | 'agency_remit'
  | 'manual_income'
  | 'manual_expense'
  | 'export_cost';

export type CrossBorderExpenseRow = {
  id: string;
  category: CrossBorderExpenseCategory;
  title: string;
  subtitle: string;
  amount: number;
  amountDisplay: string;
  occurredAt: string;
  barcode: string;
  itemName: string;
  destination?: string;
  originLabel?: string;
  originKey?: string;
  stationCode: string;
  stationName: string;
  statusLabel: string;
  fxMmkPerCny?: number | null;
  paidCurrency?: 'MMK' | 'CNY';
  paidCny?: number;
};

export type CrossBorderFinanceSummary = {
  entryCount: number;
  collectedTotal: number;
  /** 已锁定签收/预付的人民币合计；有未锁旧单时为 null */
  collectedCny?: number | null;
  transportUnpaidTotal: number;
  transportPaidTotal: number;
  pendingInflowTotal: number;
  transportRegisteredTotal: number;
  agencyPayableTotal?: number;
  agencyRemittedTotal?: number;
  manualIncomeTotal: number;
  manualIncomeMmkTotal?: number;
  manualIncomeCnyTotal?: number;
  manualExpenseTotal: number;
  /** 出口成本合计。人民币只含选了人民币的记录；缅币是各单锁定汇率，不跟总部活汇率。 */
  exportCostCnyTotal?: number;
  exportCostMmkTotal?: number;
};

export type CrossBorderFinancePagination = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type CrossBorderManualEntryDraft = {
  entry_date: string;
  kind: 'income' | 'expense';
  amount: number;
  currency?: 'MMK' | 'CNY';
  category: string;
  note: string;
  store_code: string;
};

export type CrossBorderFinance = {
  summary: CrossBorderFinanceSummary;
  entries: CrossBorderExpenseRow[];
  pagination?: CrossBorderFinancePagination;
};

export type PackStatusFilter = 'active' | 'in_transit' | 'hub_received' | 'completed' | 'all';

export type FinanceLedgerCategory =
  | 'order_income_cod'
  | 'order_prepaid'
  | 'order_collected'
  | 'transport_cost'
  | 'stock_op';

export type FinanceLedgerEntryRow = {
  id: string;
  category: FinanceLedgerCategory;
  title: string;
  subtitle: string;
  amount: number | null;
  amountDisplay: string;
  occurredAt: string;
  barcode: string;
  itemName: string;
  destination?: string;
  originLabel?: string;
  originKey?: string;
  paid?: boolean;
  transportFee?: number;
  fxMmkPerCny?: number | null;
  paidCurrency?: 'MMK' | 'CNY';
  paidCny?: number;
};

export type FinanceBreakdownGroup = {
  region: string;
  label: string;
  count: number;
  totalAmount: number;
  items: FinanceLedgerEntryRow[];
};

export type StoreFinanceDetail = {
  ok: boolean;
  at: string;
  store: InventoryTransitStore;
  hubCode: string;
  summary: InventoryTransitStoreFinance;
  entries: FinanceLedgerEntryRow[];
  breakdown: {
    cod: FinanceBreakdownGroup[];
    collected: FinanceBreakdownGroup[];
    transport: FinanceBreakdownGroup[];
  };
  reconciliationDetail?: StationReconciliationDetail;
  crossBorderSummary?: CrossBorderStationSummary;
  period?: { fromIso: string; toExclusiveIso: string; label: string } | null;
  warnings?: string[];
};

export type StoreFinanceDetailMode = 'ledger' | 'cod' | 'collected' | 'transport';

export type FinancePeriodParams = {
  period?: 'day' | 'month' | 'year';
  date?: string;
  from?: string;
  to?: string;
  storeCode?: string;
  financeExport?: boolean;
};

function applyFinancePeriodParams(url: URL, period?: FinancePeriodParams | null): void {
  if (!period) return;
  if (period.period) url.searchParams.set('period', period.period);
  if (period.date) url.searchParams.set('date', period.date);
  if (period.from) url.searchParams.set('from', period.from);
  if (period.to) url.searchParams.set('to', period.to);
  if (period.storeCode) url.searchParams.set('storeCode', period.storeCode);
  if (period.financeExport) url.searchParams.set('financeExport', '1');
}

export async function fetchStoreFinanceDetail(
  storeCode: string,
  period?: FinancePeriodParams | null,
): Promise<StoreFinanceDetail> {
  const url = new URL('/.netlify/functions/inventory-admin-finance', window.location.origin);
  url.searchParams.set('storeCode', storeCode);
  applyFinancePeriodParams(url, period);

  const response = await adminAuthenticatedFetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `加载财务明细失败 (${response.status})`);
  }
  return payload as StoreFinanceDetail;
}

export async function fetchInventoryConsoleData(
  packStatus: PackStatusFilter = 'active',
  financePage = 1,
  financePageSize = 10,
): Promise<InventoryConsoleData> {
  const url = new URL('/.netlify/functions/inventory-admin-data', window.location.origin);
  url.searchParams.set('packStatus', packStatus);
  url.searchParams.set('section', 'all');
  url.searchParams.set('financePage', String(financePage));
  url.searchParams.set('financePageSize', String(financePageSize));

  const response = await adminAuthenticatedFetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || `加载失败 (${response.status})`);
  }

  return {
    ...payload,
    openExceptions: mapConsoleExceptionRows(payload.openExceptions),
  } as InventoryConsoleData;
}

type ConsoleSectionResponse = InventoryConsoleData & {
  section?: string;
  warnings?: string[];
  listTotal?: number;
  listHasMore?: boolean;
};

export type ConsoleListParams = {
  page?: number;
  pageSize?: number;
  q?: string;
};

async function fetchInventoryConsoleSection(
  section: 'overview' | 'finance' | 'packs' | 'orders',
  packStatus?: PackStatusFilter,
  financePagination?: { page: number; pageSize: number },
  period?: FinancePeriodParams | null,
  orderStatus?: OrderStatusFilter,
  extras?: { stationKeys?: string[]; list?: ConsoleListParams },
): Promise<ConsoleSectionResponse> {
  const url = new URL('/.netlify/functions/inventory-admin-data', window.location.origin);
  url.searchParams.set('section', section);
  if (packStatus) url.searchParams.set('packStatus', packStatus);
  if (orderStatus) url.searchParams.set('orderStatus', orderStatus);
  if (extras?.stationKeys?.length) {
    url.searchParams.set('stationKeys', extras.stationKeys.join(','));
  }
  if (extras?.list) {
    url.searchParams.set('listPage', String(extras.list.page && extras.list.page > 0 ? extras.list.page : 1));
    url.searchParams.set(
      'listPageSize',
      String(extras.list.pageSize && extras.list.pageSize > 0 ? extras.list.pageSize : 20),
    );
    const q = String(extras.list.q || '').trim();
    if (q) url.searchParams.set('q', q);
  }
  if (financePagination) {
    url.searchParams.set('financePage', String(financePagination.page));
    url.searchParams.set('financePageSize', String(financePagination.pageSize));
  }
  applyFinancePeriodParams(url, period);

  const response = await adminAuthenticatedFetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `加载失败 (${response.status})`);
  }
  return payload as ConsoleSectionResponse;
}

function mapConsoleExceptionRows(
  rows?: InventoryExceptionConsoleRow[],
): InventoryExceptionConsoleRow[] {
  return (rows ?? []).map((row) => ({
    ...row,
    photos: (row.photos ?? []).map((photo) => ({
      ...photo,
      public_url: rewritePublicStorageUrl(photo.public_url),
    })),
  }));
}

export async function fetchInventoryConsoleOverview(): Promise<{
  transitStores: InventoryTransitStore[];
  stats: InventoryConsoleStats;
  transportFeeTotal?: number;
  openExceptionCount?: number;
  openExceptions?: InventoryExceptionConsoleRow[];
  pendingPackCount?: number;
  pendingTruckLoadCount?: number;
  pendingNotifyCount?: number;
  warnings?: string[];
}> {
  const payload = await fetchInventoryConsoleSection('overview');
  return {
    transitStores: payload.transitStores ?? [],
    stats: payload.stats!,
    transportFeeTotal: payload.transportFeeTotal,
    openExceptionCount: payload.openExceptionCount ?? 0,
    openExceptions: mapConsoleExceptionRows(payload.openExceptions),
    pendingPackCount: Number(payload.pendingPackCount) || 0,
    pendingTruckLoadCount: Number(payload.pendingTruckLoadCount) || 0,
    pendingNotifyCount: Number(payload.pendingNotifyCount) || 0,
    warnings: payload.warnings,
  };
}

export async function fetchInventoryConsoleFinance(
  financePage = 1,
  financePageSize = 10,
  period?: FinancePeriodParams | null,
): Promise<{
  transitStores: InventoryTransitStore[];
  crossBorderFinance?: InventoryConsoleData['crossBorderFinance'];
  warnings?: string[];
}> {
  const payload = await fetchInventoryConsoleSection('finance', undefined, {
    page: financePage,
    pageSize: financePageSize,
  }, period);
  return {
    transitStores: payload.transitStores ?? [],
    crossBorderFinance: payload.crossBorderFinance,
    warnings: payload.warnings,
  };
}

export async function fetchInventoryConsolePacks(
  packStatus: PackStatusFilter = 'active',
  stationKeys: string[] = [],
  list?: ConsoleListParams,
): Promise<{
  recentPacks: InventoryPackRow[];
  packStatusFilter?: string;
  packsTruncated?: boolean;
  listTotal?: number;
  listHasMore?: boolean;
  warnings?: string[];
}> {
  const payload = await fetchInventoryConsoleSection(
    'packs',
    packStatus,
    undefined,
    undefined,
    undefined,
    { stationKeys, list },
  );
  return {
    recentPacks: payload.recentPacks ?? [],
    packStatusFilter: payload.packStatusFilter,
    packsTruncated: payload.packsTruncated,
    listTotal: payload.packsListTotal ?? payload.listTotal,
    listHasMore: payload.packsListHasMore ?? payload.listHasMore,
    warnings: payload.warnings,
  };
}

async function withPackTrips(orders: InventoryOrderRow[]): Promise<InventoryOrderRow[]> {
  const codes = Array.from(
    new Set(
      orders
        .filter((order) => !String(order.trip_number || '').trim())
        .map((order) => order.pack_barcode.trim())
        .filter(Boolean),
    ),
  );
  if (!codes.length) return orders;
  const trips = new Map<string, string>();
  await Promise.all(
    codes.map(async (code) => {
      try {
        const payload = await fetchInventoryConsoleSection('packs', 'all', undefined, undefined, undefined, {
          list: { q: code, page: 1, pageSize: 5 },
        });
        const pack = (payload.recentPacks || []).find(
          (row) => String(row.pack_barcode || '').trim().toUpperCase() === code.toUpperCase(),
        );
        const trip = String(pack?.trip_number || '').trim();
        if (trip) trips.set(code.toUpperCase(), trip);
      } catch {
        /* 车次稍后补，不挡住订单表 */
      }
    }),
  );
  if (!trips.size) return orders;
  return orders.map((order) => ({
    ...order,
    trip_number:
      String(order.trip_number || '').trim() ||
      trips.get(order.pack_barcode.trim().toUpperCase()) ||
      '',
  }));
}

export async function attachOrderTrips(orders: InventoryOrderRow[]): Promise<InventoryOrderRow[]> {
  return withPackTrips(orders);
}

export async function fetchInventoryConsoleOrders(
  orderStatus: OrderStatusFilter = 'active',
  stationKeys: string[] = [],
  list?: ConsoleListParams,
): Promise<{
  recentOrders: InventoryOrderRow[];
  orderStatusFilter?: string;
  ordersTruncated?: boolean;
  listTotal?: number;
  listHasMore?: boolean;
  warnings?: string[];
}> {
  const payload = await fetchInventoryConsoleSection(
    'orders',
    undefined,
    undefined,
    undefined,
    orderStatus,
    { stationKeys, list },
  );
  return {
    recentOrders: payload.recentOrders ?? [],
    orderStatusFilter: payload.orderStatusFilter,
    ordersTruncated: payload.ordersTruncated,
    listTotal: payload.ordersListTotal ?? payload.listTotal,
    listHasMore: payload.ordersListHasMore ?? payload.listHasMore,
    warnings: payload.warnings,
  };
}

export type PackExportCostGlance = {
  payCurrency: 'CNY' | 'MMK';
  unitPriceCny: number;
  totalCny: number;
  totalMmk: number;
  weightKg: number;
};

export type PackGlance = {
  packName: string;
  tripNumber: string;
  transportFee: number | null;
  exportCost: PackExportCostGlance | null;
  pieceCount: number | null;
  weightLabel: string;
};

function packagingBase(barcode: string): string {
  const raw = String(barcode || '').trim();
  const match = raw.match(/^(.*)\(\d+-\d+\)$/);
  return (match ? match[1] : raw).trim().toUpperCase();
}

function exportCostKeys(row: ExportCostRecord): string[] {
  const extra = row as ExportCostRecord & { subject_key?: string; barcode?: string; title?: string };
  return [row.display_barcode, extra.subject_key, extra.barcode, extra.title]
    .map((value) => String(value || '').trim().toUpperCase())
    .filter(Boolean);
}

function toPackExportCost(row: ExportCostRecord): PackExportCostGlance {
  return {
    payCurrency: String(row.pay_currency || '').toUpperCase() === 'MMK' ? 'MMK' : 'CNY',
    unitPriceCny: Number(row.unit_price_cny) || 0,
    totalCny: Number(row.total_cny) || 0,
    totalMmk: Number(row.total_mmk) || 0,
    weightKg: Number(row.weight_kg) || 0,
  };
}

function parseWeightKg(raw?: string | number | null): number {
  const n = Number(String(raw ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function formatKg(kg: number): string {
  if (!(kg > 0)) return '';
  const rounded = Math.round(kg * 100) / 100;
  return `${rounded} Kg`;
}

function combineExportCosts(rows: ExportCostRecord[]): PackExportCostGlance | null {
  if (!rows.length) return null;
  if (rows.length === 1) return toPackExportCost(rows[0]);
  const currencies = new Set(rows.map((row) => String(row.pay_currency || '').toUpperCase()));
  if (currencies.size === 1 && currencies.has('MMK')) {
    return {
      payCurrency: 'MMK',
      unitPriceCny: 0,
      totalCny: 0,
      totalMmk: rows.reduce((sum, row) => sum + (Number(row.total_mmk) || 0), 0),
      weightKg: rows.reduce((sum, row) => sum + (Number(row.weight_kg) || 0), 0),
    };
  }
  return {
    payCurrency: 'CNY',
    unitPriceCny: 0,
    totalCny: rows.reduce((sum, row) => sum + (Number(row.total_cny) || 0), 0),
    totalMmk: 0,
    weightKg: rows.reduce((sum, row) => sum + (Number(row.weight_kg) || 0), 0),
  };
}

async function fillPackGlance(
  packBarcode: string,
  orders: InventoryOrderRow[],
  glance: PackGlance | null,
): Promise<PackGlance> {
  const code = packBarcode.trim().toUpperCase();
  let packName = String(glance?.packName || '').trim();
  let tripNumber = String(glance?.tripNumber || orders.find((order) => order.trip_number)?.trip_number || '').trim();
  let transportFee = glance?.transportFee ?? null;
  let exportCost = glance?.exportCost ?? null;
  let pieceCount = glance?.pieceCount ?? null;
  let weightLabel = String(glance?.weightLabel || '').trim();

  if (!packName || !tripNumber || transportFee == null || pieceCount == null || !weightLabel) {
    try {
      const payload = await fetchInventoryConsoleSection('packs', 'all', undefined, undefined, undefined, {
        list: { q: packBarcode.trim(), page: 1, pageSize: 5 },
      });
      const pack = (payload.recentPacks || []).find(
        (row) => String(row.pack_barcode || '').trim().toUpperCase() === code,
      );
      if (pack) {
        packName = packName || String(pack.pack_name || '').trim();
        tripNumber = tripNumber || String(pack.trip_number || '').trim();
        if (transportFee == null && pack.transport_fee != null && Number.isFinite(Number(pack.transport_fee))) {
          transportFee = Number(pack.transport_fee);
        }
        if (pieceCount == null && Number(pack.item_count) > 0) pieceCount = Number(pack.item_count);
        weightLabel = weightLabel || formatKg(parseWeightKg(pack.total_weight));
      }
    } catch {
      /* 包装资料暂时读不到时保留已有值 */
    }
  }

  if (!exportCost) {
    try {
      const saved = await fetchExportCostRecords(null, '', { pending: false });
      const wanted = new Set<string>([code]);
      orders.forEach((order) => {
        const barcode = String(order.order_barcode || '').trim().toUpperCase();
        const express = String(order.express_barcode || '').trim().toUpperCase();
        if (barcode) {
          wanted.add(barcode);
          wanted.add(packagingBase(barcode));
        }
        if (express) wanted.add(express);
      });
      const matched = saved.rows.filter((row) => exportCostKeys(row).some((key) => wanted.has(key)));
      exportCost = combineExportCosts(matched);
    } catch {
      /* 出口成本暂时读不到时显示未填 */
    }
  }

  if (pieceCount == null) {
    const summed = orders.reduce((sum, order) => sum + (Number(order.qty) || 0), 0);
    pieceCount = summed > 0 ? summed : null;
  }
  if (!weightLabel) {
    const summed = orders.reduce((sum, order) => sum + parseWeightKg(order.weight), 0);
    weightLabel = formatKg(summed);
  }

  return { packName, tripNumber, transportFee, exportCost, pieceCount, weightLabel };
}

export async function fetchInventoryConsoleOrdersByPack(packBarcode: string): Promise<{
  recentOrders: InventoryOrderRow[];
  packGlance?: PackGlance | null;
  ordersTruncated?: boolean;
  warnings?: string[];
}> {
  const code = String(packBarcode || '').trim();
  if (!code) {
    return { recentOrders: [] };
  }
  const url = new URL('/.netlify/functions/inventory-admin-data', window.location.origin);
  url.searchParams.set('section', 'orders');
  url.searchParams.set('packBarcode', code);

  const response = await adminAuthenticatedFetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `加载失败 (${response.status})`);
  }
  const recentOrders = await withPackTrips((payload.recentOrders ?? []) as InventoryOrderRow[]);
  return {
    recentOrders,
    packGlance: await fillPackGlance(code, recentOrders, payload.packGlance ?? null),
    ordersTruncated: Boolean(payload.ordersTruncated),
    warnings: payload.warnings,
  };
}

export type PeriodSignedIncome = {
  mmk: number;
  cny: number;
  freightMmk: number;
  freightCny: number;
  extraMmk: number;
  extraCny: number;
};

export async function fetchPeriodSignedIncome(
  period?: FinancePeriodParams | null,
): Promise<PeriodSignedIncome> {
  const url = new URL('/.netlify/functions/inventory-admin-data', window.location.origin);
  url.searchParams.set('section', 'period-income');
  applyFinancePeriodParams(url, period);
  const response = await adminAuthenticatedFetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `加载本期收入失败 (${response.status})`);
  }
  return {
    mmk: Number(payload.mmk) || 0,
    cny: Number(payload.cny) || 0,
    freightMmk: Number(payload.freightMmk) || 0,
    freightCny: Number(payload.freightCny) || 0,
    extraMmk: Number(payload.extraMmk) || 0,
    extraCny: Number(payload.extraCny) || 0,
  };
}

export type ExpressDetailRow = {
  id: string;
  customerName: string;
  productName: string;
  expressBarcode: string;
  inboundBarcode: string;
  destination: string;
  spec: string;
  unit: string;
  weight: string;
  qty: number;
  status: string;
  packed: boolean;
  packBarcode: string;
  ownerStoreCode: string;
  note: string;
  inboundAt: string;
  updatedAt: string;
  arrivedAt: string;
  signedAt: string;
  exceptionStatus: string;
  phone?: string;
  address?: string;
  packaging?: string;
  inboundNote?: string;
  inboundStore?: string;
  exceptions?: Array<{
    id: string;
    type: string;
    status: string;
    note: string;
    createdAt: string;
    resolvedAt: string;
  }>;
};

export async function fetchExpressDetails(options?: {
  page?: number;
  pageSize?: number;
  q?: string;
}): Promise<{ items: ExpressDetailRow[]; total: number; hasMore: boolean; page: number; pageSize: number }> {
  const url = new URL('/.netlify/functions/inventory-admin-data', window.location.origin);
  url.searchParams.set('section', 'express-details');
  url.searchParams.set('listPage', String(options?.page && options.page > 0 ? options.page : 1));
  url.searchParams.set('listPageSize', String(options?.pageSize && options.pageSize > 0 ? options.pageSize : 20));
  const q = String(options?.q || '').trim();
  if (q) url.searchParams.set('q', q);
  const response = await adminAuthenticatedFetch(url.toString(), { method: 'GET', credentials: 'include' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `加载快递明细失败 (${response.status})`);
  if (!Array.isArray(payload.items)) throw new Error('快递明细还没接到后台');
  return {
    items: payload.items as ExpressDetailRow[],
    total: Number.isFinite(Number(payload.total)) ? Number(payload.total) : -1,
    hasMore: Boolean(payload.hasMore),
    page: Number(payload.page) || 1,
    pageSize: Number(payload.pageSize) || 20,
  };
}

export async function fetchExpressDetail(id: string): Promise<ExpressDetailRow> {
  const url = new URL('/.netlify/functions/inventory-admin-data', window.location.origin);
  url.searchParams.set('section', 'express-details');
  url.searchParams.set('id', id);
  const response = await adminAuthenticatedFetch(url.toString(), { method: 'GET', credentials: 'include' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `加载订单详情失败 (${response.status})`);
  if (!payload.detail) throw new Error('没有这张订单');
  return payload.detail as ExpressDetailRow;
}

export async function fetchInventoryCustomerSummaries(): Promise<{
  summaries: InventoryCustomerSummary[];
  warnings?: string[];
}> {
  const response = await adminAuthenticatedFetch('/.netlify/functions/inventory-admin-customers', {
    method: 'GET',
    credentials: 'include',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `加载客户信息失败 (${response.status})`);
  }
  return {
    summaries: (payload.summaries ?? []) as InventoryCustomerSummary[],
    warnings: payload.warnings,
  };
}

export async function fetchInventoryCustomerItems(
  customerName: string,
  customerPhone: string,
  customerCode?: string,
): Promise<{
  customerName: string;
  customerPhone: string;
  customerCode?: string;
  items: InventoryCustomerExpressItem[];
  warnings?: string[];
}> {
  const url = new URL('/.netlify/functions/inventory-admin-customers', window.location.origin);
  if (customerCode?.trim()) {
    url.searchParams.set('customerCode', customerCode.trim());
  } else {
    url.searchParams.set('customerName', customerName);
    url.searchParams.set('customerPhone', customerPhone);
  }

  const response = await adminAuthenticatedFetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `加载客户快递失败 (${response.status})`);
  }
  return {
    customerName: payload.customerName ?? customerName,
    customerPhone: payload.customerPhone ?? customerPhone,
    items: (payload.items ?? []) as InventoryCustomerExpressItem[],
    warnings: payload.warnings,
  };
}

export type CrossBorderAccountDraft = {
  store_name: string;
  store_code: string;
  region: string;
  hubCode: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  email: string;
  manager_name: string;
  manager_phone: string;
  operating_hours: string;
  password: string;
  notes: string;
  service_area_radius: number;
  capacity: number;
  facilities: string[];
  cod_settlement_day: '7' | '10' | '15' | '30';
};

export type CreateCrossBorderAccountResult = {
  ok: boolean;
  store: InventoryTransitStore;
  login: {
    storeCode: string;
    password: string;
    hubCode: string;
    authEmail: string;
  };
};

export type CrossBorderAccountDetail = CrossBorderAccountDraft & {
  id: string;
  status: string;
  created_at?: string;
};

export type UpdateCrossBorderAccountPayload = {
  store_code: string;
  store_name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  email: string;
  manager_name: string;
  manager_phone: string;
  operating_hours: string;
  notes: string;
  service_area_radius: number;
  capacity: number;
  facilities: string[];
  cod_settlement_day: CrossBorderAccountDraft['cod_settlement_day'];
  status: string;
  password?: string;
};

export type UpdateCrossBorderAccountResult = {
  ok: boolean;
  store: InventoryTransitStore;
  hubCode?: string;
  login?: CreateCrossBorderAccountResult['login'];
};

export type DeleteCrossBorderAccountResult = {
  ok: boolean;
  storeCode: string;
  storeName: string;
  authDeleted?: boolean;
};

export async function fetchCrossBorderAccountDetail(
  storeCode: string,
): Promise<CrossBorderAccountDetail> {
  const url = new URL('/.netlify/functions/inventory-admin-update-account', window.location.origin);
  url.searchParams.set('storeCode', storeCode);

  const response = await adminAuthenticatedFetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `加载账号失败 (${response.status})`);
  }
  return payload.store as CrossBorderAccountDetail;
}

export async function updateCrossBorderAccount(
  payload: UpdateCrossBorderAccountPayload,
): Promise<UpdateCrossBorderAccountResult> {
  const response = await adminAuthenticatedFetch('/.netlify/functions/inventory-admin-update-account', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || `保存失败 (${response.status})`);
  }
  return body as UpdateCrossBorderAccountResult;
}

export async function deleteCrossBorderAccount(
  storeCode: string,
): Promise<DeleteCrossBorderAccountResult> {
  const url = new URL('/.netlify/functions/inventory-admin-delete-account', window.location.origin);
  url.searchParams.set('storeCode', storeCode.trim());

  const response = await adminAuthenticatedFetch(url.toString(), {
    method: 'DELETE',
    credentials: 'include',
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || `删除失败 (${response.status})`);
  }
  return body as DeleteCrossBorderAccountResult;
}

export async function createCrossBorderAccount(
  draft: CrossBorderAccountDraft,
): Promise<CreateCrossBorderAccountResult> {
  const response = await adminAuthenticatedFetch('/.netlify/functions/inventory-admin-create-account', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(draft),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `创建失败 (${response.status})`);
  }
  return payload as CreateCrossBorderAccountResult;
}

export async function createCrossBorderManualEntry(
  draft: CrossBorderManualEntryDraft,
): Promise<void> {
  const response = await adminAuthenticatedFetch('/.netlify/functions/inventory-admin-cross-border-entry', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(draft),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `保存失败 (${response.status})`);
  }
}

export const INVENTORY_TEST_DATA_CONFIRM_PHRASE = '清空全部跨境业务数据';

export type InventoryExceptionCloseStatus = 'resolved' | 'cancelled';

export async function closeInventoryException(payload: {
  id: string;
  status: InventoryExceptionCloseStatus;
  resolveNote?: string;
}): Promise<InventoryExceptionConsoleRow> {
  const response = await adminAuthenticatedFetch('/.netlify/functions/inventory-admin-exceptions', {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || `关单失败 (${response.status})`);
  }
  return body.exception as InventoryExceptionConsoleRow;
}

export type InventoryTestDataClearResult = {
  ok: boolean;
  deleted: {
    orderTracking: number;
    transportFeePayments: number;
    pkgTracking: number;
    packedShipmentItems: number;
    packedShipments: number;
    stockMovements: number;
    storeItems: number;
    crossBorderManualEntries: number;
    stationSettlements?: number;
    agencyRemittances?: number;
    exceptionPhotos?: number;
    exceptions?: number;
    exportCosts?: number;
    signedInvoices?: number;
  };
  clearedAt: string;
  message?: string;
};

export async function clearInventoryTestData(
  password: string,
  confirmPhrase: string,
): Promise<InventoryTestDataClearResult> {
  const response = await adminAuthenticatedFetch('/.netlify/functions/inventory-admin-clear-test-data', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, confirmPhrase }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `清空失败 (${response.status})`);
  }
  return payload as InventoryTestDataClearResult;
}

export type InventoryTripClearPreview = {
  ok: boolean;
  dryRun: true;
  tripNumber: string;
  packCount: number;
  orderCount: number;
  packs: Array<{
    packBarcode: string;
    name: string;
    route: string;
    itemCount: number;
    loadedAt: string | null;
    customerName?: string;
    weight?: string;
  }>;
  orderSamples: string[];
  keptOnOtherTrip: number;
  totalWeight?: string;
};

export type InventoryTripClearResult = {
  ok: boolean;
  tripNumber: string;
  packCount: number;
  orderCount: number;
  keptOnOtherTrip: number;
  message?: string;
};

export async function previewInventoryTripClear(tripNumber: string): Promise<InventoryTripClearPreview> {
  const response = await adminAuthenticatedFetch('/.netlify/functions/inventory-admin-clear-trip', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tripNumber, dryRun: true }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `查询车次失败 (${response.status})`);
  }
  return payload as InventoryTripClearPreview;
}

export async function clearInventoryTrip(
  tripNumber: string,
  password: string,
  confirmTripNumber: string,
): Promise<InventoryTripClearResult> {
  const response = await adminAuthenticatedFetch('/.netlify/functions/inventory-admin-clear-trip', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tripNumber, password, confirmTripNumber }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `清空车次失败 (${response.status})`);
  }
  return payload as InventoryTripClearResult;
}

export type CrossBorderSalesperson = {
  id: string;
  name: string;
  region_id: string;
  work_area_code: string;
  employee_code: string;
  phone: string;
  address: string;
  join_date: string;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
};

export type CrossBorderSalespersonDraft = {
  name: string;
  region_id: string;
  work_area_code: string;
  employee_code: string;
  phone: string;
  address: string;
  join_date: string;
  status: 'active' | 'inactive';
};

export type UpdateCrossBorderSalespersonPayload = {
  id: string;
  name: string;
  phone: string;
  address: string;
  join_date: string;
  status: 'active' | 'inactive';
};

export async function fetchCrossBorderSalespersons(): Promise<CrossBorderSalesperson[]> {
  const response = await adminAuthenticatedFetch('/.netlify/functions/inventory-admin-salespersons', {
    method: 'GET',
    credentials: 'include',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `加载推销员失败 (${response.status})`);
  }
  return (payload.salespersons ?? []) as CrossBorderSalesperson[];
}

export async function fetchCrossBorderSalespersonDetail(
  id: string,
): Promise<CrossBorderSalesperson> {
  const url = new URL('/.netlify/functions/inventory-admin-salespersons', window.location.origin);
  url.searchParams.set('id', id);

  const response = await adminAuthenticatedFetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `加载推销员失败 (${response.status})`);
  }
  return payload.salesperson as CrossBorderSalesperson;
}

export async function createCrossBorderSalesperson(
  draft: CrossBorderSalespersonDraft,
): Promise<CrossBorderSalesperson> {
  const response = await adminAuthenticatedFetch('/.netlify/functions/inventory-admin-salespersons', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(draft),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `创建失败 (${response.status})`);
  }
  return payload.salesperson as CrossBorderSalesperson;
}

export async function updateCrossBorderSalesperson(
  payload: UpdateCrossBorderSalespersonPayload,
): Promise<CrossBorderSalesperson> {
  const response = await adminAuthenticatedFetch('/.netlify/functions/inventory-admin-salespersons', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || `保存失败 (${response.status})`);
  }
  return body.salesperson as CrossBorderSalesperson;
}

export async function deleteCrossBorderSalesperson(id: string): Promise<{
  ok: boolean;
  id: string;
  name: string;
  employee_code: string;
}> {
  const url = new URL('/.netlify/functions/inventory-admin-salespersons', window.location.origin);
  url.searchParams.set('id', id);

  const response = await adminAuthenticatedFetch(url.toString(), {
    method: 'DELETE',
    credentials: 'include',
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || `删除失败 (${response.status})`);
  }
  return body as { ok: boolean; id: string; name: string; employee_code: string };
}

export type CrossBorderRegisteredCustomer = {
  id: string;
  customer_name: string;
  phone: string;
  delivery_region_id: string;
  delivery_area_code: string;
  address_notes: string;
  salesperson_employee_code: string;
  application_date: string;
  customer_code: string;
  status: 'active' | 'inactive';
  notify_method?: string;
  notify_account?: string;
  created_at?: string;
  updated_at?: string;
};

export type CrossBorderRegisteredCustomerDraft = {
  customer_name: string;
  phone: string;
  delivery_region_id: string;
  delivery_area_code: string;
  address_notes: string;
  salesperson_employee_code: string;
  application_date: string;
  customer_code: string;
  notify_method?: string;
  notify_account?: string;
};

export async function fetchCrossBorderRegisteredCustomers(): Promise<
  CrossBorderRegisteredCustomer[]
> {
  const response = await adminAuthenticatedFetch('/.netlify/functions/inventory-admin-cross-border-customers', {
    method: 'GET',
    credentials: 'include',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `加载登记客户失败 (${response.status})`);
  }
  return (payload.customers ?? []) as CrossBorderRegisteredCustomer[];
}

export type CrossBorderStockInLine = {
  expressCode: string;
  name?: string;
  qty: number;
};

export type CrossBorderStockInResult = {
  mode: 'single' | 'batch';
  barcode: string;
  lineBarcodes: string[];
};

export async function submitCrossBorderStockIn(body: {
  mode: 'single' | 'batch';
  storeId: string;
  destination: string;
  recipientName: string;
  recipientPhone: string;
  customerCode?: string;
  inboundDate: string;
  quoteCny?: string;
  chargeBasis?: 'volume' | 'weight';
  pay: 'cod' | 'prepaid';
  note?: string;
  detailAddress?: string;
  weightKg?: string;
  spec?: string;
  qty?: number;
  expressCode?: string;
  itemName?: string;
  lines?: CrossBorderStockInLine[];
}): Promise<CrossBorderStockInResult> {
  const response = await adminAuthenticatedFetch('/.netlify/functions/inventory-admin-stock-in', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `入库失败 (${response.status})`);
  }
  return payload as CrossBorderStockInResult;
}

export async function createCrossBorderRegisteredCustomer(
  draft: CrossBorderRegisteredCustomerDraft,
): Promise<CrossBorderRegisteredCustomer> {
  const response = await adminAuthenticatedFetch('/.netlify/functions/inventory-admin-cross-border-customers', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(draft),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `创建失败 (${response.status})`);
  }
  return payload.customer as CrossBorderRegisteredCustomer;
}

export type UpdateCrossBorderRegisteredCustomerPayload = {
  id: string;
  customer_name: string;
  phone: string;
  delivery_region_id: string;
  delivery_area_code: string;
  address_notes: string;
  notify_method?: string;
  notify_account?: string;
};

export async function updateCrossBorderRegisteredCustomer(
  payload: UpdateCrossBorderRegisteredCustomerPayload,
): Promise<CrossBorderRegisteredCustomer> {
  const response = await adminAuthenticatedFetch('/.netlify/functions/inventory-admin-cross-border-customers', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || `保存失败 (${response.status})`);
  }
  return body.customer as CrossBorderRegisteredCustomer;
}

export async function setCrossBorderRegisteredCustomerStatus(
  id: string,
  status: 'active' | 'inactive',
): Promise<CrossBorderRegisteredCustomer> {
  const response = await adminAuthenticatedFetch('/.netlify/functions/inventory-admin-cross-border-customers', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, status }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || `更新状态失败 (${response.status})`);
  }
  return body.customer as CrossBorderRegisteredCustomer;
}

export type StationSettlementRow = {
  id: string;
  period_type: 'day' | 'month';
  period_start: string;
  period_end: string;
  store_id: string;
  store_code: string;
  hub_code: string;
  status: 'submitted' | 'confirmed' | 'rejected';
  snapshot: SettlementSnapshot;
  submitted_by: string;
  submitted_at: string;
  confirmed_by: string;
  confirmed_at?: string | null;
  rejected_reason: string;
  note: string;
};

export type AnnualFinanceRollup = {
  year: number;
  months: Array<{
    month: number;
    periodStart: string;
    missing: boolean;
    snapshot: SettlementSnapshot | null;
    storeCount: number;
  }>;
  totals: SettlementSnapshot;
  missingCount: number;
  settlements?: StationSettlementRow[];
};

async function postInventorySettlement(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await adminAuthenticatedFetch('/.netlify/functions/inventory-admin-settlements', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `操作失败 (${response.status})`);
  }
  return payload as Record<string, unknown>;
}

export async function fetchStationSettlements(params?: {
  status?: string;
  storeCode?: string;
  periodType?: string;
  year?: number;
}): Promise<StationSettlementRow[]> {
  const url = new URL('/.netlify/functions/inventory-admin-settlements', window.location.origin);
  if (params?.status) url.searchParams.set('status', params.status);
  if (params?.storeCode) url.searchParams.set('storeCode', params.storeCode);
  if (params?.periodType) url.searchParams.set('periodType', params.periodType);
  if (params?.year) url.searchParams.set('year', String(params.year));
  const response = await adminAuthenticatedFetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `加载结算单失败 (${response.status})`);
  }
  return (payload.settlements ?? []) as StationSettlementRow[];
}

export async function fetchAnnualFinanceRollup(
  year: number,
  storeCode?: string,
): Promise<AnnualFinanceRollup> {
  const url = new URL('/.netlify/functions/inventory-admin-settlements', window.location.origin);
  url.searchParams.set('view', 'annual');
  url.searchParams.set('year', String(year));
  if (storeCode) url.searchParams.set('storeCode', storeCode);
  const response = await adminAuthenticatedFetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `加载年报失败 (${response.status})`);
  }
  return payload as AnnualFinanceRollup;
}

export async function fetchSettlementCompare(id: string): Promise<{
  settlement: StationSettlementRow;
  snapshot: SettlementSnapshot;
  live: SettlementSnapshot;
  diff: {
    hasDiff: boolean;
    diffs: Record<string, { snapshot: number; live: number; delta: number }>;
  };
}> {
  const url = new URL('/.netlify/functions/inventory-admin-settlements', window.location.origin);
  url.searchParams.set('view', 'compare');
  url.searchParams.set('id', id);
  const response = await adminAuthenticatedFetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `对比失败 (${response.status})`);
  }
  return payload as {
    settlement: StationSettlementRow;
    snapshot: SettlementSnapshot;
    live: SettlementSnapshot;
    diff: {
      hasDiff: boolean;
      diffs: Record<string, { snapshot: number; live: number; delta: number }>;
    };
  };
}

export async function confirmStationSettlement(id: string): Promise<void> {
  await postInventorySettlement({ action: 'confirm', id });
}

export async function rejectStationSettlement(id: string, reason: string): Promise<void> {
  await postInventorySettlement({ action: 'reject', id, reason });
}

export async function markHqTransportFeePaid(params: {
  packBarcode: string;
  storeCode: string;
  fee?: string;
  originStoreCode?: string;
  legDestination?: string;
}): Promise<void> {
  await postInventorySettlement({
    action: 'pay_transport',
    packBarcode: params.packBarcode,
    storeCode: params.storeCode,
    fee: params.fee || '',
    originStoreCode: params.originStoreCode || '',
    legDestination: params.legDestination || '',
  });
}

export async function recordHqAgencyRemittance(params: {
  fromStoreCode: string;
  toOriginKey: string;
  amount: number;
  remittedAt?: string;
  note?: string;
  toStoreCode?: string;
}): Promise<void> {
  await postInventorySettlement({
    action: 'agency_remit',
    fromStoreCode: params.fromStoreCode,
    toOriginKey: params.toOriginKey,
    amount: params.amount,
    remittedAt: params.remittedAt,
    note: params.note,
    toStoreCode: params.toStoreCode,
  });
}

export type SignedInvoiceListRow = {
  id: string;
  invoice_no: string;
  issued_on: string;
  customer_name: string;
  phone: string;
  trip_label: string;
  piece_count: number;
  total_fee_cny: number | null;
  total_fee_mmk: number;
  document: {
    invoiceNo?: string;
    meta?: Array<{ label: string; value: string }>;
    lines?: Array<{ title: string; expressNos: string[]; measure: string }>;
    totals?: string[];
    payNote?: string;
    contactLabel?: string;
    contactPhoneLabel?: string;
    contactPhones?: string;
    contactKpay?: string;
    contactSite?: string;
  };
  signed_at: string;
  store_code: string;
};

export type ExportCostRecord = {
  id: string;
  subject_kind: 'single' | 'package' | string;
  display_barcode: string;
  customer_name: string;
  final_destination: string;
  leg_origin: string;
  leg_destination: string;
  weight_kg: number | string;
  unit_price_cny: number | string;
  total_cny: number | string;
  total_mmk?: number | string;
  pay_currency?: string;
  fx_mmk_per_cny?: number | string | null;
  trip_number: string;
  store_code: string;
  created_by: string;
  created_at: string;
};

export type HqQueueKind = 'pack' | 'truck' | 'notify';

export type HqQueueRow = {
  barcode: string;
  expressNo?: string;
  name?: string;
  customer?: string;
  destination?: string;
  weightKg?: number;
  qty?: number;
  arrivedAt?: string;
  storeCode?: string;
};

export async function fetchHqQueue(
  queue: HqQueueKind,
  options?: { storeCode?: string; page?: number; pageSize?: number },
): Promise<{
  total: number;
  page: number;
  pageSize: number;
  truncated: boolean;
  rows: HqQueueRow[];
}> {
  const url = new URL('/.netlify/functions/inventory-admin-data', window.location.origin);
  url.searchParams.set('section', 'hq-queue');
  url.searchParams.set('queue', queue);
  if (options?.storeCode) url.searchParams.set('storeCode', options.storeCode);
  if (options?.page) url.searchParams.set('page', String(options.page));
  if (options?.pageSize) url.searchParams.set('pageSize', String(options.pageSize));
  const response = await adminAuthenticatedFetch(url.toString(), { method: 'GET', credentials: 'include' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `加载失败 (${response.status})`);
  return {
    total: Number(payload.total) || 0,
    page: Number(payload.page) || 1,
    pageSize: Number(payload.pageSize) || 50,
    truncated: Boolean(payload.truncated),
    rows: Array.isArray(payload.rows) ? payload.rows : [],
  };
}

export async function saveAdminExportCost(input: {
  subjectKind: 'single' | 'package';
  subjectKey: string;
  displayBarcode: string;
  customerName: string;
  finalDestination: string;
  legDestination: 'MSE' | 'LSO';
  weightKg: number;
  unitPriceCny: number;
  payCurrency: 'CNY' | 'MMK';
  mmkPerCny?: number | null;
  tripNumber?: string;
  storeCode?: string;
}): Promise<void> {
  const response = await adminAuthenticatedFetch('/.netlify/functions/inventory-admin-export-cost', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `保存失败 (${response.status})`);
}

export type PendingExportLine = {
  id?: string;
  barcode?: string;
  base?: string;
  customer: string;
  destination: string;
  weightKg: number;
  tripNumber: string;
  pieceCount?: number;
  ownerStoreCode?: string;
};

export type PendingExportBoard = {
  singles: PendingExportLine[];
  packages: PendingExportLine[];
  singleCount: number;
  packageCount: number;
  truncated: boolean;
};

export async function fetchExportCostRecords(
  period?: FinancePeriodParams | null,
  query?: string,
  options?: { pending?: boolean },
): Promise<{
  rows: ExportCostRecord[];
  totalCny: number;
  totalMmk: number;
  pending: PendingExportBoard | null;
  pendingNote: string;
}> {
  const url = new URL('/.netlify/functions/inventory-admin-data', window.location.origin);
  url.searchParams.set('section', 'export-costs');
  const q = String(query || '').trim();
  if (q) url.searchParams.set('q', q);
  if (options?.pending === false) url.searchParams.set('pending', '0');
  applyFinancePeriodParams(url, period);
  const response = await adminAuthenticatedFetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `加载失败 (${response.status})`);
  }
  if (!Array.isArray(payload.exportCosts)) {
    throw new Error('MISSING_EXPORT_COST_API');
  }
  const pending = payload.pendingExport;
  const pendingNote = Array.isArray(payload.warnings)
    ? payload.warnings.map((item: unknown) => String(item || '').trim()).filter(Boolean).join(' ')
    : '';
  return {
    rows: payload.exportCosts as ExportCostRecord[],
    totalCny: Number(payload.totalCny) || 0,
    totalMmk: Number(payload.totalMmk) || 0,
    pendingNote,
    pending:
      pending && Array.isArray(pending.singles) && Array.isArray(pending.packages)
        ? {
            singles: pending.singles,
            packages: pending.packages,
            singleCount: Number(pending.singleCount) || pending.singles.length,
            packageCount: Number(pending.packageCount) || pending.packages.length,
            truncated: Boolean(pending.truncated),
          }
        : null,
  };
}

export type SignedInvoiceYearCount = {
  year: number;
  count: number;
};

export type SignedInvoicePage = {
  invoices: SignedInvoiceListRow[];
  total: number;
  page: number;
  pageSize: number;
  year: number | null;
  years: SignedInvoiceYearCount[];
  searching: boolean;
};

export async function fetchSignedInvoices(params?: {
  year?: number;
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<SignedInvoicePage> {
  const url = new URL('/.netlify/functions/inventory-admin-data', window.location.origin);
  url.searchParams.set('section', 'invoices');
  if (params?.year) url.searchParams.set('year', String(params.year));
  if (params?.q) url.searchParams.set('q', params.q);
  if (params?.page) url.searchParams.set('page', String(params.page));
  if (params?.pageSize) url.searchParams.set('pageSize', String(params.pageSize));
  const response = await adminAuthenticatedFetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `加载失败 (${response.status})`);
  }
  if (!Array.isArray(payload.invoices)) {
    throw new Error('MISSING_INVOICE_API');
  }
  const years = Array.isArray(payload.years)
    ? payload.years.flatMap((row: { year?: unknown; count?: unknown }) => {
        const year = Number(row?.year);
        const count = Number(row?.count);
        if (!Number.isFinite(year)) return [];
        return [{ year, count: Number.isFinite(count) && count > 0 ? Math.round(count) : 0 }];
      })
    : [];
  const total = Number(payload.total);
  return {
    invoices: payload.invoices as SignedInvoiceListRow[],
    total: Number.isFinite(total) && total >= 0 ? total : payload.invoices.length,
    page: Number(payload.page) || params?.page || 1,
    pageSize: Number(payload.pageSize) || params?.pageSize || 10,
    year: payload.year == null || payload.year === '' ? null : Number(payload.year),
    years,
    searching: Boolean(payload.searching),
  };
}

