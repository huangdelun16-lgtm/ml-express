/**
 * 包裹/订单状态（数据库存储的中文值，与骑手端、商家端对齐）。
 * 新逻辑请优先引用此处，避免字面量分散。
 */
export const PACKAGE_STATUS = {
  PENDING_CONFIRM: '待确认',
  PENDING_PICKUP: '待取件',
  PICKED_UP: '已取件',
  PACKING: '打包中',
  IN_TRANSIT: '配送中',
  /** 现金单等：款未收齐前可能显示为待收款，归一化展示时映射为待取件 */
  PENDING_COD: '待收款',
  EXCEPTION: '异常上报',
  DELIVERED: '已送达',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
} as const;

export type PackageStatusZh = (typeof PACKAGE_STATUS)[keyof typeof PACKAGE_STATUS];

/** 英文状态（追踪页兼容） */
export const PACKAGE_STATUS_EN = {
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
} as const;

/** 进行中的状态（用于「活跃订单」筛选） */
export const ACTIVE_PACKAGE_STATUSES: readonly string[] = [
  PACKAGE_STATUS.PENDING_CONFIRM,
  PACKAGE_STATUS.PENDING_PICKUP,
  PACKAGE_STATUS.PICKED_UP,
  PACKAGE_STATUS.PACKING,
  PACKAGE_STATUS.IN_TRANSIT,
  PACKAGE_STATUS.PENDING_COD,
  PACKAGE_STATUS.EXCEPTION,
];

/** 追踪页：可显示骑手实时位置的状态（不含「待确认」） */
export const TRACKING_LIVE_MAP_STATUSES: readonly string[] = [
  PACKAGE_STATUS.PENDING_PICKUP,
  PACKAGE_STATUS.PICKED_UP,
  PACKAGE_STATUS.PACKING,
  PACKAGE_STATUS.IN_TRANSIT,
  PACKAGE_STATUS.PENDING_COD,
  PACKAGE_STATUS.EXCEPTION,
];

/** 列表中排除的终态 */
export const TERMINAL_EXCLUDED_STATUSES: readonly string[] = [
  PACKAGE_STATUS.DELIVERED,
  PACKAGE_STATUS.CANCELLED,
  PACKAGE_STATUS_EN.DELIVERED,
  PACKAGE_STATUS_EN.CANCELLED,
];
