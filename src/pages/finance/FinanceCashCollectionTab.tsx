// @ts-nocheck — 从 FinanceManagement 原样搬出的 Tab JSX；类型由父组件工作区承担。
import React from "react";
import { packageService, Package } from "../../services/supabase";
import { feedbackService } from "../../services/FeedbackService";
import { REGIONS } from "../FinanceManagement.helpers";
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
    isPackageInCashCollectionDayView,
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
            <div
              style={{
                background: "rgba(255, 255, 255, 0.12)",
                borderRadius: "16px",
                padding: isMobile ? "16px" : "24px",
                marginBottom: "24px",
                border: "1px solid rgba(255, 255, 255, 0.18)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "20px",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <h3 style={{ margin: 0, color: "white", fontSize: "1.5rem" }}>
                  💵 {t.cashCollection}
                </h3>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "rgba(0, 0, 0, 0.3)",
                    padding: "4px 8px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                  }}
                >
                  <button
                    onClick={() => {
                      const date = new Date(cashCollectionDate);
                      date.setDate(date.getDate() - 1);
                      setCashCollectionDate(date.toISOString().split("T")[0]);
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "white",
                      cursor: "pointer",
                      fontSize: "1.2rem",
                      padding: "0 8px",
                      fontWeight: "bold",
                      opacity: 0.8,
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.opacity = "1")}
                    onMouseOut={(e) => (e.currentTarget.style.opacity = "0.8")}
                    title={t.prevDay}
                  >
                    &lt;
                  </button>

                  <input
                    type="date"
                    value={cashCollectionDate}
                    onChange={(e) => setCashCollectionDate(e.target.value)}
                    style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      border: "none",
                      background: "transparent",
                      color: "white",
                      fontSize: "1rem",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      outline: "none",
                    }}
                  />

                  <button
                    onClick={() => {
                      const date = new Date(cashCollectionDate);
                      date.setDate(date.getDate() + 1);
                      setCashCollectionDate(date.toISOString().split("T")[0]);
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "white",
                      cursor: "pointer",
                      fontSize: "1.2rem",
                      padding: "0 8px",
                      fontWeight: "bold",
                      opacity: 0.8,
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.opacity = "1")}
                    onMouseOut={(e) => (e.currentTarget.style.opacity = "0.8")}
                    title={t.nextDay}
                  >
                    &gt;
                  </button>

                  <button
                    onClick={() =>
                      setCashCollectionDate(
                        new Date().toISOString().split("T")[0],
                      )
                    }
                    style={{
                      background: "rgba(255, 255, 255, 0.1)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      borderRadius: "4px",
                      color: "white",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      padding: "4px 10px",
                      marginLeft: "8px",
                      fontWeight: "500",
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(255, 255, 255, 0.2)")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(255, 255, 255, 0.1)")
                    }
                  >
                    {t.today}
                  </button>
                </div>

                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span
                    style={{
                      color: "rgba(255,255,255,0.7)",
                      fontSize: "0.9rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    {t.statusFilter}:
                    {showYesterdayCashUnsettledReminder && (
                      <span
                        title={t.cashYesterdayUnsettledReminder}
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: "#f97316",
                          boxShadow: "0 0 0 2px rgba(249, 115, 22, 0.4)",
                          flexShrink: 0,
                        }}
                        aria-hidden
                      />
                    )}
                    {showCashSettlementReminder && (
                      <span
                        title={t.cashSettlementReminder}
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: "#ffc107",
                          boxShadow: "0 0 0 2px rgba(255, 193, 7, 0.35)",
                          flexShrink: 0,
                        }}
                        aria-hidden
                      />
                    )}
                  </span>
                  <select
                    value={cashSettlementStatus}
                    onChange={(e) =>
                      setCashSettlementStatus(e.target.value as any)
                    }
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255, 255, 255, 0.3)",
                      background: "rgba(0, 0, 0, 0.3)",
                      color: "white",
                      fontSize: "0.9rem",
                      cursor: "pointer",
                    }}
                  >
                    <option value="unsettled" style={{ color: "#000" }}>
                      {t.unsettled}
                    </option>
                    <option value="settled" style={{ color: "#000" }}>
                      {t.settled}
                    </option>
                    <option value="all" style={{ color: "#000" }}>
                      {t.all}
                    </option>
                  </select>
                </div>
              </div>

              {showYesterdayCashUnsettledReminder && (
                <div
                  role="status"
                  style={{
                    marginBottom: "12px",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    background: "rgba(249, 115, 22, 0.2)",
                    border: "1px solid rgba(249, 115, 22, 0.5)",
                    color: "rgba(255, 255, 255, 0.96)",
                    fontSize: "0.95rem",
                    lineHeight: 1.5,
                  }}
                >
                  <span style={{ marginRight: "8px" }} aria-hidden>
                    ⚠️
                  </span>
                  {t.cashYesterdayUnsettledReminder}
                </div>
              )}

              {showCashSettlementReminder && (
                <div
                  role="status"
                  style={{
                    marginBottom: "16px",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    background: "rgba(255, 193, 7, 0.18)",
                    border: "1px solid rgba(255, 193, 7, 0.45)",
                    color: "rgba(255, 255, 255, 0.96)",
                    fontSize: "0.95rem",
                    lineHeight: 1.5,
                  }}
                >
                  <span style={{ marginRight: "8px" }} aria-hidden>
                    🔔
                  </span>
                  {t.cashSettlementReminder}
                </div>
              )}

              {/* 统计卡片 */}
              {(() => {
                const cashPackages = packages.filter(
                  isPackageInCashCollectionDayView,
                );

                let totalDeliveryFee = 0;
                let totalCOD = 0;
                let totalPlatformPayment = 0;

                cashPackages.forEach((pkg) => {
                  totalDeliveryFee += getCashDetailDeliveryLineCashOnly(pkg);
                  totalCOD += getCashDetailMerchantRiderCodMmk(pkg);
                  totalPlatformPayment += getCashDetailPlatformLineTotal(pkg);
                });

                const totalAmount = totalDeliveryFee + totalCOD;

                return (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile
                        ? "1fr"
                        : "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: "16px",
                    }}
                  >
                    {/* 总现金（未结清） */}
                    <div
                      style={{
                        background: "rgba(167, 243, 208, 0.2)",
                        borderRadius: "12px",
                        padding: "20px",
                        border: "1px solid rgba(167, 243, 208, 0.3)",
                      }}
                    >
                      <div
                        style={{
                          color: "#a7f3d0",
                          fontSize: "0.9rem",
                          marginBottom: "8px",
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
                          color: "white",
                          fontSize: "1.5rem",
                          fontWeight: "bold",
                        }}
                      >
                        {totalAmount.toLocaleString()} MMK
                      </div>
                      <div
                        style={{
                          color: "rgba(255, 255, 255, 0.65)",
                          fontSize: "0.8rem",
                          marginTop: "6px",
                        }}
                      >
                        {language === "zh"
                          ? "现金跑腿 + 代收款（现金），不含总平台支付"
                          : language === "en"
                            ? "Cash delivery fee + cash COD, excl. platform"
                            : "ငွေသားပို့ဆောင်+ငွေသားကိုယ်စားကောက် (ပလက်ဖောင်းမပါ)"}
                      </div>
                    </div>

                    {/* 🚀 新增：总平台支付 */}
                    <div
                      style={{
                        background: "rgba(59, 130, 246, 0.2)",
                        borderRadius: "12px",
                        padding: "20px",
                        border: "1px solid rgba(59, 130, 246, 0.3)",
                      }}
                    >
                      <div
                        style={{
                          color: "#93c5fd",
                          fontSize: "0.9rem",
                          marginBottom: "8px",
                        }}
                      >
                        {language === "my"
                          ? "စုစုပေါင်း ပလက်ဖောင်းမှပေးချေမှု"
                          : "总平台支付"}
                      </div>
                      <div
                        style={{
                          color: "white",
                          fontSize: "1.5rem",
                          fontWeight: "bold",
                        }}
                      >
                        {totalPlatformPayment.toLocaleString()} MMK
                      </div>
                      <div
                        style={{
                          color: "rgba(255, 255, 255, 0.7)",
                          fontSize: "0.85rem",
                          marginTop: "4px",
                        }}
                      >
                        {language === "my"
                          ? "လက်ကျန်ငွေဖြင့် ပေးချေခြင်း"
                          : "余额支付汇总"}
                      </div>
                    </div>

                    {/* 快递员数 */}
                    <div
                      style={{
                        background: "rgba(219, 234, 254, 0.2)",
                        borderRadius: "12px",
                        padding: "20px",
                        border: "1px solid rgba(219, 234, 254, 0.3)",
                      }}
                    >
                      <div
                        style={{
                          color: "#dbeafe",
                          fontSize: "0.9rem",
                          marginBottom: "8px",
                        }}
                      >
                        {t.totalCourierCount}
                      </div>
                      <div
                        style={{
                          color: "white",
                          fontSize: "1.5rem",
                          fontWeight: "bold",
                        }}
                      >
                        {couriers.length}
                      </div>
                      <div
                        style={{
                          color: "rgba(255, 255, 255, 0.7)",
                          fontSize: "0.85rem",
                          marginTop: "4px",
                        }}
                      >
                        {couriers.length} {t.courierSuffix}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* 快递员列表 */}
            {(() => {
              // 与统计卡片、商家代收款明细、现金详情弹窗默认日 使用同一筛选
              const cashPackages = packages.filter(
                isPackageInCashCollectionDayView,
              );

              const courierCashMap: Record<
                string,
                { packages: Package[]; total: number }
              > = {};

              cashPackages.forEach((pkg) => {
                const courier = pkg.courier || "未分配";
                if (!courierCashMap[courier]) {
                  courierCashMap[courier] = { packages: [], total: 0 };
                }
                courierCashMap[courier].packages.push(pkg);
                courierCashMap[courier].total +=
                  getCashDetailDeliveryLineCashOnly(pkg) +
                  getCashDetailPlatformLineTotal(pkg);
              });

              // 过滤快递员列表（如果为领区用户，仅显示所属领区的骑手）
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
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.12)",
                      borderRadius: "16px",
                      padding: "60px 20px",
                      textAlign: "center",
                      border: "1px solid rgba(255, 255, 255, 0.18)",
                    }}
                  >
                    <div style={{ fontSize: "3rem", marginBottom: "16px" }}>
                      🚚
                    </div>
                    <div
                      style={{
                        color: "rgba(255, 255, 255, 0.7)",
                        fontSize: "1.1rem",
                      }}
                    >
                      暂无快递员数据
                    </div>
                  </div>
                );
              }

              return (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  {displayCouriers.map((courier) => {
                    const courierName = courier.name || "未知";
                    const employeeId = courier.employee_id || "无";
                    const cashData = courierCashMap[courierName] || {
                      packages: [],
                      total: 0,
                    };

                    return (
                      <div
                        key={courier.id}
                        style={{
                          background:
                            "linear-gradient(145deg, rgba(30, 58, 138, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%)",
                          borderRadius: "20px",
                          padding: isMobile ? "20px" : "24px",
                          border: "1px solid rgba(255, 255, 255, 0.15)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: "16px",
                          backdropFilter: "blur(10px)",
                          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                          transition: "transform 0.3s ease",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.transform = "translateY(-4px)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.transform = "translateY(0)")
                        }
                      >
                        <div style={{ flex: 1, minWidth: "250px" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "16px",
                              marginBottom: "12px",
                            }}
                          >
                            <div
                              style={{
                                width: "50px",
                                height: "50px",
                                borderRadius: "14px",
                                background: "rgba(59, 130, 246, 0.25)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "1.8rem",
                                border: "1px solid rgba(59, 130, 246, 0.3)",
                              }}
                            >
                              {courier.vehicle_type === "car" ? "🚗" : "🏍️"}
                            </div>
                            <div>
                              <h4
                                style={{
                                  margin: 0,
                                  color: "white",
                                  fontSize: "1.3rem",
                                  fontWeight: 800,
                                }}
                              >
                                {courierName}
                              </h4>
                              <div
                                style={{
                                  display: "flex",
                                  gap: "8px",
                                  marginTop: "4px",
                                  alignItems: "center",
                                }}
                              >
                                <span
                                  style={{
                                    background: "rgba(72, 187, 120, 0.15)",
                                    color: "#4ade80",
                                    padding: "2px 8px",
                                    borderRadius: "6px",
                                    fontSize: "0.8rem",
                                    fontWeight: 700,
                                    fontFamily: "monospace",
                                  }}
                                >
                                  #{employeeId}
                                </span>
                                <span
                                  style={{
                                    color: "rgba(255,255,255,0.5)",
                                    fontSize: "0.8rem",
                                    fontWeight: 600,
                                  }}
                                >
                                  {(() => {
                                    const r = REGIONS.find(
                                      (reg) =>
                                        reg.id === courier.region ||
                                        reg.prefix === courier.region,
                                    );
                                    return r ? r.prefix : courier.region || "-";
                                  })()}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div
                            style={{
                              background: "rgba(0,0,0,0.2)",
                              padding: "12px 16px",
                              borderRadius: "12px",
                              border: "1px solid rgba(255,255,255,0.05)",
                              display: "inline-block",
                            }}
                          >
                            <div
                              style={{
                                color: "rgba(255, 255, 255, 0.6)",
                                fontSize: "0.85rem",
                                marginBottom: "4px",
                              }}
                            >
                              {t.riderCollection}
                            </div>
                            <div
                              style={{
                                color:
                                  cashData.total > 0
                                    ? "#fbbf24"
                                    : "rgba(255,255,255,0.4)",
                                fontSize: "1.2rem",
                                fontWeight: 800,
                              }}
                            >
                              {cashData.total.toLocaleString()} MMK
                              <span
                                style={{
                                  fontSize: "0.85rem",
                                  fontWeight: 500,
                                  marginLeft: "8px",
                                  opacity: 0.7,
                                }}
                              >
                                ({cashData.packages.length} {t.packageSuffix})
                              </span>
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                            alignItems: isMobile ? "flex-start" : "flex-end",
                          }}
                        >
                          <div
                            style={{
                              background:
                                courier.status === "active"
                                  ? "rgba(16, 185, 129, 0.2)"
                                  : "rgba(239, 68, 68, 0.2)",
                              color:
                                courier.status === "active"
                                  ? "#10b981"
                                  : "#f87171",
                              padding: "6px 16px",
                              borderRadius: "10px",
                              fontSize: "0.85rem",
                              fontWeight: 800,
                              border: `1px solid ${courier.status === "active" ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <span
                              style={{
                                width: "6px",
                                height: "6px",
                                borderRadius: "50%",
                                background: "currentColor",
                                boxShadow: "0 0 8px currentColor",
                              }}
                            ></span>
                            {courier.status === "active" ? t.online : t.offline}
                          </div>

                          <button
                            onClick={() => {
                              setSelectedCourier(courierName);
                              setShowCashDetailModal(true);
                              // 默认仅显示「当日收款管理」所选日期，与列表中该骑手的单量、商家 COD 明细口径一致
                              setCashDetailDateFilter("custom");
                              setCashDetailStartDate(cashCollectionDate);
                              setCashDetailEndDate(cashCollectionDate);
                              setSelectedCashPackages(new Set());
                              setClearedCashPackages(new Set());
                            }}
                            style={{
                              background:
                                cashData.packages.length > 0
                                  ? "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
                                  : "rgba(255, 255, 255, 0.1)",
                              color: "white",
                              border: "none",
                              padding: "12px 32px",
                              borderRadius: "12px",
                              fontSize: "1rem",
                              fontWeight: "bold",
                              cursor:
                                cashData.packages.length > 0
                                  ? "pointer"
                                  : "not-allowed",
                              opacity: cashData.packages.length > 0 ? 1 : 0.5,
                              transition: "all 0.3s ease",
                              boxShadow:
                                cashData.packages.length > 0
                                  ? "0 8px 20px rgba(59, 130, 246, 0.35)"
                                  : "none",
                            }}
                            disabled={cashData.packages.length === 0}
                            onMouseOver={(e) => {
                              if (cashData.packages.length > 0) {
                                e.currentTarget.style.transform = "scale(1.05)";
                                e.currentTarget.style.filter =
                                  "brightness(1.1)";
                              }
                            }}
                            onMouseOut={(e) => {
                              if (cashData.packages.length > 0) {
                                e.currentTarget.style.transform = "scale(1)";
                                e.currentTarget.style.filter = "brightness(1)";
                              }
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
                  "linear-gradient(145deg, #1a365d 0%, #2c5282 50%, #3182ce 100%)",
                borderRadius: "20px",
                padding: 0,
                border: "1px solid rgba(255, 255, 255, 0.15)",
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
                    "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)",
                  padding: "24px",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
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
                      color: "white",
                    }}
                  >
                    💵 {selectedCourier} - 现金收款详情
                  </h2>
                  <p
                    style={{
                      margin: "8px 0 0 0",
                      fontSize: "0.9rem",
                      color: "rgba(255,255,255,0.7)",
                    }}
                  >
                    默认日期为上方「当日收款管理」所选日；与下方结清筛选项、商家代收款订单为同一套规则。可改日期以查看其他区间。
                  </p>
                  <p
                    style={{
                      margin: "10px 0 0 0",
                      fontSize: "0.78rem",
                      color: "rgba(255,255,255,0.55)",
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
                    background: "rgba(255, 255, 255, 0.1)",
                    color: "white",
                    border: "1px solid rgba(255,255,255,0.2)",
                    padding: "8px 16px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontSize: "1rem",
                    fontWeight: "bold",
                    transition: "all 0.3s ease",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background =
                      "rgba(255, 255, 255, 0.2)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background =
                      "rgba(255, 255, 255, 0.1)";
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
                    background: "rgba(255, 255, 255, 0.08)",
                    borderRadius: "12px",
                    padding: "16px",
                    marginBottom: "20px",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <div
                    style={{
                      color: "white",
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
                        border: "1px solid rgba(255, 255, 255, 0.25)",
                        background: "rgba(7, 23, 53, 0.65)",
                        color: "white",
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
                            border: "1px solid rgba(255, 255, 255, 0.25)",
                            background: "rgba(7, 23, 53, 0.65)",
                            color: "white",
                            fontSize: "0.9rem",
                          }}
                        />
                        <span style={{ color: "rgba(255, 255, 255, 0.7)" }}>
                          至
                        </span>
                        <input
                          type="date"
                          value={cashDetailEndDate}
                          onChange={(e) => setCashDetailEndDate(e.target.value)}
                          style={{
                            padding: "8px 12px",
                            borderRadius: "8px",
                            border: "1px solid rgba(255, 255, 255, 0.25)",
                            background: "rgba(7, 23, 53, 0.65)",
                            color: "white",
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
                          background: "rgba(255, 255, 255, 0.08)",
                          borderRadius: "12px",
                          padding: "60px 20px",
                          textAlign: "center",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                        }}
                      >
                        <div style={{ fontSize: "3rem", marginBottom: "16px" }}>
                          📦
                        </div>
                        <div
                          style={{
                            color: "rgba(255, 255, 255, 0.7)",
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
                                color: "#fef3c7",
                                fontSize: "0.9rem",
                                marginBottom: "4px",
                              }}
                            >
                              总跑腿费（现金代收）
                            </div>
                            <div
                              style={{
                                color: "white",
                                fontSize: "1.4rem",
                                fontWeight: "bold",
                              }}
                            >
                              {visibleDeliveryFee.toLocaleString()} MMK
                            </div>
                            <div
                              style={{
                                color: "rgba(255, 255, 255, 0.7)",
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
                                color: "#fecaca",
                                fontSize: "0.9rem",
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
                                color: "white",
                                fontSize: "1.4rem",
                                fontWeight: "bold",
                              }}
                            >
                              {visibleCOD.toLocaleString()} MMK
                            </div>
                            <div
                              style={{
                                color: "rgba(255, 255, 255, 0.7)",
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
                                color: "#bfdbfe",
                                fontSize: "0.9rem",
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
                                color: "white",
                                fontSize: "1.4rem",
                                fontWeight: "bold",
                              }}
                            >
                              {visibleTotalAmount.toLocaleString()} MMK
                            </div>
                            <div
                              style={{
                                color: "rgba(255, 255, 255, 0.65)",
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
                                color: "#6ee7b7",
                                fontSize: "0.9rem",
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
                                color: "white",
                                fontSize: "1.4rem",
                                fontWeight: "bold",
                              }}
                            >
                              {visiblePlatformItemProduct.toLocaleString()} MMK
                            </div>
                            <div
                              style={{
                                color: "rgba(255, 255, 255, 0.65)",
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
                                color: "#5eead4",
                                fontSize: "0.9rem",
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
                                color: "white",
                                fontSize: "1.4rem",
                                fontWeight: "bold",
                              }}
                            >
                              {visiblePlatformDeliveryBalance.toLocaleString()}{" "}
                              MMK
                            </div>
                            <div
                              style={{
                                color: "rgba(255, 255, 255, 0.65)",
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
                                color: "#a7f3d0",
                                fontSize: "0.9rem",
                                marginBottom: "4px",
                              }}
                            >
                              总平台支付 (余额支付)
                            </div>
                            <div
                              style={{
                                color: "white",
                                fontSize: "1.4rem",
                                fontWeight: "bold",
                              }}
                            >
                              {visiblePlatformPayment.toLocaleString()} MMK
                            </div>
                            <div
                              style={{
                                color: "rgba(255, 255, 255, 0.65)",
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
                                : "rgba(255, 255, 255, 0.1)",
                              border: `2px solid ${allSelected ? "#3b82f6" : "rgba(255, 255, 255, 0.3)"}`,
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
                                : "rgba(255, 255, 255, 0.15)";
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.background = allSelected
                                ? "rgba(59, 130, 246, 0.3)"
                                : "rgba(255, 255, 255, 0.1)";
                            }}
                          >
                            <span style={{ fontSize: "1.2rem" }}>
                              {allSelected ? "☑️" : "☐"}
                            </span>
                            <span
                              style={{
                                color: "white",
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
                                  : "rgba(255, 255, 255, 0.1)",
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
                                color: "white",
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
                            background: "rgba(255, 255, 255, 0.08)",
                            borderRadius: "12px",
                            padding: "60px 20px",
                            textAlign: "center",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                          }}
                        >
                          <div
                            style={{ fontSize: "3rem", marginBottom: "16px" }}
                          >
                            ✅
                          </div>
                          <div
                            style={{
                              color: "rgba(255, 255, 255, 0.7)",
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

                            return (
                              <div
                                key={pkg.id}
                                style={{
                                  background: isSelected
                                    ? "rgba(59, 130, 246, 0.15)"
                                    : "rgba(255, 255, 255, 0.1)",
                                  borderRadius: "10px",
                                  padding: "16px",
                                  border: isSelected
                                    ? "2px solid #3b82f6"
                                    : "1px solid rgba(255, 255, 255, 0.15)",
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
                                    border: `2px solid ${isSelected ? "#3b82f6" : "rgba(255, 255, 255, 0.5)"}`,
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
                                        : "rgba(255, 255, 255, 0.5)";
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
                                        color: "white",
                                        fontWeight: "bold",
                                        fontSize: "0.95rem",
                                        marginBottom: "4px",
                                      }}
                                    >
                                      {pkg.id}
                                    </div>
                                    <div
                                      style={{
                                        color: "rgba(255, 255, 255, 0.7)",
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
                                        color: "#e2e8f0",
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
                                    color: "rgba(255, 255, 255, 0.6)",
                                    fontSize: "0.8rem",
                                    marginTop: "8px",
                                    paddingTop: "8px",
                                    borderTop:
                                      "1px solid rgba(255, 255, 255, 0.1)",
                                  }}
                                >
                                  📍 {pkg.receiver_address}
                                </div>
                                {pkg.delivery_time && (
                                  <div
                                    style={{
                                      color: "rgba(255, 255, 255, 0.5)",
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
                                      color: "rgba(255, 255, 255, 0.5)",
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
