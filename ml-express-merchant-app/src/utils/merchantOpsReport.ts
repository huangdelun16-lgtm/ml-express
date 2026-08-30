export const LOW_STOCK_THRESHOLD = 3;

export const UNFINISHED_STATUSES = ['待确认', '打包中', '待取件', '待收款'] as const;

export type StockAlertLevel = 'out' | 'low';

export type StockAlertItem = {
  productId: string;
  productName: string;
  variantName?: string;
  stock: number;
  level: StockAlertLevel;
};

export type TodayCloseReport = {
  dateKey: string;
  todayOrderCount: number;
  pendingConfirm: number;
  packing: number;
  pendingPickup: number;
  inTransit: number;
  completedToday: number;
  cancelledToday: number;
  unfinishedCount: number;
  todayDeliveryFee: number;
  todayCodAmount: number;
  stockAlerts: StockAlertItem[];
  outOfStockCount: number;
  lowStockCount: number;
};

export type OpsOrder = {
  status?: string | null;
  created_at?: string | null;
  create_time?: string | null;
  delivery_time?: string | null;
  price?: string | number | null;
  cod_amount?: number | null;
};

export type OpsProduct = {
  id: string;
  name: string;
  stock?: number | null;
  variants?: unknown;
};

export function localDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isOnLocalDate(iso?: string | null, dateKey = localDateKey()): boolean {
  if (!iso) return false;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return false;
  return localDateKey(parsed) === dateKey;
}

export function parseMoneyAmount(value?: string | number | null): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  const n = parseFloat(String(value ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function variantRows(product: OpsProduct): Array<{ name: string; stock: number }> {
  const raw = Array.isArray(product.variants) ? product.variants : [];
  const usable = raw.filter((item) => {
    if (!item || typeof item !== 'object') return false;
    const row = item as { name?: string; is_available?: boolean };
    return Boolean(String(row.name || '').trim()) && row.is_available !== false;
  }) as Array<{ name: string; stock?: number; is_available?: boolean }>;
  if (usable.length) {
    return usable.map((row) => ({
      name: String(row.name).trim(),
      stock: Number(row.stock),
    }));
  }
  return [{ name: '', stock: Number(product.stock) }];
}

export function collectStockAlerts(products: OpsProduct[]): StockAlertItem[] {
  const alerts: StockAlertItem[] = [];
  for (const product of products || []) {
    if (!product?.id) continue;
    for (const row of variantRows(product)) {
      if (!Number.isFinite(row.stock) || row.stock < 0) continue;
      const level: StockAlertLevel | null =
        row.stock === 0 ? 'out' : row.stock <= LOW_STOCK_THRESHOLD ? 'low' : null;
      if (!level) continue;
      alerts.push({
        productId: product.id,
        productName: product.name,
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

export function buildTodayCloseReport(input: {
  orders: OpsOrder[];
  products: OpsProduct[];
  now?: Date;
}): TodayCloseReport {
  const dateKey = localDateKey(input.now);
  const orders = input.orders || [];
  const todayOrders = orders.filter((order) =>
    isOnLocalDate(order.created_at || order.create_time, dateKey),
  );
  const unfinished = orders.filter((order) =>
    (UNFINISHED_STATUSES as readonly string[]).includes(String(order.status || '')),
  );
  const stockAlerts = collectStockAlerts(input.products || []);

  return {
    dateKey,
    todayOrderCount: todayOrders.length,
    pendingConfirm: unfinished.filter((order) => order.status === '待确认').length,
    packing: unfinished.filter((order) => order.status === '打包中').length,
    pendingPickup: unfinished.filter(
      (order) => order.status === '待取件' || order.status === '待收款',
    ).length,
    inTransit: orders.filter(
      (order) =>
        order.status === '运输中' ||
        order.status === '配送中' ||
        order.status === '已取件',
    ).length,
    completedToday: orders.filter(
      (order) =>
        (order.status === '已送达' || order.status === '已完成') &&
        isOnLocalDate(order.delivery_time || order.created_at, dateKey),
    ).length,
    cancelledToday: todayOrders.filter((order) => order.status === '已取消').length,
    unfinishedCount: unfinished.length,
    todayDeliveryFee: todayOrders.reduce(
      (sum, order) => sum + parseMoneyAmount(order.price),
      0,
    ),
    todayCodAmount: todayOrders.reduce(
      (sum, order) => sum + (Number(order.cod_amount) || 0),
      0,
    ),
    stockAlerts,
    outOfStockCount: stockAlerts.filter((item) => item.level === 'out').length,
    lowStockCount: stockAlerts.filter((item) => item.level === 'low').length,
  };
}
