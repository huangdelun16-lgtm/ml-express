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

export type InventoryConsoleData = {
  ok: boolean;
  at: string;
  transitStores: InventoryTransitStore[];
  stats: InventoryConsoleStats;
  recentPacks: InventoryPackRow[];
  packStatusFilter: string;
  transportFeeTotal?: number;
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
  warnings?: string[];
};

export type StoreFinanceDetailMode = 'ledger' | 'cod' | 'collected' | 'transport';

export async function fetchStoreFinanceDetail(storeCode: string): Promise<StoreFinanceDetail> {
  const url = new URL('/.netlify/functions/inventory-admin-finance', window.location.origin);
  url.searchParams.set('storeCode', storeCode);

  const response = await fetch(url.toString(), {
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

  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || `加载失败 (${response.status})`);
  }

  return payload as InventoryConsoleData;
}

type ConsoleSectionResponse = InventoryConsoleData & {
  section?: string;
  warnings?: string[];
};

async function fetchInventoryConsoleSection(
  section: 'overview' | 'finance' | 'packs',
  packStatus?: PackStatusFilter,
  financePagination?: { page: number; pageSize: number },
): Promise<ConsoleSectionResponse> {
  const url = new URL('/.netlify/functions/inventory-admin-data', window.location.origin);
  url.searchParams.set('section', section);
  if (packStatus) url.searchParams.set('packStatus', packStatus);
  if (financePagination) {
    url.searchParams.set('financePage', String(financePagination.page));
    url.searchParams.set('financePageSize', String(financePagination.pageSize));
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `加载失败 (${response.status})`);
  }
  return payload as ConsoleSectionResponse;
}

export async function fetchInventoryConsoleOverview(): Promise<{
  transitStores: InventoryTransitStore[];
  stats: InventoryConsoleStats;
  transportFeeTotal?: number;
  warnings?: string[];
}> {
  const payload = await fetchInventoryConsoleSection('overview');
  return {
    transitStores: payload.transitStores ?? [],
    stats: payload.stats!,
    transportFeeTotal: payload.transportFeeTotal,
    warnings: payload.warnings,
  };
}

export async function fetchInventoryConsoleFinance(
  financePage = 1,
  financePageSize = 10,
): Promise<{
  transitStores: InventoryTransitStore[];
  crossBorderFinance?: InventoryConsoleData['crossBorderFinance'];
  warnings?: string[];
}> {
  const payload = await fetchInventoryConsoleSection('finance', undefined, {
    page: financePage,
    pageSize: financePageSize,
  });
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
  const response = await fetch('/.netlify/functions/inventory-admin-customers', {
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
): Promise<{
  customerName: string;
  customerPhone: string;
  items: InventoryCustomerExpressItem[];
  warnings?: string[];
}> {
  const url = new URL('/.netlify/functions/inventory-admin-customers', window.location.origin);
  url.searchParams.set('customerName', customerName);
  url.searchParams.set('customerPhone', customerPhone);

  const response = await fetch(url.toString(), {
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

  const response = await fetch(url.toString(), {
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
  const response = await fetch('/.netlify/functions/inventory-admin-update-account', {
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

  const response = await fetch(url.toString(), {
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
  const response = await fetch('/.netlify/functions/inventory-admin-create-account', {
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
  const response = await fetch('/.netlify/functions/inventory-admin-cross-border-entry', {
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
  };
  clearedAt: string;
  message?: string;
};

export async function clearInventoryTestData(
  password: string,
  confirmPhrase: string,
): Promise<InventoryTestDataClearResult> {
  const response = await fetch('/.netlify/functions/inventory-admin-clear-test-data', {
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
