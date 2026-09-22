import { describe, expect, it } from "vitest";
import {
  isOpenMerchantOrder,
  summarizeMerchantOrderRows,
} from "./merchantOrderOverview";

describe("summarizeMerchantOrderRows", () => {
  const rows = [
    { status: "待确认", delivery_speed: "急送达" },
    { status: "打包中", delivery_speed: "普通配送" },
    { status: "待收款", delivery_speed: "Urgent" },
    { status: "待取件", delivery_speed: "Standard" },
    { status: "已取件", delivery_speed: "急送达" },
    { status: "配送中", delivery_speed: "普通配送" },
    { status: "运输中", delivery_speed: "急送达" },
    { status: "已送达", delivery_speed: "急送达" },
    { status: "已完成", delivery_speed: "普通配送" },
    { status: "已取消", delivery_speed: "Standard" },
  ];

  it("counts each live status on its own", () => {
    const stats = summarizeMerchantOrderRows(rows);
    expect(stats.pendingConfirm).toBe(1);
    expect(stats.processing).toBe(1);
    expect(stats.awaitingPayment).toBe(1);
    expect(stats.awaitingPickup).toBe(1);
    expect(stats.pickedUp).toBe(1);
    expect(stats.delivering).toBe(1);
    expect(stats.delivered).toBe(1);
    expect(stats.inTransit).toBe(2);
    expect(stats.pending).toBe(3);
  });

  it("counts urgent and standard only while the order is still open", () => {
    const stats = summarizeMerchantOrderRows(rows);
    expect(stats.urgent).toBe(4);
    expect(stats.standard).toBe(3);
  });

  it("treats delivered, completed, and cancelled as closed", () => {
    expect(isOpenMerchantOrder("已送达")).toBe(false);
    expect(isOpenMerchantOrder("已完成")).toBe(false);
    expect(isOpenMerchantOrder("已取消")).toBe(false);
    expect(isOpenMerchantOrder("待收款")).toBe(true);
    expect(isOpenMerchantOrder("")).toBe(false);
  });
});
