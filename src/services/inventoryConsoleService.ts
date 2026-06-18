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
  warnings?: string[];
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
): Promise<InventoryConsoleData> {
  const url = new URL('/.netlify/functions/inventory-admin-data', window.location.origin);
  url.searchParams.set('packStatus', packStatus);

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
