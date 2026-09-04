// @ts-nocheck — 从 FinanceManagement 原样搬出的 Tab JSX；类型由父组件工作区承担。
import React from "react";

import { REGIONS } from "../FinanceManagement.helpers";
import { useFinanceWorkspace } from "./FinanceWorkspace";

const FinanceMerchantsCollectionTab: React.FC = () => {
  const {
    activeTab,
    getStoreRegionPrefix,
    handleMerchantAllSettledOrdersClick,
    handleMerchantCollectionClick,
    handleSettleMerchant,
    isRegionalUser,
    language,
    merchantRegionFilter,
    merchantsCollectionStats,
    setMerchantRegionFilter,
    t,
    width
  } = useFinanceWorkspace();

  return (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <span
                  style={{ color: "#334155", fontSize: "0.9rem" }}
                >
                  {language === "zh"
                    ? "分区域"
                    : language === "my"
                      ? "ဒေသအလိုက်"
                      : "Region"}
                </span>
                <select
                  value={merchantRegionFilter}
                  onChange={(e) => setMerchantRegionFilter(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    background: "#ffffff",
                    color: "#0f172a",
                    cursor: "pointer",
                    fontSize: "0.95rem",
                  }}
                >
                  <option value="all" style={{ color: "#111827" }}>
                    {language === "zh"
                      ? "全部地区"
                      : language === "my"
                        ? "ဒေသအားလုံး"
                        : "All Regions"}
                  </option>
                  {REGIONS.map((region) => (
                    <option
                      key={region.prefix}
                      value={region.prefix}
                      style={{ color: "#111827" }}
                    >
                      {region.prefix}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {merchantRegionFilter !== "all" ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "20px",
                }}
              >
                {REGIONS.filter(
                  (region) => region.prefix === merchantRegionFilter,
                ).map((region) => {
                  const regionStores = merchantsCollectionStats.filter(
                    (store) => {
                      const prefix = getStoreRegionPrefix(store);
                      return prefix === region.prefix;
                    },
                  );
                  if (regionStores.length === 0) return null;
                  return (
                    <div
                      key={region.prefix}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                      }}
                    >
                      <div
                        style={{
                          color: "#334155",
                          fontSize: "1rem",
                          fontWeight: 600,
                        }}
                      >
                        {region.name} ({region.prefix})
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fill, minmax(350px, 1fr))",
                          gap: "20px",
                        }}
                      >
                        {regionStores.map((store) => (
                          <div
                            key={store.id}
                            style={{
                              background: "#ffffff",
                              borderRadius: "20px",
                              padding: "24px",
                              border: "1px solid #f8fafc",
                              boxShadow: "0 12px 35px rgba(7, 23, 55, 0.45)",
                              display: "flex",
                              flexDirection: "column",
                              gap: "16px",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <h3
                                style={{
                                  margin: 0,
                                  color: "#0f172a",
                                  fontSize: "1.2rem",
                                }}
                              >
                                {store.store_name}
                              </h3>
                              <div
                                style={{
                                  background:
                                    store.unclearedAmount > 0
                                      ? "rgba(239, 68, 68, 0.2)"
                                      : "rgba(16, 185, 129, 0.2)",
                                  color:
                                    store.unclearedAmount > 0
                                      ? "#ef4444"
                                      : "#10b981",
                                  padding: "4px 12px",
                                  borderRadius: "20px",
                                  fontSize: "0.85rem",
                                  fontWeight: "600",
                                }}
                              >
                                {store.unclearedAmount > 0
                                  ? t.unsettled
                                  : t.settled}
                              </div>
                            </div>

                            {/* 店铺联系信息 - 使用 delivery_stores 表的数据 */}
                            <div
                              style={{
                                background: "#f1f5f9",
                                padding: "12px",
                                borderRadius: "12px",
                                display: "flex",
                                flexDirection: "column",
                                gap: "8px",
                              }}
                            >
                              {store.contact_phone && (
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    color: "#334155",
                                  }}
                                >
                                  <span style={{ fontSize: "1rem" }}>📞</span>
                                  <span style={{ fontSize: "0.9rem" }}>
                                    {store.contact_phone}
                                  </span>
                                </div>
                              )}
                              {store.address && (
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "flex-start",
                                    gap: "8px",
                                    color: "#334155",
                                  }}
                                >
                                  <span style={{ fontSize: "1rem" }}>📍</span>
                                  <span
                                    style={{
                                      fontSize: "0.9rem",
                                      lineHeight: "1.4",
                                    }}
                                  >
                                    {store.address}
                                  </span>
                                </div>
                              )}
                              {store.store_code && (
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    color: "#334155",
                                    marginTop: "4px",
                                    paddingTop: "8px",
                                    borderTop:
                                      "1px solid #f1f5f9",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: "0.85rem",
                                      opacity: 0.7,
                                    }}
                                  >
                                    {language === "zh"
                                      ? "代码"
                                      : language === "my"
                                        ? "ကုဒ်"
                                        : "Code"}
                                    :
                                  </span>
                                  <span
                                    style={{
                                      fontFamily: "monospace",
                                      background: "#f1f5f9",
                                      padding: "2px 8px",
                                      borderRadius: "6px",
                                      fontWeight: "bold",
                                      fontSize: "0.85rem",
                                    }}
                                  >
                                    {store.store_code}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: "12px",
                              }}
                            >
                              <div
                                onClick={() =>
                                  handleMerchantAllSettledOrdersClick(
                                    store.store_name,
                                  )
                                }
                                style={{
                                  background: "#f8fafc",
                                  padding: "12px",
                                  borderRadius: "12px",
                                  cursor: "pointer",
                                  transition: "all 0.2s",
                                  border: "1px solid #e2e8f0",
                                }}
                                onMouseOver={(e) => {
                                  e.currentTarget.style.background =
                                    "#f1f5f9";
                                  e.currentTarget.style.transform =
                                    "translateY(-2px)";
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.background =
                                    "#f8fafc";
                                  e.currentTarget.style.transform =
                                    "translateY(0)";
                                }}
                              >
                                <div
                                  style={{
                                    color: "#64748b",
                                    fontSize: "0.85rem",
                                    marginBottom: "4px",
                                  }}
                                >
                                  {language === "zh"
                                    ? `${new Date().getFullYear()}年已结清订单`
                                    : language === "en"
                                      ? `Settled in ${new Date().getFullYear()} (orders)`
                                      : `${new Date().getFullYear()} နှစ် ငွေရှင်းပြီး အော်ဒါများ`}
                                </div>
                                <div
                                  style={{
                                    color: "#0f172a",
                                    fontSize: "1.1rem",
                                    fontWeight: "bold",
                                  }}
                                >
                                  {store.settledThisYearCount}
                                  {language === "zh" && " 单"}
                                  {language === "en" && " orders"}
                                  {language === "my" && " ခု"}
                                </div>
                              </div>
                              <div
                                onClick={() =>
                                  handleMerchantCollectionClick(
                                    store.store_name,
                                    { scope: "all" },
                                  )
                                }
                                style={{
                                  background: "rgba(239, 68, 68, 0.1)",
                                  padding: "12px",
                                  borderRadius: "12px",
                                  border: "1px solid rgba(239, 68, 68, 0.3)",
                                  cursor: "pointer",
                                  transition: "all 0.2s",
                                }}
                                onMouseOver={(e) => {
                                  e.currentTarget.style.background =
                                    "rgba(239, 68, 68, 0.2)";
                                  e.currentTarget.style.transform =
                                    "translateY(-2px)";
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.background =
                                    "rgba(239, 68, 68, 0.1)";
                                  e.currentTarget.style.transform =
                                    "translateY(0)";
                                }}
                              >
                                <div
                                  style={{
                                    color: "#ef4444",
                                    fontSize: "0.85rem",
                                    marginBottom: "4px",
                                  }}
                                >
                                  {language === "my"
                                    ? "ရှင်းလင်းရန် ကျန်ငွေ"
                                    : t.pendingAmount}
                                </div>
                                <div
                                  style={{
                                    color: "#ef4444",
                                    fontSize: "1.1rem",
                                    fontWeight: "bold",
                                  }}
                                >
                                  {store.unclearedAmount.toLocaleString()}
                                </div>
                              </div>
                            </div>

                            <div
                              style={{
                                color: "#64748b",
                                fontSize: "0.9rem",
                              }}
                            >
                              {t.unsettledOrders}:{" "}
                              <span
                                style={{ color: "#0f172a", fontWeight: "bold" }}
                              >
                                {store.unclearedCount}
                              </span>{" "}
                              {language === "zh" ? "单" : ""}
                            </div>

                            {store.lastSettledAt && (
                              <div
                                style={{
                                  color: "#64748b",
                                  fontSize: "0.9rem",
                                  marginTop: "4px",
                                }}
                              >
                                {t.lastSettled}:{" "}
                                <span
                                  style={{ color: "#0f172a", fontWeight: "500" }}
                                >
                                  {new Date(store.lastSettledAt).toLocaleString(
                                    "zh-CN",
                                    {
                                      year: "numeric",
                                      month: "2-digit",
                                      day: "2-digit",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )}
                                </span>
                              </div>
                            )}

                            {/* 🚀 新增：COD 结清日显示 */}
                            <div
                              style={{
                                marginTop: "8px",
                                padding: "10px 14px",
                                background: "rgba(59, 130, 246, 0.1)",
                                borderRadius: "12px",
                                border: "1px solid rgba(59, 130, 246, 0.2)",
                                display: "flex",
                                flexDirection: "column",
                                gap: "4px",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <span
                                  style={{
                                    color: "#64748b",
                                    fontSize: "0.8rem",
                                    fontWeight: "bold",
                                  }}
                                >
                                  {language === "zh"
                                    ? "🗓️ COD 结清周期"
                                    : language === "my"
                                      ? "🗓️ COD ရှင်းလင်းရေးကာလ"
                                      : "🗓️ COD Settlement Cycle"}
                                </span>
                                <span
                                  style={{
                                    color: "#2563eb",
                                    fontWeight: "800",
                                    fontSize: "0.9rem",
                                  }}
                                >
                                  {store.cod_settlement_day || "7"}{" "}
                                  {language === "zh" ? "天" : "Days"}
                                </span>
                              </div>

                              {(() => {
                                const days = parseInt(
                                  store.cod_settlement_day || "7",
                                );
                                const baseDate = store.lastSettledAt
                                  ? new Date(store.lastSettledAt)
                                  : new Date(store.created_at);
                                const nextDate = new Date(baseDate);
                                nextDate.setDate(baseDate.getDate() + days);

                                const isOverdue = new Date() > nextDate;

                                return (
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      marginTop: "4px",
                                      paddingTop: "4px",
                                      borderTop:
                                        "1px solid #f8fafc",
                                    }}
                                  >
                                    <span
                                      style={{
                                        color: "#64748b",
                                        fontSize: "0.8rem",
                                        fontWeight: "bold",
                                      }}
                                    >
                                      {language === "zh"
                                        ? "🔔 下次结清日"
                                        : language === "my"
                                          ? "🔔 နောက်တစ်ကြိမ်ရှင်းလင်းရမည့်ရက်"
                                          : "🔔 Next Settlement"}
                                    </span>
                                    <span
                                      style={{
                                        color: isOverdue
                                          ? "#ef4444"
                                          : "#10b981",
                                        fontWeight: "900",
                                        fontSize: "1rem",
                                        textShadow: isOverdue
                                          ? "0 0 10px rgba(239, 68, 68, 0.3)"
                                          : "none",
                                      }}
                                    >
                                      {nextDate.toLocaleDateString("zh-CN", {
                                        month: "2-digit",
                                        day: "2-digit",
                                      })}
                                      {isOverdue && (
                                        <span
                                          style={{
                                            fontSize: "0.7rem",
                                            marginLeft: "4px",
                                          }}
                                        >
                                          (
                                          {language === "zh"
                                            ? "逾期"
                                            : "Overdue"}
                                          )
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                );
                              })()}
                            </div>

                            {store.unclearedAmount > 0 && (
                              <button
                                onClick={() =>
                                  !isRegionalUser &&
                                  handleSettleMerchant(
                                    store.id,
                                    store.store_name,
                                  )
                                }
                                disabled={isRegionalUser}
                                style={{
                                  marginTop: "auto",
                                  padding: "10px 12px",
                                  background: isRegionalUser
                                    ? "rgba(148, 163, 184, 0.15)"
                                    : "linear-gradient(135deg, #f97316 0%, #ef4444 100%)",
                                  border: "none",
                                  borderRadius: "12px",
                                  color: isRegionalUser ? "#94a3b8" : "#fff",
                                  cursor: isRegionalUser
                                    ? "not-allowed"
                                    : "pointer",
                                  fontWeight: 600,
                                  boxShadow: isRegionalUser
                                    ? "none"
                                    : "0 4px 15px rgba(239, 68, 68, 0.4)",
                                  transition: "all 0.3s ease",
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                                onMouseOver={(e) => {
                                  if (!isRegionalUser)
                                    e.currentTarget.style.transform =
                                      "scale(1.02)";
                                }}
                                onMouseOut={(e) => {
                                  if (!isRegionalUser)
                                    e.currentTarget.style.transform =
                                      "scale(1)";
                                }}
                              >
                                <span>
                                  {t.confirmSettle} (
                                  {store.unclearedAmount.toLocaleString()} MMK)
                                </span>
                                {isRegionalUser && (
                                  <span
                                    style={{
                                      fontSize: "0.75rem",
                                      fontWeight: "normal",
                                      opacity: 0.8,
                                    }}
                                  >
                                    🔒{" "}
                                    {language === "zh"
                                      ? "仅限总公司管理员操作"
                                      : language === "my"
                                        ? "ပင်မရုံးချုပ် စီမံခန့်ခွဲသူသာ ဆောင်ရွက်နိုင်သည်"
                                        : "HQ Admin Only"}
                                  </span>
                                )}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
                  gap: "20px",
                }}
              >
                {merchantsCollectionStats.map((store) => (
                  <div
                    key={store.id}
                    style={{
                      background: "#ffffff",
                      borderRadius: "20px",
                      padding: "24px",
                      border: "1px solid #f8fafc",
                      boxShadow: "0 12px 35px rgba(7, 23, 55, 0.45)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "16px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <h3
                        style={{
                          margin: 0,
                          color: "#0f172a",
                          fontSize: "1.2rem",
                        }}
                      >
                        {store.store_name}
                      </h3>
                      <div
                        style={{
                          background:
                            store.unclearedAmount > 0
                              ? "rgba(239, 68, 68, 0.2)"
                              : "rgba(16, 185, 129, 0.2)",
                          color:
                            store.unclearedAmount > 0 ? "#ef4444" : "#10b981",
                          padding: "4px 12px",
                          borderRadius: "20px",
                          fontSize: "0.85rem",
                          fontWeight: "600",
                        }}
                      >
                        {store.unclearedAmount > 0 ? t.unsettled : t.settled}
                      </div>
                    </div>

                    {/* 店铺联系信息 - 使用 delivery_stores 表的数据 */}
                    <div
                      style={{
                        background: "#f1f5f9",
                        padding: "12px",
                        borderRadius: "12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      {store.contact_phone && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            color: "#334155",
                          }}
                        >
                          <span style={{ fontSize: "1rem" }}>📞</span>
                          <span style={{ fontSize: "0.9rem" }}>
                            {store.contact_phone}
                          </span>
                        </div>
                      )}
                      {store.address && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "8px",
                            color: "#334155",
                          }}
                        >
                          <span style={{ fontSize: "1rem" }}>📍</span>
                          <span
                            style={{ fontSize: "0.9rem", lineHeight: "1.4" }}
                          >
                            {store.address}
                          </span>
                        </div>
                      )}
                      {store.store_code && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            color: "#334155",
                            marginTop: "4px",
                            paddingTop: "8px",
                            borderTop: "1px solid #f1f5f9",
                          }}
                        >
                          <span style={{ fontSize: "0.85rem", opacity: 0.7 }}>
                            {language === "zh"
                              ? "代码"
                              : language === "my"
                                ? "ကုဒ်"
                                : "Code"}
                            :
                          </span>
                          <span
                            style={{
                              fontFamily: "monospace",
                              background: "#f1f5f9",
                              padding: "2px 8px",
                              borderRadius: "6px",
                              fontWeight: "bold",
                              fontSize: "0.85rem",
                            }}
                          >
                            {store.store_code}
                          </span>
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "12px",
                      }}
                    >
                      <div
                        onClick={() =>
                          handleMerchantAllSettledOrdersClick(store.store_name)
                        }
                        style={{
                          background: "#f8fafc",
                          padding: "12px",
                          borderRadius: "12px",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          border: "1px solid #e2e8f0",
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background =
                            "#f1f5f9";
                          e.currentTarget.style.transform = "translateY(-2px)";
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background =
                            "#f8fafc";
                          e.currentTarget.style.transform = "translateY(0)";
                        }}
                      >
                        <div
                          style={{
                            color: "#64748b",
                            fontSize: "0.85rem",
                            marginBottom: "4px",
                          }}
                        >
                          {language === "zh"
                            ? `${new Date().getFullYear()}年已结清订单`
                            : language === "en"
                              ? `Settled in ${new Date().getFullYear()} (orders)`
                              : `${new Date().getFullYear()} နှစ် ငွေရှင်းပြီး အော်ဒါများ`}
                        </div>
                        <div
                          style={{
                            color: "#0f172a",
                            fontSize: "1.1rem",
                            fontWeight: "bold",
                          }}
                        >
                          {store.settledThisYearCount}
                          {language === "zh" && " 单"}
                          {language === "en" && " orders"}
                          {language === "my" && " ခု"}
                        </div>
                      </div>
                      <div
                        onClick={() =>
                          handleMerchantCollectionClick(store.store_name, {
                            scope: "all",
                          })
                        }
                        style={{
                          background: "rgba(239, 68, 68, 0.1)",
                          padding: "12px",
                          borderRadius: "12px",
                          border: "1px solid rgba(239, 68, 68, 0.3)",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background =
                            "rgba(239, 68, 68, 0.2)";
                          e.currentTarget.style.transform = "translateY(-2px)";
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background =
                            "rgba(239, 68, 68, 0.1)";
                          e.currentTarget.style.transform = "translateY(0)";
                        }}
                      >
                        <div
                          style={{
                            color: "#ef4444",
                            fontSize: "0.85rem",
                            marginBottom: "4px",
                          }}
                        >
                          {language === "my"
                            ? "ရှင်းလင်းရန် ကျန်ငွေ"
                            : t.pendingAmount}
                        </div>
                        <div
                          style={{
                            color: "#ef4444",
                            fontSize: "1.1rem",
                            fontWeight: "bold",
                          }}
                        >
                          {store.unclearedAmount.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        color: "#64748b",
                        fontSize: "0.9rem",
                      }}
                    >
                      {t.unsettledOrders}:{" "}
                      <span style={{ color: "#0f172a", fontWeight: "bold" }}>
                        {store.unclearedCount}
                      </span>{" "}
                      {language === "zh" ? "单" : ""}
                    </div>

                    {store.lastSettledAt && (
                      <div
                        style={{
                          color: "#64748b",
                          fontSize: "0.9rem",
                          marginTop: "4px",
                        }}
                      >
                        {t.lastSettled}:{" "}
                        <span style={{ color: "#0f172a", fontWeight: "500" }}>
                          {new Date(store.lastSettledAt).toLocaleString(
                            "zh-CN",
                            {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </span>
                      </div>
                    )}

                    {/* 🚀 新增：COD 结清日显示 */}
                    <div
                      style={{
                        marginTop: "8px",
                        padding: "10px 14px",
                        background: "rgba(59, 130, 246, 0.1)",
                        borderRadius: "12px",
                        border: "1px solid rgba(59, 130, 246, 0.2)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            color: "#64748b",
                            fontSize: "0.8rem",
                            fontWeight: "bold",
                          }}
                        >
                          {language === "zh"
                            ? "🗓️ COD 结清周期"
                            : language === "my"
                              ? "🗓️ COD ရှင်းလင်းရေးကာလ"
                              : "🗓️ COD Settlement Cycle"}
                        </span>
                        <span
                          style={{
                            color: "#2563eb",
                            fontWeight: "800",
                            fontSize: "0.9rem",
                          }}
                        >
                          {store.cod_settlement_day || "7"}{" "}
                          {language === "zh" ? "天" : "Days"}
                        </span>
                      </div>

                      {(() => {
                        const days = parseInt(store.cod_settlement_day || "7");
                        const baseDate = store.lastSettledAt
                          ? new Date(store.lastSettledAt)
                          : new Date(store.created_at);
                        const nextDate = new Date(baseDate);
                        nextDate.setDate(baseDate.getDate() + days);

                        const isOverdue = new Date() > nextDate;

                        return (
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginTop: "4px",
                              paddingTop: "4px",
                              borderTop: "1px solid #f8fafc",
                            }}
                          >
                            <span
                              style={{
                                color: "#64748b",
                                fontSize: "0.8rem",
                                fontWeight: "bold",
                              }}
                            >
                              {language === "zh"
                                ? "🔔 下次结清日"
                                : language === "my"
                                  ? "🔔 နောက်တစ်ကြိမ်ရှင်းလင်းရမည့်ရက်"
                                  : "🔔 Next Settlement"}
                            </span>
                            <span
                              style={{
                                color: isOverdue ? "#ef4444" : "#10b981",
                                fontWeight: "900",
                                fontSize: "1rem",
                                textShadow: isOverdue
                                  ? "0 0 10px rgba(239, 68, 68, 0.3)"
                                  : "none",
                              }}
                            >
                              {nextDate.toLocaleDateString("zh-CN", {
                                month: "2-digit",
                                day: "2-digit",
                              })}
                              {isOverdue && (
                                <span
                                  style={{
                                    fontSize: "0.7rem",
                                    marginLeft: "4px",
                                  }}
                                >
                                  ({language === "zh" ? "逾期" : "Overdue"})
                                </span>
                              )}
                            </span>
                          </div>
                        );
                      })()}
                    </div>

                    {store.unclearedAmount > 0 && (
                      <button
                        onClick={() =>
                          !isRegionalUser &&
                          handleSettleMerchant(store.id, store.store_name)
                        }
                        disabled={isRegionalUser}
                        style={{
                          width: "100%",
                          padding: "12px",
                          borderRadius: "12px",
                          border: "none",
                          background: isRegionalUser
                            ? "#f1f5f9"
                            : "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
                          color: isRegionalUser
                            ? "#cbd5e1"
                            : "white",
                          fontWeight: "bold",
                          cursor: isRegionalUser ? "not-allowed" : "pointer",
                          marginTop: "auto",
                          boxShadow: isRegionalUser
                            ? "none"
                            : "0 4px 15px rgba(239, 68, 68, 0.4)",
                          transition: "all 0.3s ease",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "4px",
                        }}
                        onMouseOver={(e) => {
                          if (!isRegionalUser)
                            e.currentTarget.style.transform = "scale(1.02)";
                        }}
                        onMouseOut={(e) => {
                          if (!isRegionalUser)
                            e.currentTarget.style.transform = "scale(1)";
                        }}
                      >
                        <span>
                          {t.confirmSettle} (
                          {store.unclearedAmount.toLocaleString()} MMK)
                        </span>
                        {isRegionalUser && (
                          <span
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: "normal",
                              opacity: 0.8,
                            }}
                          >
                            🔒{" "}
                            {language === "zh"
                              ? "仅限总公司管理员操作"
                              : language === "my"
                                ? "ပင်မရုံးချုပ် စီမံခန့်ခွဲသူသာ ဆောင်ရွက်နိုင်သည်"
                                : "HQ Admin Only"}
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                ))}

                {merchantsCollectionStats.length === 0 && (
                  <div
                    style={{
                      gridColumn: "1 / -1",
                      textAlign: "center",
                      padding: "60px",
                      color: "#64748b",
                    }}
                  >
                    {language === "zh"
                      ? "暂无合伙店铺数据"
                      : language === "my"
                        ? "လုပ်ဖော်ကိုင်ဖက်ဆိုင် အချက်အလက် မရှိသေးပါ"
                        : "No merchants store data"}
                  </div>
                )}
              </div>
            )}
          </div>
  );
};

export default FinanceMerchantsCollectionTab;
