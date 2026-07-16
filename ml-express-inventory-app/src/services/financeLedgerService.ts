import { ensureInventoryCloudAuth, type InventoryStoreSession } from './authService';
import type { FinanceLedgerEntry, FinanceLedgerResult } from '../types/financeLedger';
import {
  buildFinanceLedgerEntries,
  buildFinanceLedgerSummary,
  filterCrossBorderFinanceEntries,
  type FinanceDataset,
  type FinanceItemRow,
  type FinanceMovementRow,
  type FinanceOrderRow,
  type FinancePackageRow,
} from '../utils/financeLedgerAggregate';
import { normalizeDestinationCode } from '../utils/destinationCode';
import { ownershipKeyFromStoreCode } from '../utils/storeOwnership';
import { listCrossBorderManualEntries } from './crossBorderManualEntryService';
import { supabase } from './supabase';

function safeCode(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
}

function assertRequestedScope(
  requested: InventoryStoreSession,
  authenticated: InventoryStoreSession,
  hubCode: string,
): { store: InventoryStoreSession; hubCode: string } {
  const requestedHub = normalizeDestinationCode(hubCode);
  const authenticatedHub = normalizeDestinationCode(authenticated.hubCode || authenticated.region);
  if (
    requested.id !== authenticated.id ||
    safeCode(requested.storeCode) !== safeCode(authenticated.storeCode) ||
    !requestedHub ||
    requestedHub !== authenticatedHub
  ) {
    throw new Error('当前登录站点与财务查询范围不一致，请重新登录。');
  }
  return { store: authenticated, hubCode: requestedHub };
}

function throwQueryError(label: string, error: { message?: string } | null): void {
  if (error) throw new Error(`${label}：${error.message || '读取失败'}`);
}

type FinanceQueryPage<T> = {
  data: T[] | null;
  error: { message?: string } | null;
};

async function fetchAllFinancePages<T>(
  label: string,
  fetchPage: (from: number, to: number) => PromiseLike<FinanceQueryPage<T>>,
  pageSize = 250,
): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 0; page < 100; page += 1) {
    const from = page * pageSize;
    const result = await fetchPage(from, from + pageSize - 1);
    throwQueryError(label, result.error);
    const pageRows = result.data ?? [];
    rows.push(...pageRows);
    if (pageRows.length < pageSize) return rows;
  }
  throw new Error(`${label}：记录数量超过安全读取上限，请联系管理员。`);
}

async function loadOrders(packages: FinancePackageRow[]): Promise<FinanceOrderRow[]> {
  const barcodes = [
    ...new Set(packages.map((row) => safeCode(row.pack_barcode)).filter(Boolean)),
  ];
  if (barcodes.length === 0) return [];

  const chunks: string[][] = [];
  for (let index = 0; index < barcodes.length; index += 100) {
    chunks.push(barcodes.slice(index, index + 100));
  }
  const results = await Promise.all(
    chunks.map((chunk) =>
      fetchAllFinancePages<FinanceOrderRow>(
        '订单追踪读取失败',
        (from, to) =>
          supabase
            .from('inventory_order_tracking')
            .select(
              'pack_barcode, order_barcode, order_name, destination_code, inbound_note, inbound_at, recipient_name',
            )
            .in('pack_barcode', chunk)
            .order('inbound_at', { ascending: false })
            .range(from, to),
      ),
    ),
  );
  return results.flat();
}

async function loadMovements(itemIds: string[]): Promise<FinanceMovementRow[]> {
  if (itemIds.length === 0) return [];
  const chunks: string[][] = [];
  for (let index = 0; index < itemIds.length; index += 200) {
    chunks.push(itemIds.slice(index, index + 200));
  }
  const results = await Promise.all(
    chunks.map((chunk) =>
      fetchAllFinancePages<FinanceMovementRow>(
        '库存流水读取失败',
        (from, to) =>
          supabase
            .from('inventory_stock_movements')
            .select(
              'id, item_id, barcode, item_name, type, qty, operator, note, destination, origin_store_code, origin_store_name, recipient_name, created_at',
            )
            .in('item_id', chunk)
            .order('created_at', { ascending: false })
            .range(from, to),
      ),
    ),
  );
  const rows = results.flat();
  return rows.sort(
    (a, b) =>
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
  );
}

async function loadFinanceDataset(
  store: InventoryStoreSession,
  hubCode: string,
): Promise<FinanceDataset> {
  const storeCode = safeCode(store.storeCode);
  const ownerKey = safeCode(ownershipKeyFromStoreCode(storeCode));
  const itemScope = [
    `owner_store_id.eq.${store.id}`,
    `owner_store_code.eq.${storeCode}`,
    ownerKey ? `owner_store_code.ilike.${ownerKey}%` : '',
    `final_destination.eq.${hubCode}`,
    ownerKey ? `final_destination.ilike.${ownerKey}%` : '',
  ]
    .filter(Boolean)
    .join(',');
  const packageScope = [
    `origin_store_id.eq.${store.id}`,
    `origin_store_code.eq.${storeCode}`,
    ownerKey ? `origin_store_code.ilike.${ownerKey}%` : '',
    `leg_destination_code.eq.${hubCode}`,
    ownerKey ? `leg_destination_code.ilike.${ownerKey}%` : '',
    `destination_code.eq.${hubCode}`,
    ownerKey ? `destination_code.ilike.${ownerKey}%` : '',
  ]
    .filter(Boolean)
    .join(',');

  const [items, packages, paidRows, manualEntries] = await Promise.all([
    fetchAllFinancePages<FinanceItemRow>(
      '订单库存读取失败',
      (from, to) =>
        supabase
          .from('inventory_store_items')
          .select('id, barcode, final_destination, recipient_name, customer_signed_at')
          .or(itemScope)
          .order('updated_at', { ascending: false })
          .range(from, to),
    ),
    fetchAllFinancePages<FinancePackageRow>(
      '包裹追踪读取失败',
      (from, to) =>
        supabase
          .from('inventory_pkg_tracking')
          .select(
            'pack_barcode, pack_name, origin_store_code, origin_store_name, destination_code, leg_destination_code, transport_fee, truck_loaded_at, updated_at',
          )
          .or(packageScope)
          .in('status', ['in_transit', 'hub_received', 'completed', 'split_at_hub'])
          .order('updated_at', { ascending: false })
          .range(from, to),
    ),
    fetchAllFinancePages<{ pack_barcode: string }>(
      '车费支付读取失败',
      (from, to) =>
        supabase
          .from('inventory_hub_transport_fee_payments')
          .select('pack_barcode')
          .eq('store_code', storeCode)
          .eq('leg_destination_code', hubCode)
          .range(from, to),
    ),
    listCrossBorderManualEntries(store, hubCode),
  ]);
  const itemIds = items.map((item) => item.id).filter(Boolean);
  const movements = await loadMovements(itemIds);

  const orders = await loadOrders(packages);
  const paidTransportBarcodes = new Set(
    paidRows.map((row) => safeCode(String(row.pack_barcode || ''))),
  );
  return {
    items,
    movements,
    packages,
    orders,
    paidTransportBarcodes,
    manualEntries,
  };
}

/** 只读取 JWT 当前站点拥有或以当前 hub 为目的地的财务数据。 */
export async function listFinanceLedger(
  requestedStore: InventoryStoreSession,
  requestedHubCode: string,
): Promise<FinanceLedgerResult> {
  const authenticated = await ensureInventoryCloudAuth();
  const { store, hubCode } = assertRequestedScope(
    requestedStore,
    authenticated,
    requestedHubCode,
  );
  const dataset = await loadFinanceDataset(store, hubCode);
  const entries: FinanceLedgerEntry[] = buildFinanceLedgerEntries(
    store.storeCode,
    hubCode,
    dataset,
  );
  return {
    entries,
    summary: buildFinanceLedgerSummary(entries, store.storeCode, hubCode),
  };
}

export async function listCrossBorderFinance(
  store: InventoryStoreSession,
  hubCode: string,
): Promise<FinanceLedgerResult> {
  const result = await listFinanceLedger(store, hubCode);
  const entries = filterCrossBorderFinanceEntries(result.entries);
  return {
    entries,
    summary: buildFinanceLedgerSummary(entries, store.storeCode, hubCode, true),
  };
}
