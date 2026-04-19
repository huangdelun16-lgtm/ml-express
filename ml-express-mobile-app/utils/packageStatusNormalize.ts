import {
  ACTIVE_PACKAGE_STATUSES,
  PACKAGE_STATUS,
  PACKAGE_STATUS_EN,
} from "../constants/packageStatus";

/**
 * 将数据库/接口返回的状态统一为中文规范值（与 PACKAGE_STATUS 一致）。
 * 兼容英文终态、历史别名（已分配、待派送、配送进行中）。
 */
export function normalizePackageStatusZh(status?: string | null): string {
  if (status == null) return "";
  const t = String(status).trim();
  if (!t) return "";

  if (t === PACKAGE_STATUS_EN.DELIVERED) return PACKAGE_STATUS.DELIVERED;
  if (t === PACKAGE_STATUS_EN.CANCELLED) return PACKAGE_STATUS.CANCELLED;

  if (t.includes("已送达")) return PACKAGE_STATUS.DELIVERED;
  if (t.includes("已取消")) return PACKAGE_STATUS.CANCELLED;
  if (t.includes("已完成")) return PACKAGE_STATUS.COMPLETED;
  if (t.includes("异常上报")) return PACKAGE_STATUS.EXCEPTION;
  if (t.includes("配送进行中") || t.includes("配送中"))
    return PACKAGE_STATUS.IN_TRANSIT;
  if (t.includes("已取件")) return PACKAGE_STATUS.PICKED_UP;
  if (t.includes("待收款")) return PACKAGE_STATUS.PENDING_COD;
  if (t.includes("打包中")) return PACKAGE_STATUS.PACKING;
  if (t.includes("待确认")) return PACKAGE_STATUS.PENDING_CONFIRM;
  if (t.includes("待取件")) return PACKAGE_STATUS.PENDING_PICKUP;
  // 历史/别名字段
  if (t.includes("已分配")) return PACKAGE_STATUS.PENDING_PICKUP;
  if (t.includes("待派送")) return PACKAGE_STATUS.IN_TRANSIT;

  return t;
}

/** 是否属于骑手端「进行中任务」列表（与网站活跃订单一致） */
export function isActiveCourierTaskStatus(normalized: string): boolean {
  return ACTIVE_PACKAGE_STATUSES.includes(normalized);
}

/** 新单指派时是否触发语音/震动（归一化后判断） */
export function shouldAlertCourierOnNewAssignment(
  status?: string | null,
): boolean {
  const s = normalizePackageStatusZh(status);
  return isActiveCourierTaskStatus(s);
}

/** 允许「取件」扫码 / 手动取件流程的状态 */
export function isPickupFlowStatus(normalized: string): boolean {
  return (
    normalized === PACKAGE_STATUS.PENDING_PICKUP ||
    normalized === PACKAGE_STATUS.PENDING_COD
  );
}

/** 到达商家地理围栏提示（可在店外等待打包完成） */
export function isMerchantGeofenceStatus(normalized: string): boolean {
  return (
    normalized === PACKAGE_STATUS.PENDING_PICKUP ||
    normalized === PACKAGE_STATUS.PENDING_COD ||
    normalized === PACKAGE_STATUS.PACKING
  );
}

/**
 * 取件场景：应优先导航至商家/寄件方（含待收款到店收款、打包中等）。
 */
export function isNavigateMerchantFirstPhase(normalized: string): boolean {
  return (
    normalized === PACKAGE_STATUS.PENDING_PICKUP ||
    normalized === PACKAGE_STATUS.PENDING_COD ||
    normalized === PACKAGE_STATUS.PACKING ||
    normalized === PACKAGE_STATUS.PENDING_CONFIRM
  );
}
