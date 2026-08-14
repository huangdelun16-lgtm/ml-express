// @ts-nocheck — 从 FinanceManagement 原样搬出的 Tab JSX；类型由父组件工作区承担。
import React from "react";

import { useFinanceWorkspace } from "./FinanceWorkspace";

const FinanceOverviewTab: React.FC = () => {
  const {
    handleMerchantCollectionClick,
    handlePendingPaymentsClick,
    handlePlatformPaymentClick,
    isMobile,
    language,
    renderSummaryCard,
    summary,
    t,
  } = useFinanceWorkspace();

  return (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
              gap: "18px",
            }}
          >
            {/* 排列规则：1排3张卡片 - 严格执行用户要求的顺序 */}

            {/* 第一排：核心财务状况 */}
            {renderSummaryCard(
              t.totalIncome,
              summary.totalIncome,
              t.totalIncomeDesc,
              "#4cd137",
            )}
            {renderSummaryCard(
              t.totalExpense,
              summary.totalExpense,
              t.totalExpenseDesc,
              "#ff7979",
            )}
            {renderSummaryCard(
              t.netProfit,
              summary.netProfit,
              t.netProfitDesc,
              summary.netProfit >= 0 ? "#00cec9" : "#ff7675",
            )}

            {/* 第二排：收支明细与代收 */}
            {renderSummaryCard(
              language === "my"
                ? "စုစုပေါင်း ပလက်ဖောင်းမှပေးချေမှု"
                : "总平台支付 (余额支付)",
              summary.totalPlatformPayment,
              language === "my"
                ? "လက်ကျန်ငွေဖြင့် ပေးချေခြင်း"
                : "所有订单的余额支付汇总",
              "#3b82f6",
              () => handlePlatformPaymentClick(),
            )}
            {renderSummaryCard(
              t.pendingPayments,
              summary.pendingPayments,
              t.pendingAmountDesc,
              "#fbc531",
              () => handleMerchantCollectionClick(),
            )}
            {renderSummaryCard(
              t.totalMerchantCollection,
              summary.merchantsCollection,
              t.merchantsCollectionDesc,
              "#ef4444",
              () => handlePendingPaymentsClick(),
            )}

            {/* 第三排：成本与分成 */}
            {renderSummaryCard(
              t.totalStartingFee,
              summary.totalStartingFee,
              t.totalStartingFeeDesc,
              "#a29bfe",
            )}
            {renderSummaryCard(
              t.courierKmCost,
              summary.courierKmCost,
              language === "zh"
                ? "骑手分得总额：按每单所属领区读取计费规则；普通单=跑腿费−起步价快照；顺路递可设固定 MMK/单。曼德勒改价不影响仰光单。"
                : "Rider share uses each package's region pricing (Admin billing regions). Mandalay changes do not affect Yangon orders.",
              "#fd79a8",
            )}
            {renderSummaryCard(
              t.orderIncome,
              summary.packageIncome,
              <>
                <div>
                  现金支付：{summary.packageIncomeCash.toLocaleString()} MMK
                </div>
                <div>
                  余额支付：{summary.packageIncomeBalance.toLocaleString()}{" "}
                  MMK（{summary.packageCount} {t.packageSuffix}）
                </div>
              </>,
              "#6c5ce7",
            )}
          </div>
  );
};

export default FinanceOverviewTab;
