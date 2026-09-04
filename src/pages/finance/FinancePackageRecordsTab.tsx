// @ts-nocheck — 从 FinanceManagement 原样搬出的 Tab JSX；类型由父组件工作区承担。
import React from "react";

import { useFinanceWorkspace } from "./FinanceWorkspace";

const FinancePackageRecordsTab: React.FC = () => {
  const {
    deliveredIncome,
    deliveredPackages,
    deliveredPackagesSorted,
    inProgressIncome,
    inProgressPackages,
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
  } = useFinanceWorkspace();

  const paymentLabel = (isCash: boolean) =>
    isCash
      ? language === "zh"
        ? "现金支付"
        : language === "my"
          ? "ငွေသား"
          : "Cash"
      : language === "zh"
        ? "余额支付"
        : language === "my"
          ? "လက်ကျန်ငွေ"
          : "Balance";

  return (
    <div className="finance-package-board">
      <h3 className="finance-package-board__title">{t.packageRecords}</h3>

      <h4 className="finance-package-board__section">
        {t.packageIncomeOverview || "包裹收入统计"}
      </h4>
      <div className="finance-package-metrics">
        <div className="finance-package-metric finance-package-metric--done">
          <div className="finance-package-metric__value">
            {deliveredPackages.length}
          </div>
          <div className="finance-package-metric__label">{t.deliveredCount}</div>
        </div>
        <div className="finance-package-metric finance-package-metric--done">
          <div className="finance-package-metric__value">
            {deliveredIncome.toLocaleString()} MMK
          </div>
          <div className="finance-package-metric__label">{t.deliveredIncome}</div>
        </div>
        <div className="finance-package-metric finance-package-metric--open">
          <div className="finance-package-metric__value">
            {inProgressPackages.length}
          </div>
          <div className="finance-package-metric__label">{t.inProgressCount}</div>
        </div>
        <div className="finance-package-metric finance-package-metric--open">
          <div className="finance-package-metric__value">
            {inProgressIncome.toLocaleString()} MMK
          </div>
          <div className="finance-package-metric__label">{t.expectedIncome}</div>
        </div>
      </div>

      <div className="finance-package-toolbar">
        <h4>
          {language === "zh"
            ? "包裹收入记录"
            : language === "my"
              ? "ပစ္စည်းပို့ဆောင်မှု ဝင်ငွေမှတ်တမ်း"
              : "Package Income Records"}
        </h4>
        <div className="finance-package-toolbar__tools">
          <label>
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
          >
            <option value="all">
              {language === "zh"
                ? "全部"
                : language === "my"
                  ? "အားလုံး"
                  : "All"}
            </option>
            <option value="cash">
              {language === "zh"
                ? "现金支付"
                : language === "my"
                  ? "ငွေသား"
                  : "Cash"}
            </option>
            <option value="balance">
              {language === "zh"
                ? "余额支付"
                : language === "my"
                  ? "လက်ကျန်ငွေ"
                  : "Balance"}
            </option>
          </select>
          <label>{t.recordsPerPage}</label>
          <select
            value={packageRecordsPerPage}
            onChange={(e) => {
              setPackageRecordsPerPage(Number(e.target.value));
              setPackageRecordsPage(1);
            }}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      <div className="finance-package-table-wrap">
        <table className="finance-package-table">
          <thead>
            <tr>
              <th>{t.orderId}</th>
              <th>{language === "my" ? "ပို့ဆောင်သူ" : "寄件人"}</th>
              <th>{language === "my" ? "လက်ခံသူ" : "收件人"}</th>
              <th>{language === "my" ? "ပစ္စည်းအမျိုးအစား" : "包裹类型"}</th>
              <th>{t.amount}</th>
              <th>
                {language === "zh"
                  ? "支付方式"
                  : language === "my"
                    ? "ပေးချေမှု"
                    : "Payment"}
              </th>
              <th>{t.status}</th>
              <th>{language === "my" ? "ပို့ဆောင်ချိန်" : "送达时间"}</th>
            </tr>
          </thead>
          <tbody>
            {deliveredPackagesSorted.length === 0 ? (
              <tr>
                <td colSpan={8} className="finance-package-empty">
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
                  <tr key={pkg.id}>
                    <td>{pkg.id}</td>
                    <td>{pkg.sender_name}</td>
                    <td>{pkg.receiver_name}</td>
                    <td>{pkg.package_type}</td>
                    <td>
                      <span className="finance-package-amount">
                        {price.toLocaleString()} MMK
                      </span>
                    </td>
                    <td>
                      <span
                        className={`finance-package-pill${
                          isCashPayment
                            ? " finance-package-pill--cash"
                            : " finance-package-pill--balance"
                        }`}
                      >
                        {paymentLabel(isCashPayment)}
                      </span>
                    </td>
                    <td>
                      <span className="finance-package-pill finance-package-pill--done">
                        {t.completed}
                      </span>
                    </td>
                    <td>{pkg.delivery_time || "-"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {packageTotalPages <= 1
        ? null
        : (() => {
            const getPageNumbers = () => {
              const pages: (number | string)[] = [];
              const maxVisible = 5;

              if (packageTotalPages <= maxVisible) {
                for (let i = 1; i <= packageTotalPages; i++) {
                  pages.push(i);
                }
              } else {
                pages.push(1);
                if (packageCurrentPage > 3) pages.push("...");
                const start = Math.max(2, packageCurrentPage - 1);
                const end = Math.min(
                  packageTotalPages - 1,
                  packageCurrentPage + 1,
                );
                for (let i = start; i <= end; i++) pages.push(i);
                if (packageCurrentPage < packageTotalPages - 2) pages.push("...");
                pages.push(packageTotalPages);
              }

              return pages;
            };

            return (
              <div className="finance-package-pager">
                <div>
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
                <div className="finance-package-pager__pages">
                  <button
                    type="button"
                    onClick={() =>
                      setPackageRecordsPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={packageCurrentPage === 1}
                  >
                    {language === "zh"
                      ? "上一页"
                      : language === "my"
                        ? "ယခင်"
                        : "Prev"}
                  </button>
                  {getPageNumbers().map((page, index) => {
                    if (page === "...") {
                      return <span key={`ellipsis-${index}`}>...</span>;
                    }
                    const pageNum = page as number;
                    const isActive = pageNum === packageCurrentPage;
                    return (
                      <button
                        type="button"
                        key={pageNum}
                        className={isActive ? "is-active" : undefined}
                        onClick={() => setPackageRecordsPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() =>
                      setPackageRecordsPage((prev) =>
                        Math.min(packageTotalPages, prev + 1),
                      )
                    }
                    disabled={packageCurrentPage === packageTotalPages}
                  >
                    {language === "zh"
                      ? "下一页"
                      : language === "my"
                        ? "နောက်သို့"
                        : "Next"}
                  </button>
                </div>
              </div>
            );
          })()}
    </div>
  );
};

export default FinancePackageRecordsTab;
