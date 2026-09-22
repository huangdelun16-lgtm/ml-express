/** 已结束的订单不计入急件/标准。已完成与已送达都视为送达结案。 */
const CLOSED_STATUSES = ["已送达", "已完成", "已取消"] as const;

export function isOpenMerchantOrder(status: string | null | undefined): boolean {
  const value = String(status || "").trim();
  return value.length > 0 && !(CLOSED_STATUSES as readonly string[]).includes(value);
}

export type MerchantOrderStatRow = {
  status?: string | null;
  delivery_speed?: string | null;
};

export type MerchantOrderOverviewStats = {
  total: number;
  pending: number;
  pendingConfirm: number;
  awaitingPayment: number;
  awaitingPickup: number;
  processing: number;
  pickedUp: number;
  delivering: number;
  inTransit: number;
  delivered: number;
  cancelled: number;
  urgent: number;
  standard: number;
};

function countStatus(rows: MerchantOrderStatRow[], status: string): number {
  return rows.filter((row) => row.status === status).length;
}

/** 经营概况：各状态分开计数；急件/标准只统计还没送达、没取消的订单。 */
export function summarizeMerchantOrderRows(
  rows: MerchantOrderStatRow[] | null | undefined,
): MerchantOrderOverviewStats {
  const list = rows || [];
  const open = list.filter((row) => isOpenMerchantOrder(row.status));
  return {
    total: list.length,
    pending: list.filter((row) =>
      ["待确认", "待取件", "待收款"].includes(String(row.status || "")),
    ).length,
    pendingConfirm: countStatus(list, "待确认"),
    awaitingPayment: countStatus(list, "待收款"),
    awaitingPickup: countStatus(list, "待取件"),
    processing: countStatus(list, "打包中"),
    pickedUp: countStatus(list, "已取件"),
    delivering: countStatus(list, "配送中"),
    inTransit: list.filter((row) =>
      ["已取件", "配送中"].includes(String(row.status || "")),
    ).length,
    delivered: countStatus(list, "已送达"),
    cancelled: countStatus(list, "已取消"),
    urgent: open.filter(
      (row) => row.delivery_speed === "急送达" || row.delivery_speed === "Urgent",
    ).length,
    standard: open.filter(
      (row) =>
        row.delivery_speed === "普通配送" || row.delivery_speed === "Standard",
    ).length,
  };
}
