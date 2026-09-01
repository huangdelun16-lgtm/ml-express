import { adminAuthenticatedFetch } from './authService';
import { rewritePublicStorageUrl } from '../utils/supabaseBrowserUrl';
import type { SettlementSnapshot } from '../utils/yangonFinancePeriod';

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
  orderCount: number;
};

export type InventoryCustomerExpressItem = {
  id: string;
  customerName: string;
  customerPhone: string;
  customerKey: string;
  productName: string;
  expressBarcode: string;
  inboundBarcode: string;
  packaging: string;
  origin: string;
  destination: string;
  weight: string;
  weightKg: number;
  qty: number;
  fee: number;
  paymentStatus: string;
  packageStatus: string;
  transportStatus: string;
  paymentLabel: string;
  ownerStoreCode: string;
  inboundAt: string;
  updatedAt: string;
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
  created_at: string;
  photos?: InventoryExceptionConsolePhoto[];
};

export type InventoryConsoleData = {
  ok: boolean;
  at: string;
  transitStores: InventoryTransitStore[];
  stats: InventoryConsoleStats;
  recentPacks: InventoryPackRow[];
  packStatusFilter: string;
  transportFeeTotal?: number;
  openExceptionCount?: number;
  openExceptions?: InventoryExceptionConsoleRow[];
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
  | 'manual_expense';

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
};

export type CrossBorderFinanceSummary = {
  entryCount: number;
  collectedTotal: number;
  transportUnpaidTotal: number;
  transportPaidTotal: number;
  pendingInflowTotal: number;
  transportRegisteredTotal: number;
  agencyPayableTotal?: number;
  agencyRemittedTotal?: number;
  manualIncomeTotal: number;
  manualExpenseTotal: number;
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
};

async function fetchInventoryConsoleSection(
  section: 'overview' | 'finance' | 'packs',
  packStatus?: PackStatusFilter,
  financePagination?: { page: number; pageSize: number },
  period?: FinancePeriodParams | null,
): Promise<ConsoleSectionResponse> {
  const url = new URL('/.netlify/functions/inventory-admin-data', window.location.origin);
  url.searchParams.set('section', section);
  if (packStatus) url.searchParams.set('packStatus', packStatus);
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
  warnings?: string[];
}> {
  const payload = await fetchInventoryConsoleSection('overview');
  return {
    transitStores: payload.transitStores ?? [],
    stats: payload.stats!,
    transportFeeTotal: payload.transportFeeTotal,
    openExceptionCount: payload.openExceptionCount ?? 0,
    openExceptions: mapConsoleExceptionRows(payload.openExceptions),
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
): Promise<{
  recentPacks: InventoryPackRow[];
  packStatusFilter?: string;
  warnings?: string[];
}> {
  const payload = await fetchInventoryConsoleSection('packs', packStatus);
  return {
    recentPacks: payload.recentPacks ?? [],
    packStatusFilter: payload.packStatusFilter,
    warnings: payload.warnings,
  };
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

export const INVENTORY_TEST_DATA_CONFIRM_PHRASE = '清空测试数据';

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

