export const ADMIN_MENU_SEEN_KEY = 'admin-nav-seen-at';

export const ADMIN_MODULE_PATHS: Record<string, string> = {
  city_packages: '/admin/city-packages',
  users: '/admin/users',
  merchant_stores: '/admin/delivery-stores',
  product_reviews: '/admin/product-reviews',
  merchant_ops: '/admin/merchant-ops',
  after_sales: '/admin/after-sales',
  finance: '/admin/finance',
  tracking: '/admin/tracking',
  settings: '/admin/settings',
  delivery_alerts: '/admin/delivery-alerts',
  banners: '/admin/banners',
  recharges: '/admin/recharges',
  supervision: '/admin/supervision',
  reports: '/admin/reports',
  courier_performance: '/admin/courier-performance',
  merchant_reconciliation: '/admin/merchant-reconciliation',
  metric_management: '/admin/metric-management',
  cross_border_logistics: '/admin/cross-border-logistics',
};

export function moduleIdFromAdminPath(pathname: string): string | null {
  if (pathname === '/admin/realtime-tracking') return 'tracking';
  if (pathname === '/admin/merchant-applications') return 'merchant_stores';
  let found: string | null = null;
  let foundLen = -1;
  for (const [id, base] of Object.entries(ADMIN_MODULE_PATHS)) {
    if (pathname === base || pathname.startsWith(`${base}/`)) {
      if (base.length > foundLen) {
        found = id;
        foundLen = base.length;
      }
    }
  }
  return found;
}

export type AdminTodoCounts = {
  pendingRecharge: number;
  pendingAssignment: number;
  pendingProductReview: number;
  pendingDeliveryAlerts: number;
  pendingMerchantApplications: number;
  overdueMerchantAccept: number;
  watchReviews: number;
  waitingChats: number;
  pendingRefunds: number;
  pendingFinanceCash: number;
  pendingCityOrders: number;
  pendingMerchantAccept: number;
  pendingMerchantReconcile: number;
  pendingCrossBorderExceptions: number;
  pendingUsers: number;
  unseenUsers: number;
  unseenBanners: number;
  unseenAudit: number;
  unseenFinanceRecords: number;
  unseenStores: number;
  unseenMetricDrafts: number;
};

export const emptyAdminTodoCounts: AdminTodoCounts = {
  pendingRecharge: 0,
  pendingAssignment: 0,
  pendingProductReview: 0,
  pendingDeliveryAlerts: 0,
  pendingMerchantApplications: 0,
  overdueMerchantAccept: 0,
  watchReviews: 0,
  waitingChats: 0,
  pendingRefunds: 0,
  pendingFinanceCash: 0,
  pendingCityOrders: 0,
  pendingMerchantAccept: 0,
  pendingMerchantReconcile: 0,
  pendingCrossBorderExceptions: 0,
  pendingUsers: 0,
  unseenUsers: 0,
  unseenBanners: 0,
  unseenAudit: 0,
  unseenFinanceRecords: 0,
  unseenStores: 0,
  unseenMetricDrafts: 0,
};

const SEEN_MODULE_IDS = [
  'users',
  'banners',
  'supervision',
  'finance',
  'merchant_stores',
  'metric_management',
] as const;

type SeenMap = Record<string, string>;

function readSeenMap(): SeenMap {
  try {
    const raw = localStorage.getItem(ADMIN_MENU_SEEN_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SeenMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeSeenMap(map: SeenMap): void {
  try {
    localStorage.setItem(ADMIN_MENU_SEEN_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/** 第一次见到某模块时记下当前时间，避免把历史数据当成「新消息」。 */
export function ensureModuleSeenInitialized(
  moduleIds: readonly string[] = SEEN_MODULE_IDS,
  now = new Date(),
): SeenMap {
  const map = readSeenMap();
  const iso = now.toISOString();
  let changed = false;
  for (const id of moduleIds) {
    if (!map[id]) {
      map[id] = iso;
      changed = true;
    }
  }
  if (changed) writeSeenMap(map);
  return map;
}

export function markModuleSeen(moduleId: string, now = new Date()): void {
  if (!moduleId) return;
  const map = readSeenMap();
  map[moduleId] = now.toISOString();
  writeSeenMap(map);
}

export function afterSalesNoticeCount(c: Pick<AdminTodoCounts, 'watchReviews' | 'waitingChats' | 'pendingRefunds'>): number {
  return c.watchReviews + c.waitingChats + c.pendingRefunds;
}

export function usersNoticeCount(c: Pick<AdminTodoCounts, 'pendingUsers' | 'unseenUsers'>): number {
  return c.pendingUsers + c.unseenUsers;
}

export function merchantStoresNoticeCount(
  c: Pick<AdminTodoCounts, 'pendingMerchantApplications' | 'unseenStores'>,
): number {
  return c.pendingMerchantApplications + c.unseenStores;
}

export function financeNoticeCount(
  c: Pick<AdminTodoCounts, 'pendingFinanceCash' | 'unseenFinanceRecords'>,
): number {
  return c.pendingFinanceCash + c.unseenFinanceRecords;
}

export function merchantOpsNoticeCount(
  c: Pick<AdminTodoCounts, 'pendingMerchantAccept' | 'overdueMerchantAccept'>,
): number {
  if (c.overdueMerchantAccept > 0) return c.overdueMerchantAccept;
  return c.pendingMerchantAccept;
}

export type AdminMenuNoticeTone = 'red' | 'blue' | 'amber';

export type AdminMenuNotice = {
  n: number;
  tone: AdminMenuNoticeTone;
  href: string;
  pulse: boolean;
};

type NoticeSpec = {
  tone: AdminMenuNoticeTone | ((c: AdminTodoCounts) => AdminMenuNoticeTone);
  count: (c: AdminTodoCounts) => number;
  href: (c: AdminTodoCounts) => string;
  pulse?: (c: AdminTodoCounts) => boolean;
};

export const ADMIN_MENU_NOTICES: Record<string, NoticeSpec> = {
  city_packages: {
    tone: 'blue',
    count: (c) => c.pendingCityOrders,
    href: (c) =>
      c.pendingMerchantAccept > 0
        ? '/admin/city-packages?status=待确认'
        : c.pendingCityOrders > 0
          ? '/admin/city-packages?status=待取件'
          : '/admin/city-packages',
    pulse: (c) => c.pendingCityOrders > 0,
  },
  tracking: {
    tone: 'blue',
    count: (c) => c.pendingAssignment,
    href: () => '/admin/tracking',
    pulse: (c) => c.pendingAssignment > 0,
  },
  delivery_alerts: {
    tone: 'red',
    count: (c) => c.pendingDeliveryAlerts,
    href: () => '/admin/delivery-alerts',
    pulse: (c) => c.pendingDeliveryAlerts > 0,
  },
  after_sales: {
    tone: 'amber',
    count: afterSalesNoticeCount,
    href: () => '/admin/after-sales',
    pulse: (c) => afterSalesNoticeCount(c) > 0,
  },
  merchant_stores: {
    tone: 'blue',
    count: merchantStoresNoticeCount,
    href: (c) =>
      c.pendingMerchantApplications > 0
        ? '/admin/merchant-applications'
        : '/admin/delivery-stores',
    pulse: (c) => c.pendingMerchantApplications > 0,
  },
  merchant_ops: {
    tone: (c) => (c.overdueMerchantAccept > 0 ? 'red' : 'amber'),
    count: merchantOpsNoticeCount,
    href: (c) =>
      c.overdueMerchantAccept > 0
        ? '/admin/merchant-ops?tab=overdue'
        : c.pendingMerchantAccept > 0
          ? '/admin/merchant-ops?tab=pending'
          : '/admin/merchant-ops',
    pulse: (c) => c.overdueMerchantAccept > 0,
  },
  product_reviews: {
    tone: 'amber',
    count: (c) => c.pendingProductReview,
    href: () => '/admin/product-reviews',
    pulse: (c) => c.pendingProductReview > 0,
  },
  users: {
    tone: 'amber',
    count: usersNoticeCount,
    href: () => '/admin/users',
    pulse: (c) => usersNoticeCount(c) > 0,
  },
  banners: {
    tone: 'amber',
    count: (c) => c.unseenBanners,
    href: () => '/admin/banners',
  },
  finance: {
    tone: 'amber',
    count: financeNoticeCount,
    href: (c) =>
      c.pendingFinanceCash > 0
        ? '/admin/finance?tab=cash_collection'
        : '/admin/finance',
    pulse: (c) => c.pendingFinanceCash > 0,
  },
  recharges: {
    tone: 'red',
    count: (c) => c.pendingRecharge,
    href: () => '/admin/recharges',
    pulse: (c) => c.pendingRecharge > 0,
  },
  merchant_reconciliation: {
    tone: 'amber',
    count: (c) => c.pendingMerchantReconcile,
    href: () => '/admin/merchant-reconciliation',
    pulse: (c) => c.pendingMerchantReconcile > 0,
  },
  supervision: {
    tone: 'amber',
    count: (c) => c.unseenAudit,
    href: () => '/admin/supervision',
  },
  metric_management: {
    tone: 'amber',
    count: (c) => c.unseenMetricDrafts,
    href: () => '/admin/metric-management',
  },
  cross_border_logistics: {
    tone: 'red',
    count: (c) => c.pendingCrossBorderExceptions,
    href: () => '/admin/cross-border-logistics',
    pulse: (c) => c.pendingCrossBorderExceptions > 0,
  },
};

export function getAdminMenuNotice(
  moduleId: string,
  counts: AdminTodoCounts,
): AdminMenuNotice | null {
  const spec = ADMIN_MENU_NOTICES[moduleId];
  if (!spec) return null;
  const n = spec.count(counts);
  if (n <= 0) return null;
  return {
    n,
    tone: typeof spec.tone === 'function' ? spec.tone(counts) : spec.tone,
    href: spec.href(counts),
    pulse: spec.pulse ? spec.pulse(counts) : n > 0,
  };
}

export function formatMenuBadgeCount(n: number): string {
  if (n > 99) return '99+';
  return String(n);
}
