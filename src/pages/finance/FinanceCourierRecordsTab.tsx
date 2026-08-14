// @ts-nocheck — 从 FinanceManagement 原样搬出的 Tab JSX；类型由父组件工作区承担。
import React from "react";
import { courierSalaryService } from "../../services/supabase";
import { feedbackService } from "../../services/FeedbackService";
import { getRegionalPricingForPackage, getRiderDeliveryShareMmk, getRiderShareBaseFeeMmk, getDateKey } from "../FinanceManagement.helpers";
import { useFinanceWorkspace } from "./FinanceWorkspace";

const FinanceCourierRecordsTab: React.FC = () => {
  const {
    activeTab,
    cashCollectionDate,
    courierSalaries,
    courierSalaryGroups,
    currentRegionPrefix,
    extrasLoading,
    formatMonthDisplay,
    generateMonthlySalaries,
    getAvailableMonths,
    getFilteredSalariesByMonth,
    handleOpenSalaryGeneration,
    isMobile,
    isRegionalUser,
    language,
    loadRecords,
    loading,
    packages,
    paymentForm,
    pricingSettingsDisplay,
    records,
    regionalPricingMap,
    salaryFilterStatus,
    selectedCouriersForSalary,
    selectedSalaries,
    selectedSalary,
    selectedSalaryMonth,
    setLoading,
    setPaymentForm,
    setSalaryDetails,
    setSalaryFilterStatus,
    setSelectedCouriersForSalary,
    setSelectedSalaries,
    setSelectedSalary,
    setSelectedSalaryMonth,
    setShowPaymentModal,
    setShowSalaryDetail,
    setShowSalarySelectionModal,
    showPaymentModal,
    showSalaryDetail,
    showSalarySelectionModal,
    summary,
    t,
    width
  } = useFinanceWorkspace();

  return (
          <div>
            {/* 顶部操作栏 */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.12)",
                borderRadius: "16px",
                padding: isMobile ? "12px" : "20px",
                marginBottom: "24px",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                display: "flex",
                gap: isMobile ? "12px" : "16px",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <h3 style={{ margin: 0, color: "white", flex: "1 1 auto" }}>
                💰 {t.courierFinanceRecords}
              </h3>

              {/* 状态筛选 */}
              <select
                value={salaryFilterStatus}
                onChange={(e) => setSalaryFilterStatus(e.target.value as any)}
                style={{
                  padding: "10px 16px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                  background: "rgba(7, 23, 53, 0.65)",
                  color: "white",
                  fontSize: "0.9rem",
                }}
              >
                <option value="all" style={{ color: "#000" }}>
                  {t.allStatus}
                </option>
                <option value="pending" style={{ color: "#000" }}>
                  {t.pending}
                </option>
                <option value="approved" style={{ color: "#000" }}>
                  {language === "zh"
                    ? "已审核"
                    : language === "my"
                      ? "အတည်ပြုပြီး"
                      : "Approved"}
                </option>
                <option value="paid" style={{ color: "#000" }}>
                  {t.settled}
                </option>
                <option value="rejected" style={{ color: "#000" }}>
                  {language === "zh"
                    ? "已拒绝"
                    : language === "my"
                      ? "ငြင်းပယ်ခံရသည်"
                      : "Rejected"}
                </option>
              </select>

              {/* 生成工资按钮 */}
              {!isRegionalUser && (
                <button
                  onClick={handleOpenSalaryGeneration}
                  disabled={loading}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "10px",
                    border: "none",
                    background: loading
                      ? "rgba(102, 126, 234, 0.5)"
                      : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    transition: "all 0.3s ease",
                  }}
                >
                  🔄 {t.generateSalaries}
                </button>
              )}

              {selectedSalaries.length > 0 && !isRegionalUser && (
                <>
                  <button
                    onClick={async () => {
                      if (
                        !window.confirm(
                          `是否批量审核 ${selectedSalaries.length} 条工资记录？`,
                        )
                      )
                        return;

                      setLoading(true);
                      try {
                        const success =
                          await courierSalaryService.batchApproveSalaries(
                            selectedSalaries,
                            localStorage.getItem("admin_name") || "System",
                          );

                        if (success) {
                          feedbackService.notify("批量审核成功！");
                          await loadRecords();
                          setSelectedSalaries([]);
                        } else {
                          feedbackService.notify("批量审核失败！");
                        }
                      } catch (error) {
                        console.error("批量审核失败:", error);
                        feedbackService.notify("批量审核失败！");
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "10px",
                      border: "none",
                      background:
                        "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
                      color: "white",
                      cursor: loading ? "not-allowed" : "pointer",
                      fontSize: "0.9rem",
                      fontWeight: "600",
                    }}
                  >
                    ✅ 批量审核 ({selectedSalaries.length})
                  </button>

                  <button
                    onClick={() => setShowPaymentModal(true)}
                    disabled={loading}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "10px",
                      border: "none",
                      background:
                        "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                      color: "white",
                      cursor: loading ? "not-allowed" : "pointer",
                      fontSize: "0.9rem",
                      fontWeight: "600",
                    }}
                  >
                    💳 批量发放 ({selectedSalaries.length})
                  </button>

                  <button
                    onClick={async () => {
                      if (
                        !window.confirm(
                          `确定要批量删除 ${selectedSalaries.length} 条工资记录吗？\n此操作不可恢复！`,
                        )
                      )
                        return;

                      setLoading(true);
                      try {
                        let successCount = 0;
                        let failCount = 0;

                        // 逐个删除选中的工资记录
                        for (const salaryId of selectedSalaries) {
                          try {
                            const success =
                              await courierSalaryService.deleteSalary(salaryId);
                            if (success) {
                              successCount++;
                            } else {
                              failCount++;
                            }
                          } catch (error) {
                            console.error(
                              `删除工资记录 ${salaryId} 失败:`,
                              error,
                            );
                            failCount++;
                          }
                        }

                        // 显示删除结果
                        if (failCount === 0) {
                          feedbackService.notify(
                            `批量删除成功！共删除 ${successCount} 条记录。`,
                          );
                        } else {
                          feedbackService.notify(
                            `批量删除完成！成功：${successCount} 条，失败：${failCount} 条。`,
                          );
                        }

                        // 重新加载数据并清空选择
                        await loadRecords();
                        setSelectedSalaries([]);
                      } catch (error) {
                        console.error("批量删除失败:", error);
                        feedbackService.notify("批量删除失败！");
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "10px",
                      border: "none",
                      background:
                        "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                      color: "white",
                      cursor: loading ? "not-allowed" : "pointer",
                      fontSize: "0.9rem",
                      fontWeight: "600",
                      transition: "all 0.3s ease",
                    }}
                  >
                    🗑️ 批量删除 ({selectedSalaries.length})
                  </button>
                </>
              )}
            </div>

            {/* 月份选择器 */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.12)",
                borderRadius: "16px",
                padding: isMobile ? "12px" : "20px",
                marginBottom: "24px",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                display: "flex",
                gap: "16px",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <label
                style={{
                  color: "white",
                  fontSize: "0.95rem",
                  fontWeight: "600",
                }}
              >
                📅 {t.selectMonth}：
              </label>
              <select
                value={selectedSalaryMonth}
                onChange={(e) => {
                  setSelectedSalaryMonth(e.target.value);
                  setSelectedSalaries([]); // 切换月份时清空选择
                }}
                style={{
                  padding: "10px 16px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                  background: "rgba(7, 23, 53, 0.65)",
                  color: "white",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  minWidth: "180px",
                }}
              >
                {getAvailableMonths().map((month) => (
                  <option
                    key={month}
                    value={month}
                    style={{ background: "#0f1729", color: "white" }}
                  >
                    {formatMonthDisplay(month)}
                  </option>
                ))}
              </select>
              <div
                style={{
                  color: "rgba(255, 255, 255, 0.7)",
                  fontSize: "0.85rem",
                  marginLeft: "auto",
                }}
              >
                {language === "zh"
                  ? `共 ${getFilteredSalariesByMonth(courierSalaries, selectedSalaryMonth).length} 条记录`
                  : language === "my"
                    ? "စုစုပေါင်း " +
                      getFilteredSalariesByMonth(
                        courierSalaries,
                        selectedSalaryMonth,
                      ).length +
                      " ခု"
                    : `Total ${getFilteredSalariesByMonth(courierSalaries, selectedSalaryMonth).length} records`}
              </div>
            </div>

            {/* 工资统计卡片 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(auto-fit, minmax(220px, 1fr))",
                gap: isMobile ? "12px" : "16px",
                marginBottom: "24px",
              }}
            >
              {(() => {
                let monthFilteredSalaries = getFilteredSalariesByMonth(
                  courierSalaries,
                  selectedSalaryMonth,
                );

                // 领区过滤
                if (isRegionalUser) {
                  monthFilteredSalaries = monthFilteredSalaries.filter(
                    (s) =>
                      s.courier_id &&
                      s.courier_id.startsWith(currentRegionPrefix),
                  );
                }

                return (
                  <>
                    <div
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.2) 100%)",
                        border: "1px solid rgba(251, 191, 36, 0.3)",
                        borderRadius: "16px",
                        padding: isMobile ? "12px" : "20px",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          color: "#fbbf24",
                          fontSize: isMobile ? "1.5rem" : "2rem",
                          fontWeight: "bold",
                          marginBottom: "8px",
                        }}
                      >
                        {
                          monthFilteredSalaries.filter(
                            (s) => s.status === "pending",
                          ).length
                        }
                      </div>
                      <div
                        style={{
                          color: "rgba(255, 255, 255, 0.9)",
                          fontSize: "0.95rem",
                        }}
                      >
                        {t.pending}
                      </div>
                    </div>

                    <div
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(22, 163, 74, 0.2) 100%)",
                        border: "1px solid rgba(34, 197, 94, 0.3)",
                        borderRadius: "16px",
                        padding: isMobile ? "12px" : "20px",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          color: "#22c55e",
                          fontSize: isMobile ? "1.5rem" : "2rem",
                          fontWeight: "bold",
                          marginBottom: "8px",
                        }}
                      >
                        {
                          monthFilteredSalaries.filter(
                            (s) => s.status === "approved",
                          ).length
                        }
                      </div>
                      <div
                        style={{
                          color: "rgba(255, 255, 255, 0.9)",
                          fontSize: "0.95rem",
                        }}
                      >
                        {language === "zh"
                          ? "已审核"
                          : language === "my"
                            ? "အတည်ပြုပြီး"
                            : "Approved"}
                      </div>
                    </div>

                    <div
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.2) 100%)",
                        border: "1px solid rgba(59, 130, 246, 0.3)",
                        borderRadius: "16px",
                        padding: isMobile ? "12px" : "20px",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          color: "#3b82f6",
                          fontSize: isMobile ? "1.5rem" : "2rem",
                          fontWeight: "bold",
                          marginBottom: "8px",
                        }}
                      >
                        {
                          monthFilteredSalaries.filter(
                            (s) => s.status === "paid",
                          ).length
                        }
                      </div>
                      <div
                        style={{
                          color: "rgba(255, 255, 255, 0.9)",
                          fontSize: "0.95rem",
                        }}
                      >
                        {t.settled}
                      </div>
                    </div>

                    <div
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(147, 51, 234, 0.2) 100%)",
                        border: "1px solid rgba(168, 85, 247, 0.3)",
                        borderRadius: "16px",
                        padding: isMobile ? "12px" : "20px",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          color: "#a855f7",
                          fontSize: "1.6rem",
                          fontWeight: "bold",
                          marginBottom: "8px",
                        }}
                      >
                        {monthFilteredSalaries
                          .reduce((sum, s) => sum + s.net_salary, 0)
                          .toLocaleString()}{" "}
                        MMK
                      </div>
                      <div
                        style={{
                          color: "rgba(255, 255, 255, 0.9)",
                          fontSize: "0.95rem",
                        }}
                      >
                        {language === "zh"
                          ? "工资总额"
                          : language === "my"
                            ? "စုစုပေါင်း လစာ"
                            : "Total Salary"}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* 工资记录表格 */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.12)",
                borderRadius: "16px",
                padding: "24px",
                marginBottom: "24px",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                overflow: "auto",
              }}
            >
              <h4
                style={{
                  margin: "0 0 16px 0",
                  color: "white",
                  fontSize: "1.1rem",
                }}
              >
                💼 {language === "my" ? "လစာမှတ်တမ်းဇယား" : "工资记录表"}
              </h4>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: "1200px",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "rgba(255, 255, 255, 0.1)",
                      borderBottom: "2px solid rgba(255, 255, 255, 0.2)",
                    }}
                  >
                    <th
                      style={{
                        padding: "14px 12px",
                        textAlign: "left",
                        color: "white",
                        fontSize: "0.9rem",
                        fontWeight: "600",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={(() => {
                          const monthFiltered = getFilteredSalariesByMonth(
                            courierSalaries,
                            selectedSalaryMonth,
                          );
                          const filtered = monthFiltered.filter(
                            (s) =>
                              salaryFilterStatus === "all" ||
                              s.status === salaryFilterStatus,
                          );
                          return (
                            selectedSalaries.length === filtered.length &&
                            filtered.length > 0
                          );
                        })()}
                        onChange={(e) => {
                          const monthFiltered = getFilteredSalariesByMonth(
                            courierSalaries,
                            selectedSalaryMonth,
                          );
                          const filtered = monthFiltered.filter(
                            (s) =>
                              salaryFilterStatus === "all" ||
                              s.status === salaryFilterStatus,
                          );
                          if (e.target.checked) {
                            setSelectedSalaries(
                              filtered
                                .map((s) => s.id!)
                                .filter((id) => id !== undefined),
                            );
                          } else {
                            setSelectedSalaries([]);
                          }
                        }}
                        style={{ cursor: "pointer" }}
                      />
                    </th>
                    <th
                      style={{
                        padding: "14px 12px",
                        textAlign: "left",
                        color: "white",
                        fontSize: "0.9rem",
                        fontWeight: "600",
                      }}
                    >
                      {t.riderId}
                    </th>
                    <th
                      style={{
                        padding: "14px 12px",
                        textAlign: "left",
                        color: "white",
                        fontSize: "0.9rem",
                        fontWeight: "600",
                      }}
                    >
                      {t.settlementPeriod}
                    </th>
                    <th
                      style={{
                        padding: "14px 12px",
                        textAlign: "right",
                        color: "white",
                        fontSize: "0.9rem",
                        fontWeight: "600",
                      }}
                    >
                      {t.baseSalary}
                    </th>
                    <th
                      style={{
                        padding: "14px 12px",
                        textAlign: "right",
                        color: "white",
                        fontSize: "0.9rem",
                        fontWeight: "600",
                      }}
                    >
                      {t.kmFee}
                    </th>
                    <th
                      style={{
                        padding: "14px 12px",
                        textAlign: "right",
                        color: "white",
                        fontSize: "0.9rem",
                        fontWeight: "600",
                      }}
                    >
                      {t.deliveryBonus}
                    </th>
                    <th
                      style={{
                        padding: "14px 12px",
                        textAlign: "right",
                        color: "white",
                        fontSize: "0.9rem",
                        fontWeight: "600",
                      }}
                    >
                      {language === "my" ? "စုစုပေါင်းလစာ" : "实发工资"}
                    </th>
                    <th
                      style={{
                        padding: "14px 12px",
                        textAlign: "center",
                        color: "white",
                        fontSize: "0.9rem",
                        fontWeight: "600",
                      }}
                    >
                      {t.deliveryCount}
                    </th>
                    <th
                      style={{
                        padding: "14px 12px",
                        textAlign: "center",
                        color: "white",
                        fontSize: "0.9rem",
                        fontWeight: "600",
                      }}
                    >
                      {t.status}
                    </th>
                    <th
                      style={{
                        padding: "14px 12px",
                        textAlign: "center",
                        color: "white",
                        fontSize: "0.9rem",
                        fontWeight: "600",
                      }}
                    >
                      {t.action}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // 先按月份过滤，再按状态过滤
                    let monthFiltered = getFilteredSalariesByMonth(
                      courierSalaries,
                      selectedSalaryMonth,
                    );

                    // 领区过滤
                    if (isRegionalUser) {
                      monthFiltered = monthFiltered.filter(
                        (s) =>
                          s.courier_id &&
                          s.courier_id.startsWith(currentRegionPrefix),
                      );
                    }

                    const filtered = monthFiltered.filter(
                      (s) =>
                        salaryFilterStatus === "all" ||
                        s.status === salaryFilterStatus,
                    );

                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td
                            colSpan={10}
                            style={{
                              padding: "40px",
                              textAlign: "center",
                              color: "rgba(255, 255, 255, 0.6)",
                              fontSize: "1rem",
                            }}
                          >
                            {selectedSalaryMonth
                              ? `暂无 ${formatMonthDisplay(selectedSalaryMonth)} 的工资记录`
                              : "暂无工资记录"}
                          </td>
                        </tr>
                      );
                    }

                    return filtered.map((salary) => (
                      <tr
                        key={salary.id}
                        style={{
                          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                          transition: "all 0.2s",
                        }}
                        onMouseOver={(e) =>
                          (e.currentTarget.style.background =
                            "rgba(255, 255, 255, 0.05)")
                        }
                        onMouseOut={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        <td style={{ padding: "14px 12px", color: "white" }}>
                          <input
                            type="checkbox"
                            checked={selectedSalaries.includes(salary.id!)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSalaries([
                                  ...selectedSalaries,
                                  salary.id!,
                                ]);
                              } else {
                                setSelectedSalaries(
                                  selectedSalaries.filter(
                                    (id) => id !== salary.id,
                                  ),
                                );
                              }
                            }}
                            style={{ cursor: "pointer" }}
                          />
                        </td>
                        <td
                          style={{
                            padding: "14px 12px",
                            color: "white",
                            fontSize: "0.9rem",
                            fontWeight: "600",
                          }}
                        >
                          {salary.courier_id}
                        </td>
                        <td
                          style={{
                            padding: "14px 12px",
                            color: "rgba(255, 255, 255, 0.8)",
                            fontSize: "0.85rem",
                          }}
                        >
                          {salary.period_start_date} ~ {salary.period_end_date}
                        </td>
                        <td
                          style={{
                            padding: "14px 12px",
                            textAlign: "right",
                            color: "rgba(255, 255, 255, 0.8)",
                            fontSize: "0.9rem",
                          }}
                        >
                          {salary.base_salary.toLocaleString()}
                        </td>
                        <td
                          style={{
                            padding: "14px 12px",
                            textAlign: "right",
                            color: "#74b9ff",
                            fontSize: "0.9rem",
                            fontWeight: "600",
                          }}
                        >
                          {salary.km_fee.toLocaleString()}
                        </td>
                        <td
                          style={{
                            padding: "14px 12px",
                            textAlign: "right",
                            color: "#a29bfe",
                            fontSize: "0.9rem",
                            fontWeight: "600",
                          }}
                        >
                          {salary.delivery_bonus.toLocaleString()}
                        </td>
                        <td
                          style={{
                            padding: "14px 12px",
                            textAlign: "right",
                            color: "#55efc4",
                            fontSize: "1rem",
                            fontWeight: "bold",
                          }}
                        >
                          {salary.net_salary.toLocaleString()} MMK
                        </td>
                        <td
                          style={{
                            padding: "14px 12px",
                            textAlign: "center",
                            color: "rgba(255, 255, 255, 0.8)",
                            fontSize: "0.9rem",
                          }}
                        >
                          {salary.total_deliveries} {t.packageSuffix || "单"}
                        </td>
                        <td
                          style={{ padding: "14px 12px", textAlign: "center" }}
                        >
                          <span
                            style={{
                              padding: "6px 12px",
                              borderRadius: "8px",
                              fontSize: "0.8rem",
                              fontWeight: "600",
                              background:
                                salary.status === "pending"
                                  ? "rgba(251, 191, 36, 0.2)"
                                  : salary.status === "approved"
                                    ? "rgba(34, 197, 94, 0.2)"
                                    : salary.status === "paid"
                                      ? "rgba(59, 130, 246, 0.2)"
                                      : "rgba(239, 68, 68, 0.2)",
                              color:
                                salary.status === "pending"
                                  ? "#fbbf24"
                                  : salary.status === "approved"
                                    ? "#22c55e"
                                    : salary.status === "paid"
                                      ? "#3b82f6"
                                      : "#ef4444",
                            }}
                          >
                            {salary.status === "pending"
                              ? t.pending
                              : salary.status === "approved"
                                ? language === "my"
                                  ? "အတည်ပြုပြီး"
                                  : "已审核"
                                : salary.status === "paid"
                                  ? t.settled
                                  : language === "my"
                                    ? "ငြင်းပယ်ခံရသည်"
                                    : "已拒绝"}
                          </span>
                        </td>
                        <td
                          style={{ padding: "14px 12px", textAlign: "center" }}
                        >
                          <div
                            style={{
                              display: "flex",
                              gap: "8px",
                              justifyContent: "center",
                            }}
                          >
                            <button
                              onClick={async () => {
                                setSelectedSalary(salary);
                                const details =
                                  await courierSalaryService.getSalaryDetails(
                                    salary.id!,
                                  );
                                setSalaryDetails(details);
                                setShowSalaryDetail(true);
                              }}
                              style={{
                                padding: "6px 12px",
                                borderRadius: "6px",
                                border: "none",
                                background: "rgba(59, 130, 246, 0.2)",
                                color: "#3b82f6",
                                cursor: "pointer",
                                fontSize: "0.8rem",
                                fontWeight: "600",
                              }}
                            >
                              {t.viewDetail || "详情"}
                            </button>

                            {!isRegionalUser && (
                              <>
                                {salary.status === "pending" && (
                                  <button
                                    onClick={async () => {
                                      if (
                                        !window.confirm(
                                          language === "my"
                                            ? "အတည်ပြုမှာ သေချာပါသလား?"
                                            : "确认审核通过？",
                                        )
                                      )
                                        return;

                                      setLoading(true);
                                      try {
                                        const success =
                                          await courierSalaryService.updateSalary(
                                            salary.id!,
                                            {
                                              status: "approved",
                                              approved_by:
                                                localStorage.getItem(
                                                  "admin_name",
                                                ) || "System",
                                              approved_at:
                                                new Date().toISOString(),
                                            },
                                          );

                                        if (success) {
                                          feedbackService.notify(
                                            language === "my"
                                              ? "အတည်ပြုခြင်း အောင်မြင်သည်!"
                                              : "审核成功！",
                                          );
                                          await loadRecords();
                                        } else {
                                          feedbackService.notify(
                                            language === "my"
                                              ? "အတည်ပြုခြင်း မအောင်မြင်ပါ!"
                                              : "审核失败！",
                                          );
                                        }
                                      } catch (error) {
                                        console.error("审核失败:", error);
                                        feedbackService.notify("审核失败！");
                                      } finally {
                                        setLoading(false);
                                      }
                                    }}
                                    style={{
                                      padding: "6px 12px",
                                      borderRadius: "6px",
                                      border: "none",
                                      background: "rgba(34, 197, 94, 0.2)",
                                      color: "#22c55e",
                                      cursor: "pointer",
                                      fontSize: "0.8rem",
                                      fontWeight: "600",
                                    }}
                                  >
                                    {t.audit || "审核"}
                                  </button>
                                )}

                                {salary.status === "approved" && (
                                  <button
                                    onClick={() => {
                                      setSelectedSalaries([salary.id!]);
                                      setShowPaymentModal(true);
                                    }}
                                    style={{
                                      padding: "6px 12px",
                                      borderRadius: "6px",
                                      border: "none",
                                      background: "rgba(245, 87, 108, 0.2)",
                                      color: "#f5576c",
                                      cursor: "pointer",
                                      fontSize: "0.8rem",
                                      fontWeight: "600",
                                    }}
                                  >
                                    发放
                                  </button>
                                )}

                                <button
                                  onClick={async () => {
                                    if (
                                      !window.confirm(
                                        `确定要删除骑手 ${salary.courier_id} 的工资记录吗？\n此操作不可恢复！`,
                                      )
                                    )
                                      return;

                                    setLoading(true);
                                    try {
                                      const success =
                                        await courierSalaryService.deleteSalary(
                                          salary.id!,
                                        );
                                      if (success) {
                                        feedbackService.notify("删除成功！");
                                        await loadRecords();
                                      } else {
                                        feedbackService.notify("删除失败！");
                                      }
                                    } catch (error) {
                                      console.error("删除工资记录失败:", error);
                                      feedbackService.notify("删除失败！");
                                    } finally {
                                      setLoading(false);
                                    }
                                  }}
                                  style={{
                                    padding: "6px 12px",
                                    borderRadius: "6px",
                                    border: "none",
                                    background: "rgba(239, 68, 68, 0.2)",
                                    color: "#ef4444",
                                    cursor: "pointer",
                                    fontSize: "0.8rem",
                                    fontWeight: "600",
                                  }}
                                >
                                  删除
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>

            {/* =============== 原有的统计信息 (保留) =============== */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.12)",
                borderRadius: "20px",
                padding: "24px",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                boxShadow: "0 12px 35px rgba(7, 23, 55, 0.45)",
              }}
            >
              <h3
                style={{ marginTop: 0, color: "white", marginBottom: "20px" }}
              >
                📊 骑手数据统计
              </h3>

              {/* 骑手送货费用统计 */}
              <div style={{ marginBottom: "24px" }}>
                <h4
                  style={{
                    color: "rgba(255, 255, 255, 0.9)",
                    marginBottom: "12px",
                  }}
                >
                  📍 骑手送货费用统计
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
                      background: "rgba(253, 121, 168, 0.2)",
                      border: "1px solid rgba(253, 121, 168, 0.3)",
                      borderRadius: "12px",
                      padding: "16px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        color: "#fd79a8",
                        fontSize: "1.5rem",
                        fontWeight: "bold",
                      }}
                    >
                      {summary.totalKm.toFixed(2)} KM
                    </div>
                    <div
                      style={{
                        color: "rgba(255, 255, 255, 0.8)",
                        fontSize: "0.9rem",
                      }}
                    >
                      总配送距离
                    </div>
                  </div>
                  <div
                    style={{
                      background: "rgba(253, 121, 168, 0.2)",
                      border: "1px solid rgba(253, 121, 168, 0.3)",
                      borderRadius: "12px",
                      padding: "16px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        color: "#fd79a8",
                        fontSize: "1.5rem",
                        fontWeight: "bold",
                      }}
                    >
                      {pricingSettingsDisplay.base_fee || 1500} MMK
                    </div>
                    <div
                      style={{
                        color: "rgba(255, 255, 255, 0.8)",
                        fontSize: "0.9rem",
                      }}
                    >
                      当前系统起步价（新单默认）
                    </div>
                  </div>
                  <div
                    style={{
                      background: "rgba(253, 121, 168, 0.2)",
                      border: "1px solid rgba(253, 121, 168, 0.3)",
                      borderRadius: "12px",
                      padding: "16px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        color: "#fd79a8",
                        fontSize: "1.5rem",
                        fontWeight: "bold",
                      }}
                    >
                      {summary.courierKmCost.toLocaleString()} MMK
                    </div>
                    <div
                      style={{
                        color: "rgba(255, 255, 255, 0.8)",
                        fontSize: "0.9rem",
                      }}
                    >
                      骑手分得总额 (总费 - 起步价)
                    </div>
                  </div>
                  <div
                    style={{
                      background: "rgba(253, 121, 168, 0.2)",
                      border: "1px solid rgba(253, 121, 168, 0.3)",
                      borderRadius: "12px",
                      padding: "16px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        color: "#fd79a8",
                        fontSize: "1.5rem",
                        fontWeight: "bold",
                      }}
                    >
                      {packages.filter((pkg) => pkg.status === "已送达").length}
                    </div>
                    <div
                      style={{
                        color: "rgba(255, 255, 255, 0.8)",
                        fontSize: "0.9rem",
                      }}
                    >
                      已送达包裹数
                    </div>
                  </div>
                </div>
              </div>

              {/* 骑手收入统计 (当月) */}
              <div style={{ marginBottom: "24px" }}>
                <h4
                  style={{
                    color: "rgba(255, 255, 255, 0.9)",
                    marginBottom: "12px",
                  }}
                >
                  💰 骑手收入统计 (当月)
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
                      {summary.monthlyRiderCount}
                    </div>
                    <div
                      style={{
                        color: "rgba(255, 255, 255, 0.8)",
                        fontSize: "0.9rem",
                      }}
                    >
                      当月送达总笔数
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
                      {summary.monthlyRiderFee.toLocaleString()} MMK
                    </div>
                    <div
                      style={{
                        color: "rgba(255, 255, 255, 0.8)",
                        fontSize: "0.9rem",
                      }}
                    >
                      当月骑手收入总额
                    </div>
                  </div>
                </div>
              </div>

              {/* 骑手收入统计 (当日) */}
              <div style={{ marginBottom: "24px" }}>
                <h4
                  style={{
                    color: "rgba(255, 255, 255, 0.9)",
                    marginBottom: "12px",
                  }}
                >
                  ⏰ 骑手收入统计 (当日 - {cashCollectionDate})
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
                      background: "rgba(251, 197, 49, 0.15)",
                      border: "1px solid rgba(251, 197, 49, 0.3)",
                      borderRadius: "12px",
                      padding: "16px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        color: "#fbc531",
                        fontSize: "1.5rem",
                        fontWeight: "bold",
                      }}
                    >
                      {summary.dailyRiderCount}
                    </div>
                    <div
                      style={{
                        color: "rgba(255, 255, 255, 0.8)",
                        fontSize: "0.9rem",
                      }}
                    >
                      当日送达总笔数
                    </div>
                  </div>
                  <div
                    style={{
                      background: "rgba(251, 197, 49, 0.15)",
                      border: "1px solid rgba(251, 197, 49, 0.3)",
                      borderRadius: "12px",
                      padding: "16px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        color: "#fbc531",
                        fontSize: "1.5rem",
                        fontWeight: "bold",
                      }}
                    >
                      {summary.dailyRiderFee.toLocaleString()} MMK
                    </div>
                    <div
                      style={{
                        color: "rgba(255, 255, 255, 0.8)",
                        fontSize: "0.9rem",
                      }}
                    >
                      当日骑手收入总额
                    </div>
                  </div>
                </div>
              </div>

              {/* 骑手送货费用明细表 */}
              <div style={{ marginTop: "24px", marginBottom: "24px" }}>
                <h4
                  style={{
                    color: "rgba(255, 255, 255, 0.9)",
                    marginBottom: "12px",
                  }}
                >
                  📋 骑手送货费用明细 (按骑手统计)
                </h4>
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
                          骑手ID
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            color: "white",
                            fontSize: "0.9rem",
                          }}
                        >
                          送达包裹数
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            color: "white",
                            fontSize: "0.9rem",
                          }}
                        >
                          总送货距离
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            color: "white",
                            fontSize: "0.9rem",
                          }}
                        >
                          骑手收入 (总费 - 起步价)
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            color: "white",
                            fontSize: "0.9rem",
                          }}
                        >
                          平均每单距离
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        // 按骑手分组统计
                        const courierStats: Record<
                          string,
                          {
                            count: number;
                            totalKm: number;
                            totalRiderFee: number;
                          }
                        > = {};

                        packages
                          .filter(
                            (pkg) =>
                              pkg.status === "已送达" &&
                              pkg.courier &&
                              pkg.courier !== "待分配",
                          )
                          .forEach((pkg) => {
                            const courierId = pkg.courier;
                            if (!courierStats[courierId]) {
                              courierStats[courierId] = {
                                count: 0,
                                totalKm: 0,
                                totalRiderFee: 0,
                              };
                            }

                            const regional = getRegionalPricingForPackage(
                              pkg,
                              regionalPricingMap,
                            );
                            const settingsBaseFee = regional.base_fee || 1500;
                            const riderFee = getRiderDeliveryShareMmk(
                              pkg,
                              settingsBaseFee,
                              regional,
                            );

                            courierStats[courierId].count++;
                            courierStats[courierId].totalKm +=
                              pkg.delivery_distance || 0;
                            courierStats[courierId].totalRiderFee += riderFee;
                          });

                        const courierList = Object.entries(courierStats).sort(
                          (a, b) => b[1].totalRiderFee - a[1].totalRiderFee,
                        );

                        if (courierList.length === 0) {
                          return (
                            <tr>
                              <td
                                colSpan={5}
                                style={{
                                  padding: "24px",
                                  textAlign: "center",
                                  color: "rgba(255, 255, 255, 0.6)",
                                }}
                              >
                                暂无骑手配送记录
                              </td>
                            </tr>
                          );
                        }

                        return courierList.map(([courierId, stats]) => {
                          const avgKm = stats.totalKm / stats.count;

                          return (
                            <tr
                              key={courierId}
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
                                  fontWeight: "bold",
                                }}
                              >
                                {courierId}
                              </td>
                              <td
                                style={{
                                  padding: "12px",
                                  color: "rgba(255, 255, 255, 0.8)",
                                  fontSize: "0.9rem",
                                }}
                              >
                                {stats.count} 个
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
                                    color: "#74b9ff",
                                    fontWeight: "bold",
                                  }}
                                >
                                  {stats.totalKm.toFixed(2)} KM
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
                                    color: "#fd79a8",
                                    fontWeight: "bold",
                                  }}
                                >
                                  {stats.totalRiderFee.toLocaleString()} MMK
                                </span>
                              </td>
                              <td
                                style={{
                                  padding: "12px",
                                  color: "rgba(255, 255, 255, 0.8)",
                                  fontSize: "0.9rem",
                                }}
                              >
                                {avgKm.toFixed(2)} KM
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 骑手当日送货费用明细表 */}
              <div style={{ marginTop: "24px" }}>
                <h4
                  style={{
                    color: "rgba(255, 255, 255, 0.9)",
                    marginBottom: "12px",
                  }}
                >
                  📄 骑手送货费用 (当日明细 - {cashCollectionDate})
                </h4>
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
                          骑手ID
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            color: "white",
                            fontSize: "0.9rem",
                          }}
                        >
                          订单号
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            color: "white",
                            fontSize: "0.9rem",
                          }}
                        >
                          包裹类型
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            color: "white",
                            fontSize: "0.9rem",
                          }}
                        >
                          总跑腿费
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            color: "white",
                            fontSize: "0.9rem",
                          }}
                        >
                          起步价(该单)
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            color: "white",
                            fontSize: "0.9rem",
                          }}
                        >
                          骑手应得
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            color: "white",
                            fontSize: "0.9rem",
                          }}
                        >
                          送达时间
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const todayDelivered = packages
                          .filter((pkg) => {
                            if (
                              pkg.status !== "已送达" &&
                              pkg.status !== "已完成"
                            )
                              return false;
                            const dateKey = getDateKey(
                              pkg.delivery_time ||
                                pkg.updated_at ||
                                pkg.created_at,
                            );
                            return dateKey === cashCollectionDate;
                          })
                          .sort((a, b) => {
                            const timeA = new Date(
                              a.delivery_time || a.updated_at || 0,
                            ).getTime();
                            const timeB = new Date(
                              b.delivery_time || b.updated_at || 0,
                            ).getTime();
                            return timeB - timeA;
                          });

                        if (todayDelivered.length === 0) {
                          return (
                            <tr>
                              <td
                                colSpan={7}
                                style={{
                                  padding: "24px",
                                  textAlign: "center",
                                  color: "rgba(255, 255, 255, 0.6)",
                                }}
                              >
                                所选日期内无配送完成记录
                              </td>
                            </tr>
                          );
                        }

                        return todayDelivered.map((pkg) => {
                          const pkgPrice = parseFloat(
                            pkg.price?.replace(/[^\d.]/g, "") || "0",
                          );
                          const regional = getRegionalPricingForPackage(
                            pkg,
                            regionalPricingMap,
                          );
                          const settingsBaseFee = regional.base_fee || 1500;
                          const rowBaseFee = getRiderShareBaseFeeMmk(
                            pkg,
                            settingsBaseFee,
                          );
                          const riderShare = getRiderDeliveryShareMmk(
                            pkg,
                            settingsBaseFee,
                            regional,
                          );

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
                                  color: "white",
                                  fontSize: "0.9rem",
                                  fontWeight: "bold",
                                }}
                              >
                                {pkg.courier || "N/A"}
                              </td>
                              <td
                                style={{
                                  padding: "12px",
                                  color: "#74b9ff",
                                  fontSize: "0.85rem",
                                }}
                              >
                                {pkg.id}
                              </td>
                              <td
                                style={{
                                  padding: "12px",
                                  color: "rgba(255, 255, 255, 0.85)",
                                  fontSize: "0.9rem",
                                }}
                              >
                                {String(pkg.package_type || "").trim() || "—"}
                              </td>
                              <td
                                style={{
                                  padding: "12px",
                                  color: "rgba(255, 255, 255, 0.8)",
                                  fontSize: "0.9rem",
                                }}
                              >
                                {pkgPrice.toLocaleString()}
                              </td>
                              <td
                                style={{
                                  padding: "12px",
                                  color: "rgba(255, 255, 255, 0.6)",
                                  fontSize: "0.9rem",
                                }}
                              >
                                {rowBaseFee.toLocaleString()}
                              </td>
                              <td
                                style={{
                                  padding: "12px",
                                  color: "#fd79a8",
                                  fontSize: "0.9rem",
                                  fontWeight: "bold",
                                }}
                              >
                                {riderShare.toLocaleString()} MMK
                              </td>
                              <td
                                style={{
                                  padding: "12px",
                                  color: "rgba(255, 255, 255, 0.5)",
                                  fontSize: "0.8rem",
                                }}
                              >
                                {pkg.delivery_time
                                  ? new Date(
                                      pkg.delivery_time,
                                    ).toLocaleTimeString()
                                  : "N/A"}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* 工资详情模态框 */}
            {showSalaryDetail && selectedSalary && (
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: "rgba(0, 0, 0, 0.8)",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  zIndex: 1000,
                  padding: isMobile ? "12px" : "20px",
                }}
                onClick={() => setShowSalaryDetail(false)}
              >
                <div
                  style={{
                    background:
                      "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)",
                    borderRadius: "20px",
                    padding: "32px",
                    maxWidth: "600px",
                    width: "100%",
                    maxHeight: "80vh",
                    overflow: "auto",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "24px",
                    }}
                  >
                    <h2
                      style={{ margin: 0, color: "white", fontSize: "1.5rem" }}
                    >
                      💰 工资详情
                    </h2>
                    <button
                      onClick={() => setShowSalaryDetail(false)}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "8px",
                        border: "none",
                        background: "rgba(255, 255, 255, 0.2)",
                        color: "white",
                        cursor: "pointer",
                        fontSize: "0.9rem",
                      }}
                    >
                      关闭
                    </button>
                  </div>

                  {/* 基本信息 */}
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.1)",
                      borderRadius: "12px",
                      padding: isMobile ? "12px" : "20px",
                      marginBottom: "20px",
                    }}
                  >
                    <h3
                      style={{
                        margin: "0 0 16px 0",
                        color: "white",
                        fontSize: "1.1rem",
                      }}
                    >
                      基本信息
                    </h3>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isMobile
                          ? "1fr"
                          : "repeat(2, 1fr)",
                        gap: "12px",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            color: "rgba(255, 255, 255, 0.7)",
                            fontSize: "0.85rem",
                            marginBottom: "4px",
                          }}
                        >
                          骑手ID
                        </div>
                        <div
                          style={{
                            color: "white",
                            fontSize: "1rem",
                            fontWeight: "600",
                          }}
                        >
                          {selectedSalary.courier_id}
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            color: "rgba(255, 255, 255, 0.7)",
                            fontSize: "0.85rem",
                            marginBottom: "4px",
                          }}
                        >
                          结算周期
                        </div>
                        <div style={{ color: "white", fontSize: "0.9rem" }}>
                          {selectedSalary.period_start_date} ~{" "}
                          {selectedSalary.period_end_date}
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            color: "rgba(255, 255, 255, 0.7)",
                            fontSize: "0.85rem",
                            marginBottom: "4px",
                          }}
                        >
                          配送单数
                        </div>
                        <div
                          style={{
                            color: "#74b9ff",
                            fontSize: "1rem",
                            fontWeight: "600",
                          }}
                        >
                          {selectedSalary.total_deliveries} 单
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            color: "rgba(255, 255, 255, 0.7)",
                            fontSize: "0.85rem",
                            marginBottom: "4px",
                          }}
                        >
                          配送距离
                        </div>
                        <div
                          style={{
                            color: "#fd79a8",
                            fontSize: "1rem",
                            fontWeight: "600",
                          }}
                        >
                          {selectedSalary.total_km.toFixed(1)} KM
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 工资组成 */}
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.1)",
                      borderRadius: "12px",
                      padding: isMobile ? "12px" : "20px",
                    }}
                  >
                    <h3
                      style={{
                        margin: "0 0 16px 0",
                        color: "white",
                        fontSize: "1.1rem",
                      }}
                    >
                      工资组成
                    </h3>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "8px 0",
                          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                        }}
                      >
                        <span style={{ color: "rgba(255, 255, 255, 0.8)" }}>
                          基本工资
                        </span>
                        <span style={{ color: "white", fontWeight: "600" }}>
                          {selectedSalary.base_salary.toLocaleString()} MMK
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "8px 0",
                          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                        }}
                      >
                        <span style={{ color: "rgba(255, 255, 255, 0.8)" }}>
                          送货费
                        </span>
                        <span style={{ color: "#74b9ff", fontWeight: "600" }}>
                          +{selectedSalary.km_fee.toLocaleString()} MMK
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "8px 0",
                          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                        }}
                      >
                        <span style={{ color: "rgba(255, 255, 255, 0.8)" }}>
                          配送奖金
                        </span>
                        <span style={{ color: "#a29bfe", fontWeight: "600" }}>
                          +{selectedSalary.delivery_bonus.toLocaleString()} MMK
                        </span>
                      </div>
                      {selectedSalary.performance_bonus > 0 && (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "8px 0",
                            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                          }}
                        >
                          <span style={{ color: "rgba(255, 255, 255, 0.8)" }}>
                            绩效奖金
                          </span>
                          <span style={{ color: "#55efc4", fontWeight: "600" }}>
                            +{selectedSalary.performance_bonus.toLocaleString()}{" "}
                            MMK
                          </span>
                        </div>
                      )}
                      {selectedSalary.deduction_amount > 0 && (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "8px 0",
                            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                          }}
                        >
                          <span style={{ color: "rgba(255, 255, 255, 0.8)" }}>
                            扣款
                          </span>
                          <span style={{ color: "#ff7675", fontWeight: "600" }}>
                            -{selectedSalary.deduction_amount.toLocaleString()}{" "}
                            MMK
                          </span>
                        </div>
                      )}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "12px 0",
                          marginTop: "8px",
                          borderTop: "2px solid rgba(255, 255, 255, 0.3)",
                        }}
                      >
                        <span
                          style={{
                            color: "white",
                            fontSize: "1.1rem",
                            fontWeight: "600",
                          }}
                        >
                          实发工资
                        </span>
                        <span
                          style={{
                            color: "#55efc4",
                            fontSize: "1.3rem",
                            fontWeight: "bold",
                          }}
                        >
                          {selectedSalary.net_salary.toLocaleString()} MMK
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 发放工资模态框 */}
            {/* 🚀 生成工资骑手选择弹窗 */}
            {showSalarySelectionModal && (
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
                  zIndex: 2000,
                  padding: "20px",
                }}
              >
                <div
                  style={{
                    background:
                      "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)",
                    borderRadius: "24px",
                    padding: "32px",
                    width: "100%",
                    maxWidth: "600px",
                    maxHeight: "80vh",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "24px",
                    }}
                  >
                    <h2
                      style={{
                        margin: 0,
                        color: "white",
                        fontSize: "1.5rem",
                        fontWeight: 800,
                      }}
                    >
                      选择生成工资的骑手
                    </h2>
                    <button
                      onClick={() => setShowSalarySelectionModal(false)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "rgba(255,255,255,0.6)",
                        cursor: "pointer",
                        fontSize: "1.5rem",
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 16px",
                      background: "rgba(255,255,255,0.05)",
                      borderRadius: "12px",
                      marginBottom: "16px",
                    }}
                  >
                    <div
                      style={{
                        color: "rgba(255,255,255,0.7)",
                        fontSize: "0.9rem",
                      }}
                    >
                      本月有待结算订单的骑手:{" "}
                      <strong style={{ color: "#4facfe" }}>
                        {Object.keys(courierSalaryGroups).length}
                      </strong>{" "}
                      名
                    </div>
                    <button
                      onClick={() => {
                        if (
                          selectedCouriersForSalary.size ===
                          Object.keys(courierSalaryGroups).length
                        ) {
                          setSelectedCouriersForSalary(new Set());
                        } else {
                          setSelectedCouriersForSalary(
                            new Set(Object.keys(courierSalaryGroups)),
                          );
                        }
                      }}
                      style={{
                        background: "rgba(255,255,255,0.1)",
                        border: "1px solid rgba(255,255,255,0.2)",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        color: "white",
                        fontSize: "0.85rem",
                        cursor: "pointer",
                      }}
                    >
                      {selectedCouriersForSalary.size ===
                      Object.keys(courierSalaryGroups).length
                        ? "取消全选"
                        : "全选"}
                    </button>
                  </div>

                  <div
                    style={{
                      flex: 1,
                      overflowY: "auto",
                      paddingRight: "8px",
                      marginBottom: "24px",
                    }}
                  >
                    {Object.keys(courierSalaryGroups).length === 0 ? (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "40px",
                          color: "rgba(255,255,255,0.4)",
                        }}
                      >
                        暂无本月待结算的骑手数据
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr",
                          gap: "10px",
                        }}
                      >
                        {Object.entries(courierSalaryGroups).map(
                          ([courierId, pkgs]) => {
                            const isSelected =
                              selectedCouriersForSalary.has(courierId);
                            const totalKm = pkgs.reduce(
                              (sum, pkg) => sum + (pkg.delivery_distance || 0),
                              0,
                            );

                            return (
                              <div
                                key={courierId}
                                onClick={() => {
                                  const next = new Set(
                                    selectedCouriersForSalary,
                                  );
                                  if (next.has(courierId))
                                    next.delete(courierId);
                                  else next.add(courierId);
                                  setSelectedCouriersForSalary(next);
                                }}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "15px",
                                  padding: "16px",
                                  borderRadius: "12px",
                                  background: isSelected
                                    ? "rgba(59, 130, 246, 0.15)"
                                    : "rgba(255,255,255,0.03)",
                                  border: `1px solid ${isSelected ? "rgba(59, 130, 246, 0.4)" : "rgba(255,255,255,0.08)"}`,
                                  cursor: "pointer",
                                  transition: "all 0.2s",
                                }}
                              >
                                <div
                                  style={{
                                    width: "24px",
                                    height: "24px",
                                    borderRadius: "6px",
                                    border: isSelected
                                      ? "none"
                                      : "2px solid rgba(255,255,255,0.3)",
                                    background: isSelected
                                      ? "#3b82f6"
                                      : "transparent",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  {isSelected && (
                                    <span
                                      style={{
                                        color: "white",
                                        fontWeight: "bold",
                                      }}
                                    >
                                      ✓
                                    </span>
                                  )}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div
                                    style={{
                                      color: "white",
                                      fontWeight: 700,
                                      fontSize: "1.05rem",
                                    }}
                                  >
                                    {courierId}
                                  </div>
                                  <div
                                    style={{
                                      display: "flex",
                                      gap: "15px",
                                      marginTop: "4px",
                                    }}
                                  >
                                    <span
                                      style={{
                                        color: "rgba(255,255,255,0.5)",
                                        fontSize: "0.8rem",
                                      }}
                                    >
                                      📦 {pkgs.length} 单
                                    </span>
                                    <span
                                      style={{
                                        color: "rgba(255,255,255,0.5)",
                                        fontSize: "0.8rem",
                                      }}
                                    >
                                      🛣️ {totalKm.toFixed(1)} KM
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          },
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "12px" }}>
                    <button
                      onClick={() => setShowSalarySelectionModal(false)}
                      style={{
                        flex: 1,
                        padding: "14px",
                        borderRadius: "12px",
                        border: "1px solid rgba(255,255,255,0.2)",
                        background: "rgba(255,255,255,0.05)",
                        color: "white",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      取消
                    </button>
                    <button
                      onClick={generateMonthlySalaries}
                      disabled={selectedCouriersForSalary.size === 0}
                      style={{
                        flex: 2,
                        padding: "14px",
                        borderRadius: "12px",
                        border: "none",
                        background:
                          selectedCouriersForSalary.size === 0
                            ? "#4a5568"
                            : "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                        color: "#05223b",
                        fontWeight: 800,
                        cursor:
                          selectedCouriersForSalary.size === 0
                            ? "not-allowed"
                            : "pointer",
                        boxShadow:
                          selectedCouriersForSalary.size === 0
                            ? "none"
                            : "0 10px 20px rgba(79, 172, 254, 0.3)",
                      }}
                    >
                      确认生成 ({selectedCouriersForSalary.size} 名)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showPaymentModal && (
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: "rgba(0, 0, 0, 0.8)",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  zIndex: 1000,
                  padding: isMobile ? "12px" : "20px",
                }}
                onClick={() => setShowPaymentModal(false)}
              >
                <div
                  style={{
                    background:
                      "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)",
                    borderRadius: "20px",
                    padding: "32px",
                    maxWidth: "500px",
                    width: "100%",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <h2
                    style={{
                      margin: "0 0 24px 0",
                      color: "white",
                      fontSize: "1.5rem",
                    }}
                  >
                    💳 发放工资
                  </h2>

                  <div style={{ marginBottom: "16px" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        color: "rgba(255, 255, 255, 0.9)",
                        fontSize: "0.95rem",
                      }}
                    >
                      发放方式 *
                    </label>
                    <select
                      value={paymentForm.payment_method}
                      onChange={(e) =>
                        setPaymentForm({
                          ...paymentForm,
                          payment_method: e.target.value,
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "12px",
                        borderRadius: "10px",
                        border: "1px solid rgba(255, 255, 255, 0.25)",
                        background: "rgba(7, 23, 53, 0.65)",
                        color: "white",
                        fontSize: "0.95rem",
                      }}
                    >
                      <option value="cash">现金</option>
                      <option value="bank_transfer">银行转账</option>
                      <option value="kbz_pay">KBZ Pay</option>
                      <option value="wave_money">Wave Money</option>
                      <option value="mobile_money">其他移动支付</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: "16px" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        color: "rgba(255, 255, 255, 0.9)",
                        fontSize: "0.95rem",
                      }}
                    >
                      支付凭证号
                    </label>
                    <input
                      type="text"
                      value={paymentForm.payment_reference}
                      onChange={(e) =>
                        setPaymentForm({
                          ...paymentForm,
                          payment_reference: e.target.value,
                        })
                      }
                      placeholder="银行单号/交易号"
                      style={{
                        width: "100%",
                        padding: "12px",
                        borderRadius: "10px",
                        border: "none",
                        background: "rgba(255, 255, 255, 0.18)",
                        color: "white",
                        fontSize: "0.95rem",
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: "24px" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        color: "rgba(255, 255, 255, 0.9)",
                        fontSize: "0.95rem",
                      }}
                    >
                      发放日期 *
                    </label>
                    <input
                      type="date"
                      value={paymentForm.payment_date}
                      onChange={(e) =>
                        setPaymentForm({
                          ...paymentForm,
                          payment_date: e.target.value,
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "12px",
                        borderRadius: "10px",
                        border: "none",
                        background: "rgba(255, 255, 255, 0.18)",
                        color: "white",
                        fontSize: "0.95rem",
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: "12px" }}>
                    <button
                      onClick={() => setShowPaymentModal(false)}
                      style={{
                        flex: 1,
                        padding: "12px",
                        borderRadius: "10px",
                        border: "1px solid rgba(255, 255, 255, 0.3)",
                        background: "transparent",
                        color: "white",
                        cursor: "pointer",
                        fontSize: "0.95rem",
                        fontWeight: "600",
                      }}
                    >
                      取消
                    </button>
                    <button
                      onClick={async () => {
                        if (
                          !window.confirm(
                            `确认发放 ${selectedSalaries.length} 条工资？`,
                          )
                        )
                          return;

                        setLoading(true);
                        try {
                          let successCount = 0;
                          for (const salaryId of selectedSalaries) {
                            const success =
                              await courierSalaryService.paySalary(salaryId, {
                                payment_method: paymentForm.payment_method,
                                payment_reference:
                                  paymentForm.payment_reference,
                                payment_date: paymentForm.payment_date,
                              });

                            if (success) {
                              successCount++;

                              // 新增逻辑：标记相关包裹为已结算
                              const salaryRecord = courierSalaries.find(
                                (s) => s.id === salaryId,
                              );
                              if (
                                salaryRecord &&
                                salaryRecord.related_package_ids
                              ) {
                                await courierSalaryService.markPackagesAsSettled(
                                  salaryRecord.related_package_ids,
                                );
                              }
                            }
                          }

                          feedbackService.notify(`成功发放 ${successCount} 条工资！`);
                          await loadRecords();
                          setShowPaymentModal(false);
                          setSelectedSalaries([]);
                        } catch (error) {
                          console.error("发放工资失败:", error);
                          feedbackService.notify("发放工资失败！");
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      style={{
                        flex: 1,
                        padding: "12px",
                        borderRadius: "10px",
                        border: "none",
                        background: loading
                          ? "rgba(240, 147, 251, 0.5)"
                          : "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                        color: "white",
                        cursor: loading ? "not-allowed" : "pointer",
                        fontSize: "0.95rem",
                        fontWeight: "600",
                      }}
                    >
                      确认发放
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
  );
};

export default FinanceCourierRecordsTab;
