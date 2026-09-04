// @ts-nocheck — 从 FinanceManagement 原样搬出的 Tab JSX；类型由父组件工作区承担。
import React from "react";

import { useFinanceWorkspace } from "./FinanceWorkspace";

const formatMmk = (value: number) => `${(value || 0).toLocaleString()} MMK`;

const OverviewCard = ({
  title,
  value,
  description,
  tone,
  onClick,
  clickHint,
}) => {
  const className = `finance-ov-card finance-ov-card--${tone}${
    onClick ? " finance-ov-card--click" : ""
  }`;
  const body = (
    <>
      <div className="finance-ov-card__label">{title}</div>
      <div className="finance-ov-card__value">{formatMmk(value)}</div>
      <div className="finance-ov-card__desc">{description}</div>
      {onClick ? (
        <div className="finance-ov-card__hint">{clickHint}</div>
      ) : null}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {body}
      </button>
    );
  }

  return <div className={className}>{body}</div>;
};

const FinanceOverviewTab: React.FC = () => {
  const {
    handleMerchantCollectionClick,
    handlePendingCashClick,
    handlePlatformPaymentClick,
    language,
    summary,
    t,
  } = useFinanceWorkspace();

  const booksLeft =
    (summary.totalStartingFee || 0) +
    (summary.waySidePlatformKeep || 0) +
    (summary.courierKmCost || 0);
  const booksGap = booksLeft - (summary.packageIncome || 0);
  const booksOk = !!summary.booksBalanced;

  const platformTitle =
    language === "my"
      ? "စုစုပေါင်း ပလက်ဖောင်းမှပေးချေမှု"
      : language === "en"
        ? "Platform / balance pay"
        : "总平台支付（余额支付）";
  const platformDesc =
    language === "my"
      ? "လက်ကျန်ငွေဖြင့် ပေးချေခြင်း"
      : language === "en"
        ? "Balance/platform tags on delivered orders"
        : "已送达订单 description 中的余额/平台支付合计";

  return (
    <div className="finance-ov">
      <p className="finance-ov-note">{t.overviewLedgerHint}</p>

      <section className="finance-ov-panel">
        <h3 className="finance-ov-panel__title">{t.overviewSectionBooks}</h3>
        <div className="finance-ov-grid finance-ov-grid--3">
          <OverviewCard
            title={t.totalIncome}
            value={summary.totalIncome}
            description={t.totalIncomeDesc}
            tone="in"
          />
          <OverviewCard
            title={t.totalExpense}
            value={summary.totalExpense}
            description={t.totalExpenseDesc}
            tone="out"
          />
          <OverviewCard
            title={t.netProfit}
            value={summary.netProfit}
            description={t.netProfitDesc}
            tone={summary.netProfit >= 0 ? "net" : "net-neg"}
          />
        </div>
      </section>

      <section className="finance-ov-panel">
        <h3 className="finance-ov-panel__title">{t.overviewSectionCollection}</h3>
        <div className="finance-ov-grid finance-ov-grid--3">
          <OverviewCard
            title={platformTitle}
            value={summary.totalPlatformPayment}
            description={platformDesc}
            tone="platform"
            onClick={() => handlePlatformPaymentClick()}
            clickHint={t.overviewClickHint}
          />
          <OverviewCard
            title={t.pendingPayments}
            value={summary.pendingPayments}
            description={t.pendingAmountDesc}
            tone="pending"
            onClick={() => handlePendingCashClick()}
            clickHint={t.overviewClickHint}
          />
          <OverviewCard
            title={t.totalMerchantCollection}
            value={summary.merchantsCollection}
            description={t.merchantsCollectionDesc}
            tone="merchant"
            onClick={() =>
              handleMerchantCollectionClick(undefined, { scope: "all" })
            }
            clickHint={t.overviewClickHint}
          />
        </div>
      </section>

      <section className="finance-ov-panel">
        <h3 className="finance-ov-panel__title">{t.overviewSectionOrders}</h3>
        <div className="finance-ov-grid finance-ov-grid--orders">
          <OverviewCard
            title={t.totalStartingFee}
            value={summary.totalStartingFee}
            description={t.totalStartingFeeDesc}
            tone="start"
          />
          <OverviewCard
            title={t.waySidePlatformKeep}
            value={summary.waySidePlatformKeep}
            description={
              <>
                <div>{t.waySidePlatformKeepDesc}</div>
                {summary.waySideCount > 0 ? (
                  <div>
                    {summary.waySideCount} {t.packageSuffix}
                  </div>
                ) : null}
              </>
            }
            tone="wayside"
          />
          <OverviewCard
            title={t.courierKmCost}
            value={summary.courierKmCost}
            description={t.courierFeeDesc}
            tone="rider"
          />
          <OverviewCard
            title={t.orderIncome}
            value={summary.packageIncome}
            description={
              <>
                <div>
                  {t.orderIncomeCashLabel}：
                  {formatMmk(summary.packageIncomeCash)}（
                  {summary.packageIncomeCashCount || 0} {t.packageSuffix}）
                </div>
                <div>
                  {t.orderIncomeBalanceLabel}：
                  {formatMmk(summary.packageIncomeBalance)}（
                  {summary.packageIncomeBalanceCount || 0} {t.packageSuffix}）
                </div>
              </>
            }
            tone="income"
          />
        </div>

        <div
          className={`finance-ov-eq${booksOk ? " finance-ov-eq--ok" : " finance-ov-eq--gap"}`}
        >
          <span className="finance-ov-eq__term">
            {t.totalStartingFee} {formatMmk(summary.totalStartingFee)}
          </span>
          <span className="finance-ov-eq__op">+</span>
          <span className="finance-ov-eq__term">
            {t.waySidePlatformKeep} {formatMmk(summary.waySidePlatformKeep)}
          </span>
          <span className="finance-ov-eq__op">+</span>
          <span className="finance-ov-eq__term">
            {t.courierKmCost} {formatMmk(summary.courierKmCost)}
          </span>
          <span className="finance-ov-eq__op">=</span>
          <span className="finance-ov-eq__sum">
            {t.orderIncome} {formatMmk(summary.packageIncome)}
          </span>
          <span className="finance-ov-eq__status">
            {booksOk
              ? t.overviewBooksOk
              : `${t.overviewBooksGap} ${formatMmk(Math.abs(booksGap))}`}
          </span>
        </div>
      </section>
    </div>
  );
};

export default FinanceOverviewTab;
