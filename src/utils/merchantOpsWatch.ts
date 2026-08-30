export const PENDING_ACCEPT_TIMEOUT_MINUTES = 10;
export const LOW_STOCK_THRESHOLD = 3;

export type MerchantOpsWatchTab = 'all' | 'closed' | 'stock' | 'overdue';

export type StockAlertLevel = 'out' | 'low';

export type StockAlertItem = {
  productId: string;
  productName: string;
  variantName?: string;
  stock: number;
  level: StockAlertLevel;
};

export type StoreHoursInput = {
  is_closed_today?: boolean | null;
  vacation_dates?: string[] | null;
  operating_hours?: string | null;
};

export type StoreHoursState = {
  closedToday: boolean;
  onVacation: boolean;
  inHours: boolean;
  shouldBeOpen: boolean;
  hoursLabel: string;
};

export type PendingWatchOrder = {
  id: string;
  createdAt: string;
  ageMs: number;
  overdue: boolean;
  senderName?: string;
};

export type MerchantOpsWatchRow = {
  storeId: string;
  storeName: string;
  storeCode: string;
  region: string;
  storeType: string;
  status: string;
  phone: string;
  managerPhone: string;
  hours: StoreHoursState;
  pending: PendingWatchOrder[];
  overdueCount: number;
  oldestOverdueMs: number | null;
  stockAlerts: StockAlertItem[];
  outOfStockCount: number;
  lowStockCount: number;
};

export type MerchantOpsWatchSummary = {
  closed: number;
  stock: number;
  overdue: number;
  overdueOrders: number;
  outOfStockItems: number;
};

export type OpsProduct = {
  id: string;
  name?: string | null;
  stock?: number | null;
  variants?: unknown;
  is_available?: boolean | null;
  listing_status?: string | null;
};

export function localDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function overdueCutoffIso(
  now = new Date(),
  minutes = PENDING_ACCEPT_TIMEOUT_MINUTES,
): string {
  return new Date(now.getTime() - minutes * 60 * 1000).toISOString();
}

function minutesOfDay(value: string): number | null {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

export function parseOperatingHoursRange(hours?: string | null): { open: string; close: string } {
  const parts = String(hours || '09:00 - 21:00').split(/\s*-\s*/);
  return {
    open: parts[0] || '09:00',
    close: parts[1] || '21:00',
  };
}

export function isWithinOperatingHours(hours: string | null | undefined, now = new Date()): boolean {
  const { open, close } = parseOperatingHoursRange(hours);
  const start = minutesOfDay(open);
  const end = minutesOfDay(close);
  if (start == null || end == null) return true;
  const current = now.getHours() * 60 + now.getMinutes();
  if (start <= end) return current >= start && current <= end;
  return current >= start || current <= end;
}

export function resolveStoreHoursState(store: StoreHoursInput, now = new Date()): StoreHoursState {
  const closedToday = store.is_closed_today === true;
  const today = localDateKey(now);
  const vacations = Array.isArray(store.vacation_dates) ? store.vacation_dates : [];
  const onVacation = vacations.some((d) => String(d || '').trim() === today);
  const inHours = isWithinOperatingHours(store.operating_hours, now);
  return {
    closedToday,
    onVacation,
    inHours,
    shouldBeOpen: !closedToday && !onVacation && inHours,
    hoursLabel: String(store.operating_hours || '09:00 - 21:00').trim() || '09:00 - 21:00',
  };
}

export function isIntentionalClose(hours: StoreHoursState): boolean {
  return hours.closedToday || hours.onVacation;
}

function variantRows(product: OpsProduct): Array<{ name: string; stock: number }> {
  const raw = Array.isArray(product.variants) ? product.variants : [];
  const usable = raw.filter((item) => {
    if (!item || typeof item !== 'object') return false;
    const row = item as { name?: string; is_available?: boolean };
    return Boolean(String(row.name || '').trim()) && row.is_available !== false;
  }) as Array<{ name: string; stock?: number }>;
  if (usable.length) {
    return usable.map((row) => ({
      name: String(row.name).trim(),
      stock: Number(row.stock),
    }));
  }
  return [{ name: '', stock: Number(product.stock) }];
}

/** 与商家关店报表同一套：0 为缺货，≤3 为偏低。 */
export function collectStockAlerts(products: OpsProduct[]): StockAlertItem[] {
  const alerts: StockAlertItem[] = [];
  for (const product of products || []) {
    if (!product?.id) continue;
    if (product.is_available === false) continue;
    if (String(product.listing_status || '').trim() === 'rejected') continue;
    for (const row of variantRows(product)) {
      if (!Number.isFinite(row.stock) || row.stock < 0) continue;
      const level: StockAlertLevel | null =
        row.stock === 0 ? 'out' : row.stock <= LOW_STOCK_THRESHOLD ? 'low' : null;
      if (!level) continue;
      alerts.push({
        productId: product.id,
        productName: String(product.name || '未命名商品'),
        variantName: row.name || undefined,
        stock: row.stock,
        level,
      });
    }
  }
  return alerts.sort((a, b) => {
    if (a.level !== b.level) return a.level === 'out' ? -1 : 1;
    return a.stock - b.stock;
  });
}

export function readCreatedAt(input: { created_at?: string | null; create_time?: string | null }): string {
  return String(input.created_at || input.create_time || '').trim();
}

export function pendingAgeMs(createdAt: string, now = new Date()): number {
  const parsed = new Date(createdAt);
  if (Number.isNaN(parsed.getTime())) return 0;
  return Math.max(0, now.getTime() - parsed.getTime());
}

export function isOverduePending(
  createdAt: string,
  now = new Date(),
  minutes = PENDING_ACCEPT_TIMEOUT_MINUTES,
): boolean {
  return pendingAgeMs(createdAt, now) >= minutes * 60 * 1000;
}

export function formatAgeLabel(ageMs: number): string {
  const totalMinutes = Math.floor(ageMs / 60000);
  if (totalMinutes < 1) return '不到 1 分钟';
  if (totalMinutes < 60) return `${totalMinutes} 分钟`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours} 小时 ${minutes} 分` : `${hours} 小时`;
}

export function buildPendingWatchOrders(
  orders: Array<{
    id?: string | null;
    created_at?: string | null;
    create_time?: string | null;
    sender_name?: string | null;
  }>,
  now = new Date(),
): PendingWatchOrder[] {
  return orders
    .map((order) => {
      const createdAt = readCreatedAt(order);
      const ageMs = pendingAgeMs(createdAt, now);
      return {
        id: String(order.id || '').trim(),
        createdAt,
        ageMs,
        overdue: isOverduePending(createdAt, now),
        senderName: order.sender_name || undefined,
      };
    })
    .filter((order) => order.id)
    .sort((a, b) => b.ageMs - a.ageMs);
}

export function rowHasWatchIssue(row: MerchantOpsWatchRow): boolean {
  return (
    isIntentionalClose(row.hours) ||
    row.overdueCount > 0 ||
    row.outOfStockCount > 0 ||
    row.lowStockCount > 0
  );
}

export function rowMatchesTab(row: MerchantOpsWatchRow, tab: MerchantOpsWatchTab): boolean {
  if (tab === 'closed') return isIntentionalClose(row.hours);
  if (tab === 'stock') return row.outOfStockCount + row.lowStockCount > 0;
  if (tab === 'overdue') return row.overdueCount > 0;
  return rowHasWatchIssue(row);
}

export function filterWatchRows(
  rows: MerchantOpsWatchRow[],
  query: string,
  tab: MerchantOpsWatchTab,
  region?: string,
): MerchantOpsWatchRow[] {
  const q = query.trim().toLowerCase();
  return rows.filter((row) => {
    if (!rowMatchesTab(row, tab)) return false;
    if (region && row.region !== region) return false;
    if (!q) return true;
    const hay = [row.storeName, row.storeCode, row.region, row.phone, row.managerPhone]
      .map((v) => String(v || '').toLowerCase())
      .join(' ');
    return hay.includes(q);
  });
}

export function summarizeWatchRows(rows: MerchantOpsWatchRow[]): MerchantOpsWatchSummary {
  return {
    closed: rows.filter((row) => isIntentionalClose(row.hours)).length,
    stock: rows.filter((row) => row.outOfStockCount + row.lowStockCount > 0).length,
    overdue: rows.filter((row) => row.overdueCount > 0).length,
    overdueOrders: rows.reduce((sum, row) => sum + row.overdueCount, 0),
    outOfStockItems: rows.reduce((sum, row) => sum + row.outOfStockCount, 0),
  };
}

export function sortWatchRows(rows: MerchantOpsWatchRow[]): MerchantOpsWatchRow[] {
  return [...rows].sort((a, b) => {
    if (b.overdueCount !== a.overdueCount) return b.overdueCount - a.overdueCount;
    const aAge = a.oldestOverdueMs || 0;
    const bAge = b.oldestOverdueMs || 0;
    if (bAge !== aAge) return bAge - aAge;
    if (Number(b.hours.closedToday) !== Number(a.hours.closedToday)) {
      return Number(b.hours.closedToday) - Number(a.hours.closedToday);
    }
    if (b.outOfStockCount !== a.outOfStockCount) return b.outOfStockCount - a.outOfStockCount;
    return a.storeName.localeCompare(b.storeName, 'zh');
  });
}
