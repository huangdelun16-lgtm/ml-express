// @ts-nocheck — 从 FinanceManagement 原样搬出的 Tab JSX；类型由父组件工作区承担。
import React from "react";
import { packageService, Package } from "../../services/supabase";
import { feedbackService } from "../../services/FeedbackService";
import {
  REGIONS,
  getLocalDateYYYYMMDD,
  getPackageFinanceDateKey,
  shiftLocalDateYYYYMMDD,
  summarizeRiderCashCollection,
} from "../FinanceManagement.helpers";
import { useFinanceWorkspace } from "./FinanceWorkspace";

const FinanceCashCollectionTab: React.FC = () => {
  const {
    activeTab,
    cashCollectionDate,
    cashDetailDateFilter,
    cashDetailEndDate,
    cashDetailStartDate,
    cashSettlementStatus,
    clearedCashPackages,
    couriers,
    currentRegionPrefix,
    deliveryStores,
    extrasLoading,
    getCashDetailDeliveryLineCashOnly,
    getCashDetailMerchantRiderCodMmk,
    getCashDetailPlatformDeliveryBalanceMmk,
    getCashDetailPlatformItemProductMmk,
    getCashDetailPlatformLineTotal,
    isMobile,
    isRegionalUser,
    language,
    loadRecords,
    packages,
    selectedCashPackages,
    selectedCourier,
    setCashCollectionDate,
    setCashDetailDateFilter,
    setCashDetailEndDate,
    setCashDetailStartDate,
    setCashSettlementStatus,
    setClearedCashPackages,
    setSelectedCashPackages,
    setSelectedCourier,
    setShowCashDetailModal,
    showCashDetailModal,
    showCashSettlementReminder,
    showYesterdayCashUnsettledReminder,
    t,
    width
  } = useFinanceWorkspace();

  return (
    <>
          <div>
            {/* 顶部标题和统计 */}
            <div className="finance-cash-board">
              <div className="finance-cash-board__bar">
                <h3 className="finance-cash-board__title">{t.cashCollection}</h3>
                <div className="finance-cash-board__tools">
                  <div className="finance-cash-date">
                    <button
                      type="button"
                      className="finance-cash-date__nav"
                      onClick={() => {
                        setCashCollectionDate(
                          shiftLocalDateYYYYMMDD(cashCollectionDate, -1),
                        );
                      }}
                      title={t.prevDay}
                    >
                      &lt;
                    </button>
                    <input
                      type="date"
                      value={cashCollectionDate}
                      onChange={(e) => setCashCollectionDate(e.target.value)}
                    />
                    <button
                      type="button"
                      className="finance-cash-date__nav"
                      onClick={() => {
                        setCashCollectionDate(
                          shiftLocalDateYYYYMMDD(cashCollectionDate, 1),
                        );
                      }}
                      title={t.nextDay}
                    >
                      &gt;
                    </button>
                    <button
                      type="button"
                      className="finance-cash-date__today"
                      onClick={() =>
                        setCashCollectionDate(getLocalDateYYYYMMDD())
                      }
                    >
                      {t.today}
                    </button>
                  </div>

                  <div className="finance-cash-filter">
                    <span className="finance-cash-filter__label">
                      {t.statusFilter}
                      {showYesterdayCashUnsettledReminder && (
                        <span
                          title={t.cashYesterdayUnsettledReminder}
                          className="finance-cash-filter__dot finance-cash-filter__dot--yesterday"
                          aria-hidden
                        />
                      )}
                      {showCashSettlementReminder && (
                        <span
                          title={t.cashSettlementReminder}
                          className="finance-cash-filter__dot finance-cash-filter__dot--today"
                          aria-hidden
                        />
                      )}
                    </span>
                    <select
                      value={cashSettlementStatus}
                      onChange={(e) =>
                        setCashSettlementStatus(e.target.value as any)
                      }
                    >
                      <option value="unsettled">{t.unsettled}</option>
                      <option value="settled">{t.settled}</option>
                      <option value="all">{t.all}</option>
                    </select>
                  </div>
                </div>
              </div>

              {showYesterdayCashUnsettledReminder && (
                <div
                  role="status"
                  className="finance-cash-alert finance-cash-alert--yesterday"
                >
                  {t.cashYesterdayUnsettledReminder}
                </div>
              )}

              {showCashSettlementReminder && (
                <div
                  role="status"
                  className="finance-cash-alert finance-cash-alert--today"
                >
                  {t.cashSettlementReminder}
                </div>
              )}

              {(() => {
                const board = summarizeRiderCashCollection({
                  packages,
                  selectedDate: cashCollectionDate,
                  settlementStatus: cashSettlementStatus,
                  stores: deliveryStores,
                  regionPrefix: isRegionalUser
                    ? currentRegionPrefix
                    : undefined,
                  getPlatformLineTotal: getCashDetailPlatformLineTotal,
                });

                return (
                  <div className="finance-cash-metrics">
                    <div className="finance-cash-metric finance-cash-metric--cash">
                      <div className="finance-cash-metric__label">
                        {language === "zh"
                          ? "当日现金"
                          : language === "en"
                            ? "Cash today"
                            : "ယနေ့ ငွေသား"}
                      </div>
                      <div className="finance-cash-metric__value">
                        {board.selectedDayCashMmk.toLocaleString()} MMK
                      </div>
                      <div className="finance-cash-metric__hint">
                        {language === "zh"
                          ? "所选日现金跑腿 + 现金代收，不含平台支付"
                          : language === "en"
                            ? "Selected-day cash fee + cash COD, excl. platform"
                            : "ရွေးထားသည့်နေ့ ငွေသားပို့ဆောင်+ကိုယ်စားကောက် (ပလက်ဖောင်းမပါ)"}
                      </div>
                    </div>

                    <div className="finance-cash-metric finance-cash-metric--overdue">
                      <div className="finance-cash-metric__label">
                        {t.riderPriorUnsettled}
                      </div>
                      <div className="finance-cash-metric__value">
                        {board.overdueCashMmk.toLocaleString()} MMK
                      </div>
                      <div className="finance-cash-metric__hint">
                        {language === "zh"
                          ? `${board.overduePackages.length} 单所选日之前仍未交账`
                          : language === "en"
                            ? `${board.overduePackages.length} bills still open before the selected day`
                            : `ရွေးထားသည့်နေ့မတိုင်မီ ${board.overduePackages.length} ခု မရှင်းရသေး`}
                      </div>
                    </div>

                    <div className="finance-cash-metric finance-cash-metric--platform">
                      <div className="finance-cash-metric__label">
                        {language === "my"
                          ? "စုစုပေါင်း ပလက်ဖောင်းမှပေးချေမှု"
                          : "总平台支付"}
                      </div>
                      <div className="finance-cash-metric__value">
                        {board.selectedDayPlatformMmk.toLocaleString()} MMK
                      </div>
                      <div className="finance-cash-metric__hint">
                        {language === "my"
                          ? "လက်ကျန်ငွေဖြင့် ပေးချေခြင်း"
                          : "余额支付汇总"}
                      </div>
                    </div>

                    <div className="finance-cash-metric finance-cash-metric--riders">
                      <div className="finance-cash-metric__label">
                        {t.totalCourierCount}
                      </div>
                      <div className="finance-cash-metric__value">
                        {couriers.length}
                      </div>
                      <div className="finance-cash-metric__hint">
                        {language === "zh"
                          ? "当前在册骑手"
                          : language === "en"
                            ? "Registered riders"
                            : "မှတ်ပုံတင်ထားသော စီးနင်းသူ"}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* 快递员列表 */}
            {(() => {
              let displayCouriers = [...couriers];
              if (isRegionalUser) {
                displayCouriers = displayCouriers.filter(
                  (c) =>
                    c.employee_id &&
                    c.employee_id.startsWith(currentRegionPrefix),
                );
              }

              if (displayCouriers.length === 0) {
                return (
                  <div className="finance-cash-empty">暂无快递员数据</div>
                );
              }

              const regionPrefix = isRegionalUser
                ? currentRegionPrefix
                : undefined;

              const breakdowns = displayCouriers.map((courier) => {
                const courierName = courier.name || "未知";
                return {
                  courier,
                  courierName,
                  board: summarizeRiderCashCollection({
                    packages,
                    selectedDate: cashCollectionDate,
                    settlementStatus: cashSettlementStatus,
                    stores: deliveryStores,
                    regionPrefix,
                    courierName,
                    getPlatformLineTotal: getCashDetailPlatformLineTotal,
                  }),
                };
              });

              breakdowns.sort((a, b) => {
                if (a.board.overdueCashMmk !== b.board.overdueCashMmk) {
                  return b.board.overdueCashMmk - a.board.overdueCashMmk;
                }
                const aDue =
                  a.board.selectedDayCashMmk + a.board.overdueCashMmk;
                const bDue =
                  b.board.selectedDayCashMmk + b.board.overdueCashMmk;
                return bDue - aDue;
              });

              return (
                <div className="finance-cash-riders">
                  {breakdowns.map(({ courier, courierName, board }) => {
                    const employeeId = courier.employee_id || "无";
                    const hasOverdue = board.overdueCashMmk > 0;
                    const hasTodayDue =
                      cashSettlementStatus !== "settled" &&
                      board.selectedDayCashMmk > 0;
                    const hasPackages =
                      board.selectedDayPackages.length > 0 ||
                      board.overduePackages.length > 0;
                    const regionLabel = (() => {
                      const r = REGIONS.find(
                        (reg) =>
                          reg.id === courier.region ||
                          reg.prefix === courier.region,
                      );
                      return r ? r.prefix : courier.region || "-";
                    })();

                    return (
                      <div
                        key={courier.id}
                        className={`finance-cash-rider${hasOverdue ? " has-overdue" : ""}`}
                      >
                        <div className="finance-cash-rider__who">
                          <div className="finance-cash-rider__avatar">
                            {courier.vehicle_type === "car" ? "🚗" : "🏍️"}
                          </div>
                          <div>
                            <h4 className="finance-cash-rider__name">
                              {courierName}
                            </h4>
                            <div className="finance-cash-rider__meta">
                              <span className="finance-cash-rider__id">
                                #{employeeId}
                              </span>
                              <span className="finance-cash-rider__region">
                                {regionLabel}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="finance-cash-rider__metrics">
                          <div className="finance-cash-rider__cash">
                            <div className="finance-cash-rider__cash-label">
                              {t.riderCollection}
                            </div>
                            <div
                              className={`finance-cash-rider__cash-value${hasTodayDue ? " is-due" : ""}`}
                            >
                              {board.selectedDayCashMmk.toLocaleString()} MMK
                              <span className="finance-cash-rider__cash-count">
                                {board.selectedDayPackages.length}{" "}
                                {t.packageSuffix}
                              </span>
                            </div>
                          </div>
                          <div className="finance-cash-rider__cash">
                            <div className="finance-cash-rider__cash-label">
                              {t.riderPriorUnsettled}
                            </div>
                            <div
                              className={`finance-cash-rider__cash-value${hasOverdue ? " is-due" : ""}`}
                            >
                              {board.overdueCashMmk.toLocaleString()} MMK
                              <span className="finance-cash-rider__cash-count">
                                {board.overduePackages.length} {t.packageSuffix}
                              </span>
                            </div>
                          </div>
                          <div className="finance-cash-rider__cash">
                            <div className="finance-cash-rider__cash-label">
                              {t.riderDayPlatform}
                            </div>
                            <div className="finance-cash-rider__cash-value">
                              {board.selectedDayPlatformMmk.toLocaleString()} MMK
                            </div>
                          </div>
                        </div>

                        <div className="finance-cash-rider__actions">
                          <div
                            className={`finance-cash-rider__status${
                              courier.status === "active" ? " is-on" : " is-off"
                            }`}
                          >
                            <span
                              className="finance-cash-rider__status-dot"
                              aria-hidden
                            />
                            {courier.status === "active" ? t.online : t.offline}
                          </div>

                          <button
                            type="button"
                            className={`finance-cash-rider__detail${
                              hasPackages ? " is-ready" : " is-empty"
                            }`}
                            disabled={!hasPackages}
                            onClick={() => {
                              const startDate =
                                board.earliestOverdueDate ||
                                cashCollectionDate;
                              setSelectedCourier(courierName);
                              setShowCashDetailModal(true);
                              setCashDetailDateFilter("custom");
                              setCashDetailStartDate(startDate);
                              setCashDetailEndDate(cashCollectionDate);
                              setSelectedCashPackages(new Set());
                              setClearedCashPackages(new Set());
                            }}
                          >
                            {t.viewDetail}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

        {/* 现金收款详情弹窗 */}
        {showCashDetailModal && selectedCourier && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.75)",
              backdropFilter: "blur(8px)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000,
              padding: isMobile ? "16px" : "20px",
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowCashDetailModal(false);
              }
            }}
          >
            <div
              style={{
                background:
                  "#ffffff",
                borderRadius: "20px",
                padding: 0,
                border: "1px solid #f1f5f9",
                boxShadow: "0 25px 50px rgba(0, 0, 0, 0.5)",
                maxWidth: "900px",
                width: "100%",
                maxHeight: "90vh",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 弹窗头部 */}
              <div
                style={{
                  background:
                    "linear-gradient(135deg, #f1f5f9 0%, #f8fafc 100%)",
                  padding: "24px",
                  borderBottom: "1px solid #e2e8f0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: "1.5rem",
                      fontWeight: 700,
                      color: "#0f172a",
                    }}
                  >
                    💵 {selectedCourier} - 现金收款详情
                  </h2>
                  <p
                    style={{
                      margin: "8px 0 0 0",
                      fontSize: "0.9rem",
                      color: "#334155",
                    }}
                  >
                    有往日未结时，日期会自动扩到最早未结日，避免漏结。也可改区间或选「全部」。
                  </p>
                  <p
                    style={{
                      margin: "10px 0 0 0",
                      fontSize: "0.78rem",
                      color: "#64748b",
                      lineHeight: 1.45,
                      maxWidth: "640px",
                    }}
                  >
                    说明：总跑腿费为「现金代收」的跑腿；余额/二维码
                    单的跑腿与商品余额费（或描述中余额/平台/付给商家: MMK
                    标签）计入总平台支付。「总代收款（现金）」仅计现金支付单上商家填写的骑手代收；
                    客户端 web/app 订单为余额支付，不计入。已结清的不列入。
                  </p>
                </div>
                <button
                  onClick={() => setShowCashDetailModal(false)}
                  style={{
                    background: "#f1f5f9",
                    color: "#0f172a",
                    border: "1px solid #e2e8f0",
                    padding: "8px 16px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontSize: "1rem",
                    fontWeight: "bold",
                    transition: "all 0.3s ease",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background =
                      "#e2e8f0";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background =
                      "#f1f5f9";
                  }}
                >
                  ✕
                </button>
              </div>

              {/* 弹窗内容 */}
              <div
                style={{
                  padding: "24px",
                  overflowY: "auto",
                  flex: 1,
                }}
              >
                {/* 日期筛选 */}
                <div
                  style={{
                    background: "#f8fafc",
                    borderRadius: "12px",
                    padding: "16px",
                    marginBottom: "20px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div
                    style={{
                      color: "#0f172a",
                      fontSize: "0.9rem",
                      marginBottom: "12px",
                      fontWeight: "600",
                    }}
                  >
                    日期筛选
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <select
                      value={cashDetailDateFilter}
                      onChange={(e) => {
                        setCashDetailDateFilter(e.target.value);
                        if (e.target.value !== "custom") {
                          setCashDetailStartDate("");
                          setCashDetailEndDate("");
                        }
                      }}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                        background: "#ffffff",
                        color: "#0f172a",
                        fontSize: "0.9rem",
                        minWidth: "120px",
                      }}
                    >
                      <option value="all">全部</option>
                      <option value="7days">最近7天</option>
                      <option value="30days">最近30天</option>
                      <option value="90days">最近90天</option>
                      <option value="custom">自定义</option>
                    </select>
                    {cashDetailDateFilter === "custom" && (
                      <>
                        <input
                          type="date"
                          value={cashDetailStartDate}
                          onChange={(e) =>
                            setCashDetailStartDate(e.target.value)
                          }
                          style={{
                            padding: "8px 12px",
                            borderRadius: "8px",
                            border: "1px solid #e2e8f0",
                            background: "#ffffff",
                            color: "#0f172a",
                            fontSize: "0.9rem",
                          }}
                        />
                        <span style={{ color: "#334155" }}>
                          至
                        </span>
                        <input
                          type="date"
                          value={cashDetailEndDate}
                          onChange={(e) => setCashDetailEndDate(e.target.value)}
                          style={{
                            padding: "8px 12px",
                            borderRadius: "8px",
                            border: "1px solid #e2e8f0",
                            background: "#ffffff",
                            color: "#0f172a",
                            fontSize: "0.9rem",
                          }}
                        />
                      </>
                    )}
                  </div>
                </div>

                {/* 包裹列表 */}
                {(() => {
                  const courierMatch = (c: string | undefined, sel: string) =>
                    String(c || "").trim() === String(sel || "").trim();

                  let filteredPackages = packages.filter(
                    (pkg) =>
                      courierMatch(pkg.courier, selectedCourier || "") &&
                      (pkg.status === "已送达" || pkg.status === "已完成"),
                  );

                  // 日期筛选
                  if (cashDetailDateFilter !== "all") {
                    const now = new Date();
                    let startDate: Date | null = null;

                    if (cashDetailDateFilter === "custom") {
                      if (cashDetailStartDate) {
                        startDate = new Date(cashDetailStartDate);
                        startDate.setHours(0, 0, 0, 0);
                      }
                      const endDate = cashDetailEndDate
                        ? new Date(cashDetailEndDate)
                        : null;
                      if (endDate) {
                        endDate.setHours(23, 59, 59, 999);
                      }

                      filteredPackages = filteredPackages.filter((pkg) => {
                        const deliveryValue =
                          pkg.delivery_time ||
                          pkg.updated_at ||
                          pkg.created_at ||
                          pkg.create_time;
                        if (!deliveryValue) return false;
                        const deliveryDate = new Date(deliveryValue);
                        if (Number.isNaN(deliveryDate.getTime())) return false;
                        if (startDate && deliveryDate < startDate) return false;
                        if (endDate && deliveryDate > endDate) return false;
                        return true;
                      });
                    } else {
                      const days =
                        cashDetailDateFilter === "7days"
                          ? 7
                          : cashDetailDateFilter === "30days"
                            ? 30
                            : 90;
                      startDate = new Date(
                        now.getTime() - days * 24 * 60 * 60 * 1000,
                      );
                      startDate.setHours(0, 0, 0, 0);

                      filteredPackages = filteredPackages.filter((pkg) => {
                        const deliveryValue =
                          pkg.delivery_time ||
                          pkg.updated_at ||
                          pkg.created_at ||
                          pkg.create_time;
                        if (!deliveryValue) return false;
                        const deliveryDate = new Date(deliveryValue);
                        if (Number.isNaN(deliveryDate.getTime())) return false;
                        return deliveryDate >= startDate!;
                      });
                    }
                  }

                  if (filteredPackages.length === 0) {
                    return (
                      <div
                        style={{
                          background: "#f8fafc",
                          borderRadius: "12px",
                          padding: "60px 20px",
                          textAlign: "center",
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <div style={{ fontSize: "3rem", marginBottom: "16px" }}>
                          📦
                        </div>
                        <div
                          style={{
                            color: "#334155",
                            fontSize: "1.1rem",
                          }}
                        >
                          该时间段内暂无该骑手的已送达订单
                        </div>
                      </div>
                    );
                  }

                  // 与「当日收款管理」结清筛选项一致（未结清 / 已结清 / 全部），并排除本弹窗内已点结清
                  const visiblePackages = filteredPackages.filter((pkg) => {
                    if (clearedCashPackages.has(pkg.id)) return false;
                    if (cashSettlementStatus === "unsettled" && pkg.rider_settled)
                      return false;
                    if (cashSettlementStatus === "settled" && !pkg.rider_settled)
                      return false;
                    return true;
                  });

                  let visibleDeliveryFee = 0;
                  let visibleCOD = 0;
                  let visiblePlatformPayment = 0;
                  let visiblePlatformItemProduct = 0;
                  let visiblePlatformDeliveryBalance = 0;

                  visiblePackages.forEach((pkg) => {
                    visibleDeliveryFee += getCashDetailDeliveryLineCashOnly(pkg);
                    visibleCOD += getCashDetailMerchantRiderCodMmk(pkg);
                    visiblePlatformPayment += getCashDetailPlatformLineTotal(pkg);
                    visiblePlatformItemProduct +=
                      getCashDetailPlatformItemProductMmk(pkg);
                    visiblePlatformDeliveryBalance +=
                      getCashDetailPlatformDeliveryBalanceMmk(pkg);
                  });

                  const visibleTotalAmount =
                    visibleDeliveryFee + visibleCOD;

                  // 检查是否全选
                  const allSelected =
                    visiblePackages.length > 0 &&
                    visiblePackages.every((pkg) =>
                      selectedCashPackages.has(pkg.id),
                    );

                  // 全选/取消全选处理
                  const handleSelectAll = () => {
                    if (allSelected) {
                      // 取消全选
                      setSelectedCashPackages(new Set());
                    } else {
                      // 全选
                      const allIds = new Set(
                        visiblePackages.map((pkg) => pkg.id),
                      );
                      setSelectedCashPackages(allIds);
                    }
                  };

                  // 全部结清处理
                  const handleClearAll = async () => {
                    if (selectedCashPackages.size === 0) {
                      feedbackService.notify("请先选择要结清的包裹");
                      return;
                    }
                    if (
                      window.confirm(
                        `确定要结清 ${selectedCashPackages.size} 个包裹吗？\n这将标记这些包裹的现金已上缴。`,
                      )
                    ) {
                      const ids = Array.from(selectedCashPackages);
                      const result = await packageService.settleRiderCash(ids);

                      if (result.success) {
                        setClearedCashPackages((prev) => {
                          const newSet = new Set(prev);
                          selectedCashPackages.forEach((id) => newSet.add(id));
                          return newSet;
                        });
                        setSelectedCashPackages(new Set());
                        // 重新加载数据，确保状态同步
                        loadRecords();
                      } else {
                        feedbackService.notify("结清失败，请重试");
                      }
                    }
                  };

                  return (
                    <>
                      {/* 统计信息 */}
                      <div style={{ marginBottom: "20px" }}>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: isMobile
                              ? "1fr"
                              : "repeat(3, 1fr)",
                            gap: "12px",
                            marginBottom: "16px",
                          }}
                        >
                          {/* 总跑腿费 */}
                          <div
                            style={{
                              background: "rgba(254, 243, 199, 0.2)",
                              borderRadius: "12px",
                              padding: "16px",
                              border: "1px solid rgba(254, 243, 199, 0.3)",
                            }}
                          >
                            <div
                              style={{
                                color: "#92400e",
                                fontSize: "0.9rem",
                                fontWeight: 600,
                                marginBottom: "4px",
                              }}
                            >
                              总跑腿费（现金代收）
                            </div>
                            <div
                              style={{
                                color: "#0f172a",
                                fontSize: "1.4rem",
                                fontWeight: "bold",
                              }}
                            >
                              {visibleDeliveryFee.toLocaleString()} MMK
                            </div>
                            <div
                              style={{
                                color: "#334155",
                                fontSize: "0.8rem",
                                marginTop: "4px",
                              }}
                            >
                              未结清 {visiblePackages.length} 单 ·
                              余额类跑腿在「总平台支付」
                            </div>
                          </div>

                          {/* 总代收款（现金） */}
                          <div
                            style={{
                              background: "rgba(254, 202, 202, 0.2)",
                              borderRadius: "12px",
                              padding: "16px",
                              border: "1px solid rgba(254, 202, 202, 0.3)",
                            }}
                          >
                            <div
                              style={{
                                color: "#b91c1c",
                                fontSize: "0.9rem",
                                fontWeight: 600,
                                marginBottom: "4px",
                              }}
                            >
                              {language === "zh"
                                ? "总代收款（现金）"
                                : language === "en"
                                  ? "Total collection (Cash)"
                                  : "စုစုပေါင်း ကိုယ်စားကောက် (ငွေသားသာ)"}
                            </div>
                            <div
                              style={{
                                color: "#0f172a",
                                fontSize: "1.4rem",
                                fontWeight: "bold",
                              }}
                            >
                              {visibleCOD.toLocaleString()} MMK
                            </div>
                            <div
                              style={{
                                color: "#334155",
                                fontSize: "0.8rem",
                                marginTop: "4px",
                              }}
                            >
                              {language === "zh"
                                ? "仅现金支付、商家要骑手面收；C 端/APP 余额单不计入"
                                : language === "en"
                                  ? "Cash & merchant-rider only; client balance N/A"
                                  : "ဆိုင် ငွေသားကောက်ခံကိုယ်စားကောက် (ငွေသားသာ)"}
                            </div>
                          </div>

                          {/* 总现金（未结清） */}
                          <div
                            style={{
                              background: "rgba(191, 219, 254, 0.2)",
                              borderRadius: "12px",
                              padding: "16px",
                              border: "1px solid rgba(191, 219, 254, 0.3)",
                            }}
                          >
                            <div
                              style={{
                                color: "#1d4ed8",
                                fontSize: "0.9rem",
                                fontWeight: 600,
                                marginBottom: "4px",
                              }}
                            >
                              {language === "zh"
                                ? "总现金（未结清）"
                                : language === "en"
                                  ? "Total cash (unsettled)"
                                  : "စုစုပေါင်း ငွေသား (မရှင်းရသေးပါ)"}
                            </div>
                            <div
                              style={{
                                color: "#0f172a",
                                fontSize: "1.4rem",
                                fontWeight: "bold",
                              }}
                            >
                              {visibleTotalAmount.toLocaleString()} MMK
                            </div>
                            <div
                              style={{
                                color: "#64748b",
                                fontSize: "0.75rem",
                                marginTop: "6px",
                              }}
                            >
                              {language === "zh"
                                ? "现金跑腿 + 代收款（现金），不含总平台支付"
                                : language === "en"
                                  ? "Cash delivery fee + cash COD, excl. platform"
                                  : "ငွေသားပို့ဆောင်+ငွေသားကိုယ်စားကောက် (ပလက်ဖောင်း မပါ)"}
                            </div>
                          </div>

                          {/* 商品费（余额支付）— 与总平台拆分明细之一 */}
                          <div
                            style={{
                              background: "rgba(52, 211, 153, 0.12)",
                              borderRadius: "12px",
                              padding: "16px",
                              border: "1px solid rgba(52, 211, 153, 0.28)",
                            }}
                          >
                            <div
                              style={{
                                color: "#047857",
                                fontSize: "0.9rem",
                                fontWeight: 600,
                                marginBottom: "4px",
                              }}
                            >
                              {language === "zh"
                                ? "商品费（余额支付）"
                                : language === "en"
                                  ? "Item (balance pay)"
                                  : "ကုန်ပစ္စည်းခ (လက်ကျန်ငွေ)"}
                            </div>
                            <div
                              style={{
                                color: "#0f172a",
                                fontSize: "1.4rem",
                                fontWeight: "bold",
                              }}
                            >
                              {visiblePlatformItemProduct.toLocaleString()} MMK
                            </div>
                            <div
                              style={{
                                color: "#64748b",
                                fontSize: "0.75rem",
                                marginTop: "6px",
                              }}
                            >
                              {language === "zh"
                                ? "描述中「商品费用(仅余额)」+ 有标签时扣入部分"
                                : language === "en"
                                  ? "From 商品(余额) in description (split)"
                                  : "ကုန်ပစ္စည်းခ စာတန်းမှ တို့ခြင်း"}
                            </div>
                          </div>

                          {/* 跑腿费（余额支付）— 与总平台拆分明细之二 */}
                          <div
                            style={{
                              background: "rgba(45, 212, 191, 0.12)",
                              borderRadius: "12px",
                              padding: "16px",
                              border: "1px solid rgba(45, 212, 191, 0.28)",
                            }}
                          >
                            <div
                              style={{
                                color: "#0f766e",
                                fontSize: "0.9rem",
                                fontWeight: 600,
                                marginBottom: "4px",
                              }}
                            >
                              {language === "zh"
                                ? "跑腿费（余额支付）"
                                : language === "en"
                                  ? "Delivery fee (balance pay)"
                                  : "ပို့ဆောင်ခ (လက်ကျန်ငွေ)"}
                            </div>
                            <div
                              style={{
                                color: "#0f172a",
                                fontSize: "1.4rem",
                                fontWeight: "bold",
                              }}
                            >
                              {visiblePlatformDeliveryBalance.toLocaleString()}{" "}
                              MMK
                            </div>
                            <div
                              style={{
                                color: "#64748b",
                                fontSize: "0.75rem",
                                marginTop: "6px",
                              }}
                            >
                              {language === "zh"
                                ? "非现金 price + 标签总额中剩余部分"
                                : language === "en"
                                  ? "Non-cash price + remainder of tag"
                                  : "ငွေသားမဟုတ် price + ကျန်ကွာကျား"}
                            </div>
                          </div>

                          {/* 总平台支付 (余额支付) */}
                          <div
                            style={{
                              background: "rgba(167, 243, 208, 0.2)",
                              borderRadius: "12px",
                              padding: "16px",
                              border: "1px solid rgba(167, 243, 208, 0.3)",
                            }}
                          >
                            <div
                              style={{
                                color: "#047857",
                                fontSize: "0.9rem",
                                fontWeight: 600,
                                marginBottom: "4px",
                              }}
                            >
                              总平台支付 (余额支付)
                            </div>
                            <div
                              style={{
                                color: "#0f172a",
                                fontSize: "1.4rem",
                                fontWeight: "bold",
                              }}
                            >
                              {visiblePlatformPayment.toLocaleString()} MMK
                            </div>
                            <div
                              style={{
                                color: "#64748b",
                                fontSize: "0.75rem",
                                marginTop: "6px",
                              }}
                            >
                              {language === "zh"
                                ? "= 上两项之和（同一口径）"
                                : language === "en"
                                  ? "= product + delivery (split)"
                                  : "အထက် ၂ချိုင် ပေါင်းလဒ် နှင့် တူညီသည်"}
                            </div>
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: "10px",
                            alignItems: "center",
                            flexWrap: "wrap",
                            justifyContent: "flex-end",
                          }}
                        >
                          {/* 全选图标 */}
                          <button
                            onClick={handleSelectAll}
                            style={{
                              background: allSelected
                                ? "rgba(59, 130, 246, 0.3)"
                                : "#f1f5f9",
                              border: `2px solid ${allSelected ? "#3b82f6" : "#e2e8f0"}`,
                              borderRadius: "8px",
                              padding: "8px 12px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              transition: "all 0.3s ease",
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.background = allSelected
                                ? "rgba(59, 130, 246, 0.4)"
                                : "#f1f5f9";
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.background = allSelected
                                ? "rgba(59, 130, 246, 0.3)"
                                : "#f1f5f9";
                            }}
                          >
                            <span style={{ fontSize: "1.2rem" }}>
                              {allSelected ? "☑️" : "☐"}
                            </span>
                            <span
                              style={{
                                color: "#0f172a",
                                fontSize: "0.85rem",
                                fontWeight: "600",
                              }}
                            >
                              {allSelected ? "取消全选" : "全选"}
                            </span>
                          </button>

                          {/* 全部结清按钮 */}
                          <button
                            onClick={handleClearAll}
                            disabled={selectedCashPackages.size === 0}
                            style={{
                              background:
                                selectedCashPackages.size > 0
                                  ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                                  : "#f1f5f9",
                              border: "none",
                              borderRadius: "8px",
                              padding: "8px 16px",
                              cursor:
                                selectedCashPackages.size > 0
                                  ? "pointer"
                                  : "not-allowed",
                              opacity: selectedCashPackages.size > 0 ? 1 : 0.5,
                              transition: "all 0.3s ease",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              boxShadow:
                                selectedCashPackages.size > 0
                                  ? "0 4px 12px rgba(16, 185, 129, 0.3)"
                                  : "none",
                            }}
                            onMouseOver={(e) => {
                              if (selectedCashPackages.size > 0) {
                                e.currentTarget.style.transform =
                                  "translateY(-2px)";
                                e.currentTarget.style.boxShadow =
                                  "0 6px 16px rgba(16, 185, 129, 0.4)";
                              }
                            }}
                            onMouseOut={(e) => {
                              if (selectedCashPackages.size > 0) {
                                e.currentTarget.style.transform =
                                  "translateY(0)";
                                e.currentTarget.style.boxShadow =
                                  "0 4px 12px rgba(16, 185, 129, 0.3)";
                              }
                            }}
                          >
                            <span style={{ fontSize: "1rem" }}>✅</span>
                            <span
                              style={{
                                color:
                                  selectedCashPackages.size > 0
                                    ? "#fff"
                                    : "#64748b",
                                fontSize: "0.9rem",
                                fontWeight: "600",
                              }}
                            >
                              全部结清 ({selectedCashPackages.size})
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* 包裹列表 */}
                      {visiblePackages.length === 0 ? (
                        <div
                          style={{
                            background: "#f8fafc",
                            borderRadius: "12px",
                            padding: "60px 20px",
                            textAlign: "center",
                            border: "1px solid #e2e8f0",
                          }}
                        >
                          <div
                            style={{ fontSize: "3rem", marginBottom: "16px" }}
                          >
                            ✅
                          </div>
                          <div
                            style={{
                              color: "#334155",
                              fontSize: "1.1rem",
                            }}
                          >
                            所有包裹已结清
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: isMobile
                              ? "1fr"
                              : "repeat(auto-fill, minmax(280px, 1fr))",
                            gap: "12px",
                          }}
                        >
                          {visiblePackages.map((pkg) => {
                            const price = parseFloat(
                              pkg.price?.replace(/[^\d.]/g, "") || "0",
                            );
                            const isSelected = selectedCashPackages.has(pkg.id);

                            // 检查是否为合伙店铺订单
                            const isStoreMatch = deliveryStores.some(
                              (store) =>
                                store.store_name === pkg.sender_name ||
                                (pkg.sender_name &&
                                  pkg.sender_name.startsWith(store.store_name)),
                            );
                            const isMerchant =
                              !!pkg.delivery_store_id || isStoreMatch;
                            const codVal = Number(pkg.cod_amount || 0);
                            const pkgDate = getPackageFinanceDateKey(pkg);
                            const isPriorUnsettled =
                              Boolean(pkgDate) &&
                              pkgDate < cashCollectionDate &&
                              !pkg.rider_settled &&
                              pkg.payment_method === "cash";

                            return (
                              <div
                                key={pkg.id}
                                style={{
                                  background: isSelected
                                    ? "rgba(59, 130, 246, 0.15)"
                                    : "#f1f5f9",
                                  borderRadius: "10px",
                                  padding: "16px",
                                  border: isSelected
                                    ? "2px solid #3b82f6"
                                    : "1px solid #f1f5f9",
                                  position: "relative",
                                  transition: "all 0.3s ease",
                                }}
                              >
                                {/* 左上角白色复选框 */}
                                <div
                                  onClick={() => {
                                    setSelectedCashPackages((prev) => {
                                      const newSet = new Set(prev);
                                      if (newSet.has(pkg.id)) {
                                        newSet.delete(pkg.id);
                                      } else {
                                        newSet.add(pkg.id);
                                      }
                                      return newSet;
                                    });
                                  }}
                                  style={{
                                    position: "absolute",
                                    top: "12px",
                                    left: "12px",
                                    width: "20px",
                                    height: "20px",
                                    background: "white",
                                    border: `2px solid ${isSelected ? "#3b82f6" : "#cbd5e1"}`,
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    transition: "all 0.2s ease",
                                    zIndex: 10,
                                  }}
                                  onMouseOver={(e) => {
                                    e.currentTarget.style.borderColor =
                                      "#3b82f6";
                                    e.currentTarget.style.transform =
                                      "scale(1.1)";
                                  }}
                                  onMouseOut={(e) => {
                                    e.currentTarget.style.borderColor =
                                      isSelected
                                        ? "#3b82f6"
                                        : "#cbd5e1";
                                    e.currentTarget.style.transform =
                                      "scale(1)";
                                  }}
                                >
                                  {isSelected && (
                                    <span
                                      style={{
                                        color: "#3b82f6",
                                        fontSize: "14px",
                                        fontWeight: "bold",
                                      }}
                                    >
                                      ✓
                                    </span>
                                  )}
                                </div>

                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "flex-start",
                                    marginBottom: "8px",
                                    paddingLeft: "32px",
                                  }}
                                >
                                  <div style={{ flex: 1 }}>
                                    <div
                                      style={{
                                        color: "#0f172a",
                                        fontWeight: "bold",
                                        fontSize: "0.95rem",
                                        marginBottom: "4px",
                                      }}
                                    >
                                      {pkg.id}
                                      {isPriorUnsettled && (
                                        <span
                                          style={{
                                            marginLeft: "8px",
                                            background: "#fef3c7",
                                            color: "#92400e",
                                            padding: "2px 7px",
                                            borderRadius: "6px",
                                            fontSize: "0.7rem",
                                            fontWeight: 700,
                                            whiteSpace: "nowrap",
                                          }}
                                        >
                                          {t.riderPriorUnsettled}
                                          {pkgDate ? ` ${pkgDate}` : ""}
                                        </span>
                                      )}
                                    </div>
                                    <div
                                      style={{
                                        color: "#334155",
                                        fontSize: "0.85rem",
                                      }}
                                    >
                                      {pkg.receiver_name} - {pkg.receiver_phone}
                                    </div>
                                  </div>
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      alignItems: "flex-end",
                                      gap: "4px",
                                    }}
                                  >
                                    <div
                                      style={{
                                        background: "#fef3c7",
                                        color: "#92400e",
                                        padding: "4px 12px",
                                        borderRadius: "6px",
                                        fontSize: "0.9rem",
                                        fontWeight: "bold",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {price.toLocaleString()} MMK
                                    </div>
                                    {isMerchant && (
                                      <div
                                        style={{
                                          background: "#fee2e2",
                                          color: "#b91c1c",
                                          padding: "4px 12px",
                                          borderRadius: "6px",
                                          fontSize: "0.85rem",
                                          fontWeight: "bold",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        代收:{" "}
                                        {codVal > 0
                                          ? `${codVal.toLocaleString()} MMK`
                                          : "无"}
                                      </div>
                                    )}
                                          <div
                                            style={{
                                        background: "rgba(148, 163, 184, 0.25)",
                                        color: "#64748b",
                                        padding: "4px 12px",
                                        borderRadius: "6px",
                                        fontSize: "0.75rem",
                                        fontWeight: "700",
                                        whiteSpace: "nowrap",
                                        marginTop: "4px",
                                      }}
                                    >
                                      {pkg.payment_method === "cash"
                                        ? "💵 现金"
                                        : "💳 余额/二维码"}
                                    </div>
                                    {getCashDetailPlatformLineTotal(pkg) > 0 && (
                                      <div
                                        style={{
                                          background: "rgba(16, 185, 129, 0.2)",
                                              color: "#10b981",
                                              padding: "4px 12px",
                                              borderRadius: "6px",
                                              fontSize: "0.85rem",
                                              fontWeight: "bold",
                                              whiteSpace: "nowrap",
                                              marginTop: "4px",
                                            }}
                                          >
                                        余额/平台支付:{" "}
                                        {getCashDetailPlatformLineTotal(
                                          pkg,
                                        ).toLocaleString()}{" "}
                                        MMK
                                          </div>
                                    )}
                                  </div>
                                </div>
                                <div
                                  style={{
                                    color: "#64748b",
                                    fontSize: "0.8rem",
                                    marginTop: "8px",
                                    paddingTop: "8px",
                                    borderTop:
                                      "1px solid #e2e8f0",
                                  }}
                                >
                                  📍 {pkg.receiver_address}
                                </div>
                                {pkg.delivery_time && (
                                  <div
                                    style={{
                                      color: "#64748b",
                                      fontSize: "0.75rem",
                                      marginTop: "4px",
                                    }}
                                  >
                                    送达时间: {pkg.delivery_time}
                                  </div>
                                )}
                                {pkg.create_time && (
                                  <div
                                    style={{
                                      color: "#64748b",
                                      fontSize: "0.75rem",
                                      marginTop: "2px",
                                    }}
                                  >
                                    创建时间: {pkg.create_time}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
    </>
  );
};

export default FinanceCashCollectionTab;
