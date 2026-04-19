/**
 * 与 ml-express-client-web 及商家端一致的数据库状态字面量。
 * 骑手端新逻辑请引用此处，避免魔法字符串分散。
 */
export const PACKAGE_STATUS = {
  PENDING_CONFIRM: "待确认",
  PENDING_PICKUP: "待取件",
  PICKED_UP: "已取件",
  PACKING: "打包中",
  IN_TRANSIT: "配送中",
  PENDING_COD: "待收款",
  EXCEPTION: "异常上报",
  DELIVERED: "已送达",
  COMPLETED: "已完成",
  CANCELLED: "已取消",
} as const;

export type PackageStatusZh =
  (typeof PACKAGE_STATUS)[keyof typeof PACKAGE_STATUS];

export const PACKAGE_STATUS_EN = {
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
} as const;

/** 进行中的状态（骑手「我的任务」与派单提醒） */
export const ACTIVE_PACKAGE_STATUSES: readonly string[] = [
  PACKAGE_STATUS.PENDING_CONFIRM,
  PACKAGE_STATUS.PENDING_PICKUP,
  PACKAGE_STATUS.PICKED_UP,
  PACKAGE_STATUS.PACKING,
  PACKAGE_STATUS.IN_TRANSIT,
  PACKAGE_STATUS.PENDING_COD,
  PACKAGE_STATUS.EXCEPTION,
];

export const TERMINAL_EXCLUDED_STATUSES: readonly string[] = [
  PACKAGE_STATUS.DELIVERED,
  PACKAGE_STATUS.CANCELLED,
  PACKAGE_STATUS.COMPLETED,
  PACKAGE_STATUS_EN.DELIVERED,
  PACKAGE_STATUS_EN.CANCELLED,
];
