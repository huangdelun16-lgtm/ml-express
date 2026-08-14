// @ts-nocheck — 从 FinanceManagement 原样搬出的 Tab JSX；类型由父组件工作区承担。
import React from "react";

import { useFinanceWorkspace } from "./FinanceWorkspace";

const FinancePackageRecordsTab: React.FC = () => {
  const {
    activeTab,
    deliveredIncome,
    deliveredPackages,
    deliveredPackagesSorted,
    inProgressIncome,
    inProgressPackages,
    isMobile,
    language,
    packageDisplayEnd,
    packageDisplayStart,
    packagePaymentFilter,
    packageRecordsPerPage,
    packageCurrentPackages,
    packageCurrentPage,
    packageTotalPages,
    setPackagePaymentFilter,
    setPackageRecordsPage,
    setPackageRecordsPerPage,
    t,
    width
  } = useFinanceWorkspace();

  return (
          <div
            style={{
              background: "rgba(255, 255, 255, 0.12)",
              borderRadius: "20px",
              padding: "24px",
              border: "1px solid rgba(255, 255, 255, 0.18)",
              boxShadow: "0 12px 35px rgba(7, 23, 55, 0.45)",
            }}
          >
            <h3 style={{ marginTop: 0, color: "white", marginBottom: "20px" }}>
              📦 {t.packageRecords}
            </h3>

            {/* 包裹收入统计 */}
            <div style={{ marginBottom: "24px" }}>
              <h4
                style={{
                  color: "rgba(255, 255, 255, 0.9)",
                  marginBottom: "12px",
                }}
              >
                {t.packageIncomeOverview || "包裹收入统计"}
              </h4>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "1fr"
                    : "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: isMobile ? "12px" : "16px",
                  marginBottom: "16px",
                }}
              >
                <div
                  style={{
                    background: "rgba(34, 197, 94, 0.2)",
                    border: "1px solid rgba(34, 197, 94, 0.3)",
                    borderRadius: "12px",
                    padding: "16px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      color: "#22c55e",
                      fontSize: "1.5rem",
                      fontWeight: "bold",
                    }}
                  >
                    {deliveredPackages.length}
                  </div>
                  <div
                    style={{
                      color: "rgba(255, 255, 255, 0.8)",
                      fontSize: "0.9rem",
                    }}
                  >
                    {t.deliveredCount}
                  </div>
                </div>
                <div
                  style={{
                    background: "rgba(34, 197, 94, 0.2)",
                    border: "1px solid rgba(34, 197, 94, 0.3)",
                    borderRadius: "12px",
                    padding: "16px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      color: "#22c55e",
                      fontSize: "1.5rem",
                      fontWeight: "bold",
                    }}
                  >
                    {deliveredIncome.toLocaleString()} MMK
                  </div>
                  <div
                    style={{
                      color: "rgba(255, 255, 255, 0.8)",
                      fontSize: "0.9rem",
                    }}
                  >
                    {t.deliveredIncome}
                  </div>
                </div>
                <div
                  style={{
                    background: "rgba(251, 191, 36, 0.2)",
                    border: "1px solid rgba(251, 191, 36, 0.3)",
                    borderRadius: "12px",
                    padding: "16px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      color: "#fbbf24",
                      fontSize: "1.5rem",
                      fontWeight: "bold",
                    }}
                  >
                    {inProgressPackages.length}
                  </div>
                  <div
                    style={{
                      color: "rgba(255, 255, 255, 0.8)",
                      fontSize: "0.9rem",
                    }}
                  >
                    {t.inProgressCount}
                  </div>
                </div>
                <div
                  style={{
                    background: "rgba(251, 191, 36, 0.2)",
                    border: "1px solid rgba(251, 191, 36, 0.3)",
                    borderRadius: "12px",
                    padding: "16px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      color: "#fbbf24",
                      fontSize: "1.5rem",
                      fontWeight: "bold",
                    }}
                  >
                    {inProgressIncome.toLocaleString()} MMK
                  </div>
                  <div
                    style={{
                      color: "rgba(255, 255, 255, 0.8)",
                      fontSize: "0.9rem",
                    }}
                  >
                    {t.expectedIncome}
                  </div>
                </div>
              </div>
            </div>

            {/* 包裹收支记录表格 */}
            <div style={{ marginTop: "24px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "12px",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <h4 style={{ color: "rgba(255, 255, 255, 0.9)", margin: 0 }}>
                  {language === "zh"
                    ? "包裹收入记录"
                    : language === "my"
                      ? "ပစ္စည်းပို့ဆောင်မှု ဝင်ငွေမှတ်တမ်း"
                      : "Package Income Records"}
                </h4>
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <label
                    style={{
                      color: "rgba(255, 255, 255, 0.8)",
                      fontSize: "0.9rem",
                    }}
                  >
                    {language === "zh"
                      ? "支付方式"
                      : language === "my"
                        ? "ပေးချေမှု"
                        : "Payment"}
                  </label>
                  <select
                    value={packagePaymentFilter}
                    onChange={(e) =>
                      setPackagePaymentFilter(
                        e.target.value as "all" | "cash" | "balance",
                      )
                    }
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255, 255, 255, 0.25)",
                      background: "rgba(7, 23, 53, 0.65)",
                      color: "white",
                      fontSize: "0.9rem",
                      cursor: "pointer",
                    }}
                  >
                    <option
                      value="all"
                      style={{ background: "#0f1729", color: "white" }}
                    >
                      {language === "zh"
                        ? "全部"
                        : language === "my"
                          ? "အားလုံး"
                          : "All"}
                    </option>
                    <option
                      value="cash"
                      style={{ background: "#0f1729", color: "white" }}
                    >
                      {language === "zh"
                        ? "现金支付"
                        : language === "my"
                          ? "ငွေသား"
                          : "Cash"}
                    </option>
                    <option
                      value="balance"
                      style={{ background: "#0f1729", color: "white" }}
                    >
                      {language === "zh"
                        ? "余额支付"
                        : language === "my"
                          ? "လက်ကျန်ငွေ"
                          : "Balance"}
                    </option>
                  </select>
                  <label
                    style={{
                      color: "rgba(255, 255, 255, 0.8)",
                      fontSize: "0.9rem",
                    }}
                  >
                    {t.recordsPerPage}：
                  </label>
                  <select
                    value={packageRecordsPerPage}
                    onChange={(e) => {
                      setPackageRecordsPerPage(Number(e.target.value));
                      setPackageRecordsPage(1); // 重置到第一页
                    }}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255, 255, 255, 0.25)",
                      background: "rgba(7, 23, 53, 0.65)",
                      color: "white",
                      fontSize: "0.9rem",
                      cursor: "pointer",
                    }}
                  >
                    <option
                      value={10}
                      style={{ background: "#0f1729", color: "white" }}
                    >
                      10
                    </option>
                    <option
                      value={20}
                      style={{ background: "#0f1729", color: "white" }}
                    >
                      20
                    </option>
                    <option
                      value={50}
                      style={{ background: "#0f1729", color: "white" }}
                    >
                      50
                    </option>
                    <option
                      value={100}
                      style={{ background: "#0f1729", color: "white" }}
                    >
                      100
                    </option>
                  </select>
                </div>
              </div>
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  borderRadius: "12px",
                  overflow: "hidden",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "rgba(255, 255, 255, 0.1)" }}>
                      <th
                        style={{
                          padding: "12px",
                          textAlign: "left",
                          color: "white",
                          fontSize: "0.9rem",
                        }}
                      >
                        {t.orderId}
                      </th>
                      <th
                        style={{
                          padding: "12px",
                          textAlign: "left",
                          color: "white",
                          fontSize: "0.9rem",
                        }}
                      >
                        {language === "my" ? "ပို့ဆောင်သူ" : "寄件人"}
                      </th>
                      <th
                        style={{
                          padding: "12px",
                          textAlign: "left",
                          color: "white",
                          fontSize: "0.9rem",
                        }}
                      >
                        {language === "my" ? "လက်ခံသူ" : "收件人"}
                      </th>
                      <th
                        style={{
                          padding: "12px",
                          textAlign: "left",
                          color: "white",
                          fontSize: "0.9rem",
                        }}
                      >
                        {language === "my" ? "ပစ္စည်းအမျိုးအစား" : "包裹类型"}
                      </th>
                      <th
                        style={{
                          padding: "12px",
                          textAlign: "left",
                          color: "white",
                          fontSize: "0.9rem",
                        }}
                      >
                        {t.amount}
                      </th>
                      <th
                        style={{
                          padding: "12px",
                          textAlign: "left",
                          color: "white",
                          fontSize: "0.9rem",
                        }}
                      >
                        {language === "zh"
                          ? "支付方式"
                          : language === "my"
                            ? "ပေးချေမှု"
                            : "Payment"}
                      </th>
                      <th
                        style={{
                          padding: "12px",
                          textAlign: "left",
                          color: "white",
                          fontSize: "0.9rem",
                        }}
                      >
                        {t.status}
                      </th>
                      <th
                        style={{
                          padding: "12px",
                          textAlign: "left",
                          color: "white",
                          fontSize: "0.9rem",
                        }}
                      >
                        {language === "my" ? "ပို့ဆောင်ချိန်" : "送达时间"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveredPackagesSorted.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          style={{
                            padding: "24px",
                            textAlign: "center",
                            color: "rgba(255, 255, 255, 0.6)",
                          }}
                        >
                          {t.noRecords}
                        </td>
                      </tr>
                    ) : (
                      packageCurrentPackages.map((pkg) => {
                        const price = parseFloat(
                          pkg.price?.replace(/[^\d.]/g, "") || "0",
                        );
                        const isCashPayment = pkg.payment_method === "cash";
                        return (
                          <tr
                            key={pkg.id}
                            style={{
                              borderBottom:
                                "1px solid rgba(255, 255, 255, 0.1)",
                            }}
                          >
                            <td
                              style={{
                                padding: "12px",
                                color: "rgba(255, 255, 255, 0.8)",
                                fontSize: "0.9rem",
                              }}
                            >
                              {pkg.id}
                            </td>
                            <td
                              style={{
                                padding: "12px",
                                color: "rgba(255, 255, 255, 0.8)",
                                fontSize: "0.9rem",
                              }}
                            >
                              {pkg.sender_name}
                            </td>
                            <td
                              style={{
                                padding: "12px",
                                color: "rgba(255, 255, 255, 0.8)",
                                fontSize: "0.9rem",
                              }}
                            >
                              {pkg.receiver_name}
                            </td>
                            <td
                              style={{
                                padding: "12px",
                                color: "rgba(255, 255, 255, 0.8)",
                                fontSize: "0.9rem",
                              }}
                            >
                              {pkg.package_type}
                            </td>
                            <td
                              style={{
                                padding: "12px",
                                color: "rgba(255, 255, 255, 0.8)",
                                fontSize: "0.9rem",
                              }}
                            >
                              <span
                                style={{ color: "#22c55e", fontWeight: "bold" }}
                              >
                                {price.toLocaleString()} MMK
                              </span>
                            </td>
                            <td
                              style={{
                                padding: "12px",
                                color: "rgba(255, 255, 255, 0.8)",
                                fontSize: "0.9rem",
                              }}
                            >
                              <span
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: "6px",
                                  fontSize: "0.8rem",
                                  background: isCashPayment
                                    ? "rgba(59, 130, 246, 0.2)"
                                    : "rgba(16, 185, 129, 0.2)",
                                  color: isCashPayment ? "#60a5fa" : "#34d399",
                                }}
                              >
                                {isCashPayment
                                  ? language === "zh"
                                    ? "现金支付"
                                    : language === "my"
                                      ? "ငွေသား"
                                      : "Cash"
                                  : language === "zh"
                                    ? "余额支付"
                                    : language === "my"
                                      ? "လက်ကျန်ငွေ"
                                      : "Balance"}
                              </span>
                            </td>
                            <td
                              style={{
                                padding: "12px",
                                color: "rgba(255, 255, 255, 0.8)",
                                fontSize: "0.9rem",
                              }}
                            >
                              <span
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: "6px",
                                  fontSize: "0.8rem",
                                  background: "rgba(34, 197, 94, 0.2)",
                                  color: "#22c55e",
                                }}
                              >
                                {t.completed}
                              </span>
                            </td>
                            <td
                              style={{
                                padding: "12px",
                                color: "rgba(255, 255, 255, 0.8)",
                                fontSize: "0.9rem",
                              }}
                            >
                              {pkg.delivery_time || "-"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* 分页控件 */}
              {packageTotalPages <= 1
                ? null
                : (() => {
                    const getPageNumbers = () => {
                      const pages: (number | string)[] = [];
                      const maxVisible = 5;

                      if (packageTotalPages <= maxVisible) {
                        // 如果总页数少于等于5，显示所有页码
                        for (let i = 1; i <= packageTotalPages; i++) {
                          pages.push(i);
                        }
                      } else {
                        // 总是显示第一页
                        pages.push(1);

                        if (packageCurrentPage > 3) {
                          pages.push("...");
                        }

                        // 显示当前页前后各1页
                        const start = Math.max(2, packageCurrentPage - 1);
                        const end = Math.min(
                          packageTotalPages - 1,
                          packageCurrentPage + 1,
                        );

                        for (let i = start; i <= end; i++) {
                          pages.push(i);
                        }

                        if (packageCurrentPage < packageTotalPages - 2) {
                          pages.push("...");
                        }

                        // 总是显示最后一页
                        pages.push(packageTotalPages);
                      }

                      return pages;
                    };

                    return (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginTop: "20px",
                          padding: "16px",
                          background: "rgba(255, 255, 255, 0.05)",
                          borderRadius: "12px",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          flexWrap: "wrap",
                          gap: "12px",
                        }}
                      >
                        <div
                          style={{
                            color: "rgba(255, 255, 255, 0.8)",
                            fontSize: "0.9rem",
                          }}
                        >
                          {language === "zh"
                            ? `显示第 ${packageDisplayStart} - ${packageDisplayEnd} 条，共 ${deliveredPackagesSorted.length} 条记录`
                            : language === "my"
                              ? deliveredPackagesSorted.length +
                                " ခု အနက် " +
                                packageDisplayStart +
                                " မှ " +
                                packageDisplayEnd +
                                " အထိ ပြသနေသည်"
                              : `Showing ${packageDisplayStart} to ${packageDisplayEnd} of ${deliveredPackagesSorted.length}`}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            alignItems: "center",
                            flexWrap: "wrap",
                          }}
                        >
                          {/* 上一页按钮 */}
                          <button
                            onClick={() =>
                              setPackageRecordsPage((prev) =>
                                Math.max(1, prev - 1),
                              )
                            }
                            disabled={packageCurrentPage === 1}
                            style={{
                              padding: "8px 16px",
                              borderRadius: "8px",
                              border: "1px solid rgba(255, 255, 255, 0.25)",
                              background:
                                packageCurrentPage === 1
                                  ? "rgba(255, 255, 255, 0.1)"
                                  : "rgba(59, 130, 246, 0.2)",
                              color:
                                packageCurrentPage === 1
                                  ? "rgba(255, 255, 255, 0.4)"
                                  : "white",
                              cursor:
                                packageCurrentPage === 1
                                  ? "not-allowed"
                                  : "pointer",
                              fontSize: "0.9rem",
                              fontWeight: "600",
                              transition: "all 0.2s",
                            }}
                          >
                            {language === "zh"
                              ? "← 上一页"
                              : language === "my"
                                ? "← ယခင်"
                                : "← Prev"}
                          </button>

                          {/* 页码按钮 */}
                          {getPageNumbers().map((page, index) => {
                            if (page === "...") {
                              return (
                                <span
                                  key={`ellipsis-${index}`}
                                  style={{
                                    color: "rgba(255, 255, 255, 0.6)",
                                    padding: "0 8px",
                                    fontSize: "0.9rem",
                                  }}
                                >
                                  ...
                                </span>
                              );
                            }

                            const pageNum = page as number;
                            const isActive = pageNum === packageCurrentPage;

                            return (
                              <button
                                key={pageNum}
                                onClick={() => setPackageRecordsPage(pageNum)}
                                style={{
                                  minWidth: "40px",
                                  padding: "8px 12px",
                                  borderRadius: "8px",
                                  border: "1px solid rgba(255, 255, 255, 0.25)",
                                  background: isActive
                                    ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                                    : "rgba(255, 255, 255, 0.1)",
                                  color: "white",
                                  cursor: "pointer",
                                  fontSize: "0.9rem",
                                  fontWeight: isActive ? "bold" : "normal",
                                  transition: "all 0.2s",
                                }}
                                onMouseOver={(e) => {
                                  if (!isActive) {
                                    e.currentTarget.style.background =
                                      "rgba(255, 255, 255, 0.15)";
                                  }
                                }}
                                onMouseOut={(e) => {
                                  if (!isActive) {
                                    e.currentTarget.style.background =
                                      "rgba(255, 255, 255, 0.1)";
                                  }
                                }}
                              >
                                {pageNum}
                              </button>
                            );
                          })}

                          {/* 下一页按钮 */}
                          <button
                            onClick={() =>
                              setPackageRecordsPage((prev) =>
                                Math.min(packageTotalPages, prev + 1),
                              )
                            }
                            disabled={packageCurrentPage === packageTotalPages}
                            style={{
                              padding: "8px 16px",
                              borderRadius: "8px",
                              border: "1px solid rgba(255, 255, 255, 0.25)",
                              background:
                                packageCurrentPage === packageTotalPages
                                  ? "rgba(255, 255, 255, 0.1)"
                                  : "rgba(59, 130, 246, 0.2)",
                              color:
                                packageCurrentPage === packageTotalPages
                                  ? "rgba(255, 255, 255, 0.4)"
                                  : "white",
                              cursor:
                                packageCurrentPage === packageTotalPages
                                  ? "not-allowed"
                                  : "pointer",
                              fontSize: "0.9rem",
                              fontWeight: "600",
                              transition: "all 0.2s",
                            }}
                          >
                            {language === "zh"
                              ? "下一页 →"
                              : language === "my"
                                ? "နောက်သို့ →"
                                : "Next →"}
                          </button>
                        </div>
                      </div>
                    );
                  })()}
            </div>
          </div>
  );
};

export default FinancePackageRecordsTab;
