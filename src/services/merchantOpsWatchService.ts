import { supabase } from './supabase';
import {
  buildPendingWatchOrders,
  collectStockAlerts,
  overdueCutoffIso,
  resolveStoreHoursState,
  rowHasWatchIssue,
  sortWatchRows,
  type MerchantOpsWatchRow,
  type OpsProduct,
  type StockAlertItem,
} from '../utils/merchantOpsWatch';

const STORE_SELECT =
  'id, store_name, store_code, region, store_type, status, phone, manager_phone, operating_hours, is_closed_today, vacation_dates';

const STORE_SELECT_FALLBACK =
  'id, store_name, store_code, region, store_type, status, phone, manager_phone, operating_hours, vacation_dates';

type StoreRow = {
  id: string;
  store_name?: string | null;
  store_code?: string | null;
  region?: string | null;
  store_type?: string | null;
  status?: string | null;
  phone?: string | null;
  manager_phone?: string | null;
  operating_hours?: string | null;
  is_closed_today?: boolean | null;
  vacation_dates?: string[] | null;
};

type PendingRow = {
  id: string;
  delivery_store_id?: string | null;
  created_at?: string | null;
  create_time?: string | null;
  sender_name?: string | null;
};

type ProductRow = OpsProduct & { store_id?: string | null };

function missingClosedTodayColumn(error: { message?: string; code?: string } | null): boolean {
  const message = String(error?.message || '');
  return error?.code === 'PGRST204' || message.includes('is_closed_today');
}

async function loadStores(): Promise<StoreRow[]> {
  const first = await supabase
    .from('delivery_stores')
    .select(STORE_SELECT)
    .neq('store_type', 'transit_station')
    .order('store_name', { ascending: true });

  if (!first.error) return (first.data || []) as StoreRow[];
  if (!missingClosedTodayColumn(first.error)) {
    throw new Error(first.error.message || '加载店铺失败');
  }

  const fallback = await supabase
    .from('delivery_stores')
    .select(STORE_SELECT_FALLBACK)
    .neq('store_type', 'transit_station')
    .order('store_name', { ascending: true });
  if (fallback.error) throw new Error(fallback.error.message || '加载店铺失败');
  return (fallback.data || []) as StoreRow[];
}

export async function fetchMerchantOpsWatch(now = new Date()): Promise<MerchantOpsWatchRow[]> {
  const [stores, pendingRes, productsRes] = await Promise.all([
    loadStores(),
    supabase
      .from('packages')
      .select('id, delivery_store_id, created_at, create_time, sender_name')
      .eq('status', '待确认')
      .order('created_at', { ascending: true }),
    supabase
      .from('products')
      .select('id, store_id, name, stock, variants, is_available, listing_status'),
  ]);

  if (pendingRes.error) throw new Error(pendingRes.error.message || '加载待接单失败');
  if (productsRes.error) throw new Error(productsRes.error.message || '加载商品库存失败');

  const pendingRawByStore = new Map<string, PendingRow[]>();
  for (const pkg of (pendingRes.data || []) as PendingRow[]) {
    const storeId = String(pkg.delivery_store_id || '').trim();
    if (!storeId) continue;
    const list = pendingRawByStore.get(storeId) || [];
    list.push(pkg);
    pendingRawByStore.set(storeId, list);
  }

  const productsByStore = new Map<string, OpsProduct[]>();
  for (const product of (productsRes.data || []) as ProductRow[]) {
    const storeId = String(product.store_id || '').trim();
    if (!storeId) continue;
    const list = productsByStore.get(storeId) || [];
    list.push(product);
    productsByStore.set(storeId, list);
  }

  const rows: MerchantOpsWatchRow[] = stores
    .filter((store) => store?.id)
    .map((store) => {
      const pending = buildPendingWatchOrders(pendingRawByStore.get(store.id) || [], now);
      const overdue = pending.filter((item) => item.overdue);
      const stockAlerts: StockAlertItem[] = collectStockAlerts(productsByStore.get(store.id) || []);
      const hours = resolveStoreHoursState(store, now);
      return {
        storeId: store.id,
        storeName: String(store.store_name || '未命名店铺'),
        storeCode: String(store.store_code || ''),
        region: String(store.region || ''),
        storeType: String(store.store_type || ''),
        status: String(store.status || 'active'),
        phone: String(store.phone || ''),
        managerPhone: String(store.manager_phone || ''),
        hours,
        pending,
        overdueCount: overdue.length,
        oldestOverdueMs: overdue[0]?.ageMs ?? null,
        stockAlerts,
        outOfStockCount: stockAlerts.filter((item) => item.level === 'out').length,
        lowStockCount: stockAlerts.filter((item) => item.level === 'low').length,
      };
    })
    .filter(rowHasWatchIssue);

  return sortWatchRows(rows);
}

export async function fetchOverdueMerchantAcceptCount(now = new Date()): Promise<number> {
  const cutoff = overdueCutoffIso(now);
  const { count, error } = await supabase
    .from('packages')
    .select('id', { count: 'exact', head: true })
    .eq('status', '待确认')
    .lt('created_at', cutoff);
  if (error) {
    console.warn('fetchOverdueMerchantAcceptCount:', error.message);
    return 0;
  }
  return count ?? 0;
}
