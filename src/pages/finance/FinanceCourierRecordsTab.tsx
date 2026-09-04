// @ts-nocheck — 从 FinanceManagement 原样搬出的 Tab JSX；类型由父组件工作区承担。
import React from "react";
import { courierSalaryService } from "../../services/supabase";
import { feedbackService } from "../../services/FeedbackService";
import { getRegionalPricingForPackage, getRiderDeliveryShareMmk, getRiderShareBaseFeeMmk, getDateKey, packageMatchesRegionPrefix } from "../FinanceManagement.helpers";
import { useFinanceWorkspace } from "./FinanceWorkspace";

function CrMetric({
  tone,
  label,
  value,
  hint,
}: {
  tone?: string;
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className={`finance-ov-card${tone ? ` finance-ov-card--${tone}` : ""}`}>
      <div className="finance-ov-card__label">{label}</div>
      <div className="finance-ov-card__value">{value}</div>
      {hint ? <div className="finance-ov-card__desc">{hint}</div> : null}
    </div>
  );
}

function salaryStatusLabel(status: string, t: any, language: string) {
  if (status === "pending") return t.pending;
  if (status === "approved") {
    return language === "my"
      ? "အတည်ပြုပြီး"
      : language === "en"
        ? "Approved"
        : "已审核";
  }
  if (status === "paid") return t.settled;
  return language === "my"
    ? "ငြင်းပယ်ခံရသည်"
    : language === "en"
      ? "Rejected"
      : "已拒绝";
}

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
          <div className="finance-cr">
            <div className="finance-cr-bar">
              <h3 className="finance-cr-title">{t.courierFinanceRecords}</h3>
              <label className="finance-cr-label" htmlFor="finance-cr-month">
                {t.selectMonth}
              </label>
              <select
                id="finance-cr-month"
                className="finance-cr-select"
                value={selectedSalaryMonth}
                onChange={(e) => {
                  setSelectedSalaryMonth(e.target.value);
                  setSelectedSalaries([]);
                }}
              >
                {getAvailableMonths().map((month) => (
                  <option key={month} value={month}>
                    {formatMonthDisplay(month)}
                  </option>
                ))}
              </select>
              <select
                className="finance-cr-select"
                value={salaryFilterStatus}
                onChange={(e) => setSalaryFilterStatus(e.target.value as any)}
              >
                <option value="all">{t.allStatus}</option>
                <option value="pending">{t.pending}</option>
                <option value="approved">
                  {language === "zh"
                    ? "已审核"
                    : language === "my"
                      ? "အတည်ပြုပြီး"
                      : "Approved"}
                </option>
                <option value="paid">{t.settled}</option>
                <option value="rejected">
                  {language === "zh"
                    ? "已拒绝"
                    : language === "my"
                      ? "ငြင်းပယ်ခံရသည်"
                      : "Rejected"}
                </option>
              </select>
              <span className="finance-cr-count">
                {language === "zh"
                  ? `共 ${getFilteredSalariesByMonth(courierSalaries, selectedSalaryMonth).length} 条`
                  : language === "my"
                    ? `စုစုပေါင်း ${getFilteredSalariesByMonth(courierSalaries, selectedSalaryMonth).length} ခု`
                    : `${getFilteredSalariesByMonth(courierSalaries, selectedSalaryMonth).length} records`}
              </span>
              <div className="finance-cr-tools">
              {!isRegionalUser && (
                <button
                  type="button"
                  className="admin-shell__btn admin-shell__btn--primary"
                  onClick={handleOpenSalaryGeneration}
                  disabled={loading}
                >
                  {t.generateSalaries}
                </button>
              )}

              {selectedSalaries.length > 0 && !isRegionalUser && (
                <>
                  <button
                    type="button"
                    className="admin-shell__btn"
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
                  >
                    {language === "en" ? "Approve" : "批量审核"} ({selectedSalaries.length})
                  </button>

                  <button
                    type="button"
                    className="admin-shell__btn"
                    onClick={() => setShowPaymentModal(true)}
                    disabled={loading}
                  >
                    {language === "en" ? "Pay" : "批量发放"} ({selectedSalaries.length})
                  </button>

                  <button
                    type="button"
                    className="admin-shell__btn admin-shell__btn--danger"
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

                        if (failCount === 0) {
                          feedbackService.notify(
                            `批量删除成功！共删除 ${successCount} 条记录。`,
                          );
                        } else {
                          feedbackService.notify(
                            `批量删除完成！成功：${successCount} 条，失败：${failCount} 条。`,
                          );
                        }

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
                  >
                    {language === "en" ? "Delete" : "批量删除"} ({selectedSalaries.length})
                  </button>
                </>
              )}
              </div>
            </div>

            <div className="finance-cr-metrics finance-cr-metrics--4">
              {(() => {
                let monthFilteredSalaries = getFilteredSalariesByMonth(
                  courierSalaries,
                  selectedSalaryMonth,
                );

                if (isRegionalUser) {
                  monthFilteredSalaries = monthFilteredSalaries.filter(
                    (s) =>
                      s.courier_id &&
                      s.courier_id.startsWith(currentRegionPrefix),
                  );
                }

                return (
                  <>
                    <CrMetric
                      tone="pending"
                      label={t.pending}
                      value={
                        monthFilteredSalaries.filter(
                          (s) => s.status === "pending",
                        ).length
                      }
                    />
                    <CrMetric
                      tone="net"
                      label={
                        language === "zh"
                          ? "已审核"
                          : language === "my"
                            ? "အတည်ပြုပြီး"
                            : "Approved"
                      }
                      value={
                        monthFilteredSalaries.filter(
                          (s) => s.status === "approved",
                        ).length
                      }
                    />
                    <CrMetric
                      tone="platform"
                      label={t.settled}
                      value={
                        monthFilteredSalaries.filter(
                          (s) => s.status === "paid",
                        ).length
                      }
                    />
                    <CrMetric
                      tone="income"
                      label={
                        language === "zh"
                          ? "工资总额"
                          : language === "my"
                            ? "စုစုပေါင်း လစာ"
                            : "Total Salary"
                      }
                      value={`${monthFilteredSalaries
                        .reduce((sum, s) => sum + s.net_salary, 0)
                        .toLocaleString()} MMK`}
                    />
                  </>
                );
              })()}
            </div>

            <section className="finance-cr-panel">
              <h4 className="finance-cr-panel__title">
                {language === "my" ? "လစာမှတ်တမ်းဇယား" : language === "en" ? "Salary records" : "工资记录"}
              </h4>
              <p className="finance-cr-panel__sub">
                {language === "en"
                  ? "Only delivered orders in the selected month are included when generating salaries."
                  : language === "my"
                    ? "လစာထုတ်သည့်အခါ ရွေးထားသောလ၏ ပို့ဆောင်ပြီး အော်ဒါများသာ ပါဝင်သည်။"
                    : "生成工资时只组所选月份里已送达的订单。"}
              </p>
              <div className="finance-cr-table-wrap">
              <table className="finance-cr-table">
                <thead>
                  <tr>
                    <th>
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
                    <th>
                      {t.riderId}
                    </th>
                    <th>
                      {t.settlementPeriod}
                    </th>
                    <th className="is-num">
                      {t.baseSalary}
                    </th>
                    <th className="is-num">
                      {t.kmFee}
                    </th>
                    <th className="is-num">
                      {t.deliveryBonus}
                    </th>
                    <th className="is-num">
                      {language === "my" ? "စုစုပေါင်းလစာ" : language === "en" ? "Net pay" : "实发工资"}
                    </th>
                    <th className="is-center">
                      {t.deliveryCount}
                    </th>
                    <th className="is-center">
                      {t.status}
                    </th>
                    <th className="is-center">
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
                          <td colSpan={10}>
                            <div className="finance-cr-empty">
                              <p className="finance-cr-empty__title">
                                {selectedSalaryMonth
                                  ? language === "en"
                                    ? `No salary slips for ${formatMonthDisplay(selectedSalaryMonth)}`
                                    : language === "my"
                                      ? `${formatMonthDisplay(selectedSalaryMonth)} လစာမှတ်တမ်း မရှိသေးပါ`
                                      : `${formatMonthDisplay(selectedSalaryMonth)} 还没有工资单`
                                  : language === "en"
                                    ? "No salary records"
                                    : "暂无工资记录"}
                              </p>
                              <p className="finance-cr-empty__hint">
                                {language === "en"
                                  ? "Choose the month, then generate salaries from delivered orders."
                                  : language === "my"
                                    ? "လကိုရွေးပြီး ပို့ဆောင်ပြီး အော်ဒါများမှ လစာ ထုတ်ပါ။"
                                    : "选对月份后点「生成工资」，只组本月已送达订单。"}
                              </p>
                              {!isRegionalUser && (
                                <button
                                  type="button"
                                  className="admin-shell__btn admin-shell__btn--primary"
                                  onClick={handleOpenSalaryGeneration}
                                  disabled={loading}
                                >
                                  {t.generateSalaries}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return filtered.map((salary) => (
                      <tr key={salary.id}>
                        <td>
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
                          />
                        </td>
                        <td>{salary.courier_id}</td>
                        <td>
                          {salary.period_start_date} ~ {salary.period_end_date}
                        </td>
                        <td className="is-num">
                          {salary.base_salary.toLocaleString()}
                        </td>
                        <td className="is-num">
                          {salary.km_fee.toLocaleString()}
                        </td>
                        <td className="is-num">
                          {salary.delivery_bonus.toLocaleString()}
                        </td>
                        <td className="is-num">
                          {salary.net_salary.toLocaleString()} MMK
                        </td>
                        <td className="is-center">
                          {salary.total_deliveries} {t.packageSuffix || "单"}
                        </td>
                        <td className="is-center">
                          <span
                            className={`finance-cr-status finance-cr-status--${salary.status === "rejected" ? "rejected" : salary.status}`}
                          >
                            {salaryStatusLabel(salary.status, t, language)}
                          </span>
                        </td>
                        <td className="is-center">
                          <div className="finance-cr-actions">
                            <button
                              type="button"
                              className="admin-shell__btn"
                              onClick={async () => {
                                setSelectedSalary(salary);
                                const details =
                                  await courierSalaryService.getSalaryDetails(
                                    salary.id!,
                                  );
                                setSalaryDetails(details);
                                setShowSalaryDetail(true);
                              }}
                            >
                              {t.viewDetail || "详情"}
                            </button>

                            {!isRegionalUser && (
                              <>
                                {salary.status === "pending" && (
                                  <button
                                    type="button"
                                    className="admin-shell__btn"
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
                                    disabled={loading}
                                  >
                                    {t.audit || "审核"}
                                  </button>
                                )}

                                {salary.status === "approved" && (
                                  <button
                                    type="button"
                                    className="admin-shell__btn admin-shell__btn--primary"
                                    onClick={() => {
                                      setSelectedSalaries([salary.id!]);
                                      setShowPaymentModal(true);
                                    }}
                                  >
                                    {language === "en" ? "Pay" : "发放"}
                                  </button>
                                )}

                                <button
                                  type="button"
                                  className="admin-shell__btn admin-shell__btn--danger"
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
                                >
                                  {t.delete || "删除"}
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
            </section>

            <section className="finance-cr-panel finance-cr-stats">
              <h3 className="finance-cr-panel__title">
                {language === "en" ? "Rider delivery stats" : "骑手数据统计"}
              </h3>
              <div className="finance-cr-stats__block">
                <p className="finance-cr-panel__sub">
                  {language === "en" ? "Delivery distance and rider share" : "骑手送货费用统计"}
                </p>
                <div className="finance-cr-metrics">
                  <CrMetric
                    tone="rider"
                    label="总配送距离"
                    value={`${summary.totalKm.toFixed(2)} KM`}
                  />
                  <CrMetric
                    tone="start"
                    label="当前系统起步价（新单默认）"
                    value={`${pricingSettingsDisplay.base_fee || 1500} MMK`}
                  />
                  <CrMetric
                    tone="wayside"
                    label="骑手分得总额"
                    hint="准时达=总费−起步价；顺路递=实付一半"
                    value={`${summary.courierKmCost.toLocaleString()} MMK`}
                  />
                  <CrMetric
                    tone="income"
                    label="已送达包裹数"
                    value={packages.filter(
                        (pkg) =>
                          pkg.status === "已送达" &&
                          (!isRegionalUser ||
                            packageMatchesRegionPrefix(
                              pkg,
                              currentRegionPrefix,
                            )),
                      ).length}
                  />
                </div>
              </div>

              <div className="finance-cr-stats__block">
                <p className="finance-cr-panel__sub">
                  {language === "en" ? "This month" : "骑手收入统计（当月）"}
                </p>
                <div className="finance-cr-metrics">
                  <CrMetric
                    tone="net"
                    label="当月送达总笔数"
                    value={summary.monthlyRiderCount}
                  />
                  <CrMetric
                    tone="income"
                    label="当月骑手收入总额"
                    value={`${summary.monthlyRiderFee.toLocaleString()} MMK`}
                  />
                </div>
              </div>

              <div className="finance-cr-stats__block">
                <p className="finance-cr-panel__sub">
                  {language === "en"
                    ? `Today (${cashCollectionDate})`
                    : `骑手收入统计（当日 ${cashCollectionDate}）`}
                </p>
                <div className="finance-cr-metrics">
                  <CrMetric
                    tone="pending"
                    label="当日送达总笔数"
                    value={summary.dailyRiderCount}
                  />
                  <CrMetric
                    tone="start"
                    label="当日骑手收入总额"
                    value={`${summary.dailyRiderFee.toLocaleString()} MMK`}
                  />
                </div>
              </div>

              <div className="finance-cr-stats__block">
                <p className="finance-cr-panel__sub">
                  {language === "en"
                    ? "Rider delivery share (by rider)"
                    : "骑手送货费用明细（按骑手）"}
                </p>
                <div className="finance-cr-table-wrap">
                  <table className="finance-cr-table finance-cr-table--compact">
                    <thead>
                      <tr style={{ background: "#f1f5f9" }}>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            color: "#0f172a",
                            fontSize: "0.9rem",
                          }}
                        >
                          骑手ID
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            color: "#0f172a",
                            fontSize: "0.9rem",
                          }}
                        >
                          送达包裹数
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            color: "#0f172a",
                            fontSize: "0.9rem",
                          }}
                        >
                          总送货距离
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            color: "#0f172a",
                            fontSize: "0.9rem",
                          }}
                        >
                          骑手收入（总费−起步价 / 顺路递一半）
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            color: "#0f172a",
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
                              pkg.courier !== "待分配" &&
                              (!isRegionalUser ||
                                packageMatchesRegionPrefix(
                                  pkg,
                                  currentRegionPrefix,
                                )),
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
                                  color: "#64748b",
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
                                  "1px solid #e2e8f0",
                              }}
                            >
                              <td
                                style={{
                                  padding: "12px",
                                  color: "#334155",
                                  fontSize: "0.9rem",
                                  fontWeight: "bold",
                                }}
                              >
                                {courierId}
                              </td>
                              <td
                                style={{
                                  padding: "12px",
                                  color: "#334155",
                                  fontSize: "0.9rem",
                                }}
                              >
                                {stats.count} 个
                              </td>
                              <td
                                style={{
                                  padding: "12px",
                                  color: "#334155",
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
                                  color: "#334155",
                                  fontSize: "0.9rem",
                                }}
                              >
                                <span
                                  style={{
                                    color: "#0f172a",
                                    fontWeight: "bold",
                                  }}
                                >
                                  {stats.totalRiderFee.toLocaleString()} MMK
                                </span>
                              </td>
                              <td
                                style={{
                                  padding: "12px",
                                  color: "#334155",
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

              <div className="finance-cr-stats__block">
                <p className="finance-cr-panel__sub">
                  {language === "en"
                    ? `Delivery share on ${cashCollectionDate}`
                    : `骑手送货费用（当日 ${cashCollectionDate}）`}
                </p>
                <div className="finance-cr-table-wrap">
                  <table className="finance-cr-table finance-cr-table--compact">
                    <thead>
                      <tr style={{ background: "#f1f5f9" }}>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            color: "#0f172a",
                            fontSize: "0.9rem",
                          }}
                        >
                          骑手ID
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            color: "#0f172a",
                            fontSize: "0.9rem",
                          }}
                        >
                          订单号
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            color: "#0f172a",
                            fontSize: "0.9rem",
                          }}
                        >
                          包裹类型
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            color: "#0f172a",
                            fontSize: "0.9rem",
                          }}
                        >
                          总跑腿费
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            color: "#0f172a",
                            fontSize: "0.9rem",
                          }}
                        >
                          起步价(该单)
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            color: "#0f172a",
                            fontSize: "0.9rem",
                          }}
                        >
                          骑手应得
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            color: "#0f172a",
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
                                  color: "#64748b",
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
                                  "1px solid #e2e8f0",
                              }}
                            >
                              <td
                                style={{
                                  padding: "12px",
                                  color: "#0f172a",
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
                                  color: "#0f172a",
                                  fontSize: "0.9rem",
                                }}
                              >
                                {String(pkg.package_type || "").trim() || "—"}
                              </td>
                              <td
                                style={{
                                  padding: "12px",
                                  color: "#334155",
                                  fontSize: "0.9rem",
                                }}
                              >
                                {pkgPrice.toLocaleString()}
                              </td>
                              <td
                                style={{
                                  padding: "12px",
                                  color: "#64748b",
                                  fontSize: "0.9rem",
                                }}
                              >
                                {rowBaseFee.toLocaleString()}
                              </td>
                              <td
                                style={{
                                  padding: "12px",
                                  color: "#0f172a",
                                  fontSize: "0.9rem",
                                  fontWeight: "bold",
                                }}
                              >
                                {riderShare.toLocaleString()} MMK
                              </td>
                              <td
                                style={{
                                  padding: "12px",
                                  color: "#64748b",
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
            </section>
            {showSalaryDetail && selectedSalary && (
              <div
                className="admin-modal-scrim"
                onClick={() => setShowSalaryDetail(false)}
              >
                <div
                  className="admin-modal admin-modal--lg"
                  role="dialog"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="finance-cr-modal__head">
                    <h2>
                      {language === "en" ? "Salary detail" : "工资详情"}
                    </h2>
                    <button
                      type="button"
                      className="admin-shell__btn"
                      onClick={() => setShowSalaryDetail(false)}
                    >
                      {language === "en" ? "Close" : "关闭"}
                    </button>
                  </div>

                  {/* 基本信息 */}
                  <div
                    style={{
                      background: "#f1f5f9",
                      borderRadius: "12px",
                      padding: isMobile ? "12px" : "20px",
                      marginBottom: "20px",
                    }}
                  >
                    <h3
                      style={{
                        margin: "0 0 16px 0",
                        color: "#0f172a",
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
                            color: "#334155",
                            fontSize: "0.85rem",
                            marginBottom: "4px",
                          }}
                        >
                          骑手ID
                        </div>
                        <div
                          style={{
                            color: "#0f172a",
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
                            color: "#334155",
                            fontSize: "0.85rem",
                            marginBottom: "4px",
                          }}
                        >
                          结算周期
                        </div>
                        <div style={{ color: "#0f172a", fontSize: "0.9rem" }}>
                          {selectedSalary.period_start_date} ~{" "}
                          {selectedSalary.period_end_date}
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            color: "#334155",
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
                            color: "#334155",
                            fontSize: "0.85rem",
                            marginBottom: "4px",
                          }}
                        >
                          配送距离
                        </div>
                        <div
                          style={{
                            color: "#0f172a",
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
                      background: "#f1f5f9",
                      borderRadius: "12px",
                      padding: isMobile ? "12px" : "20px",
                    }}
                  >
                    <h3
                      style={{
                        margin: "0 0 16px 0",
                        color: "#0f172a",
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
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        <span style={{ color: "#334155" }}>
                          基本工资
                        </span>
                        <span style={{ color: "#0f172a", fontWeight: "600" }}>
                          {selectedSalary.base_salary.toLocaleString()} MMK
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "8px 0",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        <span style={{ color: "#334155" }}>
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
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        <span style={{ color: "#334155" }}>
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
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          <span style={{ color: "#334155" }}>
                            绩效奖金
                          </span>
                          <span style={{ color: "#0f172a", fontWeight: "600" }}>
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
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          <span style={{ color: "#334155" }}>
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
                          borderTop: "2px solid #e2e8f0",
                        }}
                      >
                        <span
                          style={{
                            color: "#0f172a",
                            fontSize: "1.1rem",
                            fontWeight: "600",
                          }}
                        >
                          实发工资
                        </span>
                        <span
                          style={{
                            color: "#0f172a",
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

            {showSalarySelectionModal && (
              <div className="admin-modal-scrim">
                <div className="admin-modal admin-modal--lg" role="dialog" aria-labelledby="finance-cr-salary-title">
                  <div className="finance-cr-modal__head">
                    <h2 id="finance-cr-salary-title">
                      {language === "en" ? "Select riders" : "选择生成工资的骑手"}
                    </h2>
                    <button
                      type="button"
                      className="admin-modal__close"
                      onClick={() => setShowSalarySelectionModal(false)}
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </div>

                  <div className="finance-cr-pick-bar">
                    <div>
                      {language === "en"
                        ? "Riders with unsettled delivered orders this month: "
                        : "本月有待结算订单的骑手："}
                      <strong>
                        {Object.keys(courierSalaryGroups).length}
                      </strong>
                    </div>
                    <button
                      type="button"
                      className="admin-shell__btn"
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
                    >
                      {selectedCouriersForSalary.size ===
                      Object.keys(courierSalaryGroups).length
                        ? language === "en"
                          ? "Clear"
                          : "取消全选"
                        : language === "en"
                          ? "Select all"
                          : "全选"}
                    </button>
                  </div>

                  <div className="finance-cr-pick-list">
                    {Object.keys(courierSalaryGroups).length === 0 ? (
                      <div className="finance-cr-empty">
                        <p className="finance-cr-empty__title">
                          {language === "en"
                            ? "No riders to settle this month"
                            : "暂无本月待结算的骑手"}
                        </p>
                      </div>
                    ) : (
                      Object.entries(courierSalaryGroups).map(
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
                              role="button"
                              tabIndex={0}
                              className={`finance-cr-pick${isSelected ? " is-on" : ""}`}
                              onClick={() => {
                                const next = new Set(
                                  selectedCouriersForSalary,
                                );
                                if (next.has(courierId))
                                  next.delete(courierId);
                                else next.add(courierId);
                                setSelectedCouriersForSalary(next);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  const next = new Set(
                                    selectedCouriersForSalary,
                                  );
                                  if (next.has(courierId))
                                    next.delete(courierId);
                                  else next.add(courierId);
                                  setSelectedCouriersForSalary(next);
                                }
                              }}
                            >
                              <span className="finance-cr-pick__check" aria-hidden />
                              <div>
                                <div className="finance-cr-pick__id">
                                  {courierId}
                                </div>
                                <div className="finance-cr-pick__meta">
                                  <span>{pkgs.length} {t.packageSuffix || "单"}</span>
                                  <span>{totalKm.toFixed(1)} KM</span>
                                </div>
                              </div>
                            </div>
                          );
                        },
                      )
                    )}
                  </div>

                  <div className="admin-modal__actions">
                    <button
                      type="button"
                      className="admin-shell__btn"
                      onClick={() => setShowSalarySelectionModal(false)}
                    >
                      {t.cancel}
                    </button>
                    <button
                      type="button"
                      className="admin-shell__btn admin-shell__btn--primary"
                      onClick={generateMonthlySalaries}
                      disabled={selectedCouriersForSalary.size === 0}
                    >
                      {language === "en"
                        ? `Generate (${selectedCouriersForSalary.size})`
                        : `确认生成（${selectedCouriersForSalary.size} 名）`}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showPaymentModal && (
              <div
                className="admin-modal-scrim"
                onClick={() => setShowPaymentModal(false)}
              >
                <div
                  className="admin-modal"
                  role="dialog"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h2>
                    {language === "en" ? "Pay salaries" : "发放工资"}
                  </h2>

                  <div className="admin-modal__field">
                    <label>
                      {language === "en" ? "Payment method" : "发放方式"} *
                    </label>
                    <select
                      value={paymentForm.payment_method}
                      onChange={(e) =>
                        setPaymentForm({
                          ...paymentForm,
                          payment_method: e.target.value,
                        })
                      }
                    >
                      <option value="cash">现金</option>
                      <option value="bank_transfer">银行转账</option>
                      <option value="kbz_pay">KBZ Pay</option>
                      <option value="wave_money">Wave Money</option>
                      <option value="mobile_money">其他移动支付</option>
                    </select>
                  </div>

                  <div className="admin-modal__field">
                    <label>
                      {language === "en" ? "Payment reference" : "支付凭证号"}
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
                    />
                  </div>

                  <div className="admin-modal__field">
                    <label>
                      {language === "en" ? "Payment date" : "发放日期"} *
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
                    />
                  </div>

                  <div className="admin-modal__actions">
                    <button
                      type="button"
                      className="admin-shell__btn"
                      onClick={() => setShowPaymentModal(false)}
                    >
                      {t.cancel}
                    </button>
                    <button
                      type="button"
                      className="admin-shell__btn admin-shell__btn--primary"
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
                    >
                      {language === "en" ? "Confirm pay" : "确认发放"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
  );
};

export default FinanceCourierRecordsTab;
