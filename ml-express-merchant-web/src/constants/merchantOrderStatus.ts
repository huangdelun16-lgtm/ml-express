/** 商家端订单状态（与 App / TrackingPage / ProfilePage 口径一致） */
export const MERCHANT_ORDER_STATUS = {
  PENDING_CONFIRM: '待确认',
  PACKING: '打包中',
  PENDING_PICKUP: '待取件',
  PENDING_COD: '待收款',
  PICKED_UP: '已取件',
  IN_TRANSIT: '运输中',
  DELIVERED: '已送达',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
} as const;

export type MerchantOrderStatus =
  (typeof MERCHANT_ORDER_STATUS)[keyof typeof MERCHANT_ORDER_STATUS];

/** 侧栏 / URL 筛选 tab（与 Sidebar、TrackingPage query 一致） */
export type MerchantOrderTabFilter =
  | 'all'
  | typeof MERCHANT_ORDER_STATUS.PENDING_CONFIRM
  | typeof MERCHANT_ORDER_STATUS.PACKING
  | typeof MERCHANT_ORDER_STATUS.PENDING_PICKUP
  | typeof MERCHANT_ORDER_STATUS.IN_TRANSIT
  | typeof MERCHANT_ORDER_STATUS.COMPLETED;

export type MerchantLanguage = 'zh' | 'en' | 'my';

const STATUS_COLORS: Record<string, string> = {
  [MERCHANT_ORDER_STATUS.PENDING_CONFIRM]: '#fbbf24',
  [MERCHANT_ORDER_STATUS.PACKING]: '#10b981',
  [MERCHANT_ORDER_STATUS.PENDING_PICKUP]: '#f59e0b',
  [MERCHANT_ORDER_STATUS.PICKED_UP]: '#3b82f6',
  [MERCHANT_ORDER_STATUS.IN_TRANSIT]: '#8b5cf6',
  [MERCHANT_ORDER_STATUS.DELIVERED]: '#10b981',
  [MERCHANT_ORDER_STATUS.PENDING_COD]: '#ef4444',
  [MERCHANT_ORDER_STATUS.CANCELLED]: '#94a3b8',
  [MERCHANT_ORDER_STATUS.COMPLETED]: '#6b7280',
};

export function getMerchantOrderStatusColor(status: string): string {
  return STATUS_COLORS[status] || '#6b7280';
}

export function getMerchantOrderStatusLabel(
  status: string,
  language: MerchantLanguage,
): string {
  if (status === MERCHANT_ORDER_STATUS.PENDING_COD) {
    return language === 'zh'
      ? '待取件'
      : language === 'en'
        ? 'Pending Pickup'
        : 'ကောက်ယူရန်စောင့်ဆိုင်းနေသည်';
  }
  if (status === MERCHANT_ORDER_STATUS.PENDING_CONFIRM) {
    return language === 'zh'
      ? '待接单'
      : language === 'en'
        ? 'Pending Accept'
        : 'လက်ခံရန်စောင့်ဆိုင်းနေသည်';
  }
  if (status === MERCHANT_ORDER_STATUS.PACKING) {
    return language === 'zh'
      ? '打包中'
      : language === 'en'
        ? 'Packing'
        : 'ထုပ်ပိုးနေသည်';
  }
  if (status === MERCHANT_ORDER_STATUS.CANCELLED) {
    return language === 'zh'
      ? '已取消'
      : language === 'en'
        ? 'Cancelled'
        : 'ပယ်ဖျက်လိုက်သည်';
  }
  return status;
}

/** 列表 tab 筛选（与 ProfilePage 统计、TrackingPage 一致） */
export function filterPackagesByTab<T extends { status: string }>(
  packages: T[],
  tab: string,
): T[] {
  if (tab === 'all') return [...packages];
  if (tab === MERCHANT_ORDER_STATUS.PENDING_PICKUP) {
    return packages.filter(
      (p) =>
        p.status === MERCHANT_ORDER_STATUS.PENDING_PICKUP ||
        p.status === MERCHANT_ORDER_STATUS.PENDING_COD,
    );
  }
  if (tab === MERCHANT_ORDER_STATUS.IN_TRANSIT) {
    return packages.filter(
      (p) =>
        p.status === MERCHANT_ORDER_STATUS.IN_TRANSIT ||
        p.status === MERCHANT_ORDER_STATUS.PICKED_UP,
    );
  }
  if (tab === MERCHANT_ORDER_STATUS.COMPLETED) {
    return packages.filter(
      (p) =>
        p.status === MERCHANT_ORDER_STATUS.DELIVERED ||
        p.status === MERCHANT_ORDER_STATUS.COMPLETED,
    );
  }
  return packages.filter((p) => p.status === tab);
}

export interface MerchantOrderSearchable {
  id?: string;
  sender_name?: string | null;
  sender_phone?: string | null;
  sender_address?: string | null;
  receiver_name?: string | null;
  receiver_phone?: string | null;
  receiver_address?: string | null;
}

function normalizeSearchValue(value: string | null | undefined): string {
  return String(value ?? '').trim().toLowerCase();
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/** 已加载订单上按单号 / 电话 / 姓名 / 地址本地搜索 */
export function filterOrdersBySearch<T extends MerchantOrderSearchable>(
  orders: T[],
  query: string,
): T[] {
  const q = normalizeSearchValue(query);
  if (!q) return [...orders];
  const qDigits = digitsOnly(q);
  return orders.filter((order) => {
    const haystack = [
      order.id,
      order.sender_name,
      order.sender_phone,
      order.sender_address,
      order.receiver_name,
      order.receiver_phone,
      order.receiver_address,
    ].map(normalizeSearchValue);
    if (haystack.some((field) => field.includes(q))) return true;
    if (qDigits.length >= 3) {
      const phoneHaystack = [order.id, order.sender_phone, order.receiver_phone].map(
        (field) => digitsOnly(normalizeSearchValue(field)),
      );
      return phoneHaystack.some((field) => field.includes(qDigits));
    }
    return false;
  });
}

export interface MerchantOrderStats {
  total: number;
  pendingConfirmation: number;
  packing: number;
  pendingPickup: number;
  inTransit: number;
  completed: number;
}

export function computeMerchantOrderStats<T extends { status: string }>(
  packages: T[],
): MerchantOrderStats {
  return {
    total: packages.length,
    pendingConfirmation: packages.filter(
      (p) => p.status === MERCHANT_ORDER_STATUS.PENDING_CONFIRM,
    ).length,
    packing: packages.filter((p) => p.status === MERCHANT_ORDER_STATUS.PACKING)
      .length,
    pendingPickup: packages.filter(
      (p) =>
        p.status === MERCHANT_ORDER_STATUS.PENDING_PICKUP ||
        p.status === MERCHANT_ORDER_STATUS.PENDING_COD,
    ).length,
    inTransit: packages.filter(
      (p) =>
        p.status === MERCHANT_ORDER_STATUS.IN_TRANSIT ||
        p.status === MERCHANT_ORDER_STATUS.PICKED_UP,
    ).length,
    completed: packages.filter(
      (p) =>
        p.status === MERCHANT_ORDER_STATUS.DELIVERED ||
        p.status === MERCHANT_ORDER_STATUS.COMPLETED,
    ).length,
  };
}

export function getMerchantPaymentMethodText(
  paymentMethod: string | undefined,
  language: MerchantLanguage,
  options?: { emptyAsDash?: boolean },
): string {
  if (!paymentMethod) {
    return options?.emptyAsDash
      ? '-'
      : language === 'zh'
        ? '未知'
        : language === 'en'
          ? 'Unknown'
          : 'မသိရှိရ';
  }
  if (paymentMethod === 'qr') {
    return language === 'zh' ? '转账' : language === 'en' ? 'Transfer' : 'ငွေလွှဲ';
  }
  if (paymentMethod === 'cash' || paymentMethod === '现金支付') {
    return language === 'zh' ? '现金支付' : language === 'en' ? 'Cash' : 'ငွေသား';
  }
  if (paymentMethod === 'balance' || paymentMethod === '余额支付') {
    return language === 'zh'
      ? '余额支付'
      : language === 'en'
        ? 'Balance'
        : 'လက်ကျန်ငွေဖြင့် ပေးချေခြင်း';
  }
  return paymentMethod;
}

export function getMerchantPaymentMethodColor(paymentMethod?: string): string {
  if (paymentMethod === 'qr') return 'rgba(34, 197, 94, 0.3)';
  if (paymentMethod === 'cash') return 'rgba(251, 191, 36, 0.3)';
  if (paymentMethod === 'balance') return 'rgba(59, 130, 246, 0.3)';
  return 'rgba(156, 163, 175, 0.3)';
}

export function getMerchantPaymentMethodBorderColor(
  paymentMethod?: string,
): string {
  if (paymentMethod === 'qr') return 'rgba(34, 197, 94, 0.5)';
  if (paymentMethod === 'cash') return 'rgba(251, 191, 36, 0.5)';
  if (paymentMethod === 'balance') return 'rgba(59, 130, 246, 0.5)';
  return 'rgba(156, 163, 175, 0.5)';
}
