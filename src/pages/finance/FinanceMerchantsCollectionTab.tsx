// @ts-nocheck — 从 FinanceManagement 原样搬出的 Tab JSX；类型由父组件工作区承担。
import React from "react";

import { REGIONS } from "../FinanceManagement.helpers";
import { useFinanceWorkspace } from "./FinanceWorkspace";

function nextCodDue(store) {
  const days = parseInt(store.cod_settlement_day || "7", 10) || 7;
  const baseDate = store.lastSettledAt
    ? new Date(store.lastSettledAt)
    : new Date(store.created_at);
  const nextDate = new Date(baseDate);
  nextDate.setDate(baseDate.getDate() + days);
  return {
    days,
    nextDate,
    isOverdue: new Date() > nextDate,
  };
}

function MerchantCodCard({
  store,
  language,
  t,
  isRegionalUser,
  handleMerchantAllSettledOrdersClick,
  handleMerchantCollectionClick,
  handleSettleMerchant,
}) {
  const year = new Date().getFullYear();
  const due = nextCodDue(store);
  const isOpen = store.unclearedAmount > 0;
  const lastSettledLabel = store.lastSettledAt
    ? new Date(store.lastSettledAt).toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <article
      className={`finance-mc-card${isOpen ? " is-open" : ""}${due.isOverdue ? " is-overdue" : ""}`}
    >
      <div className="finance-mc-card__head">
        <h3 className="finance-mc-card__name">{store.store_name}</h3>
        <span className={`finance-mc-status${isOpen ? " is-open" : " is-clear"}`}>
          {isOpen ? t.unsettled : t.settled}
        </span>
      </div>

      {(store.contact_phone || store.address || store.store_code) && (
        <div className="finance-mc-meta">
          {store.contact_phone && <p>{store.contact_phone}</p>}
          {store.address && <p>{store.address}</p>}
          {store.store_code && (
            <p>
              {language === "zh" ? "代码" : language === "my" ? "ကုဒ်" : "Code"}
              <span className="finance-mc-code">{store.store_code}</span>
            </p>
          )}
        </div>
      )}

      <div className="finance-mc-metrics">
        <button
          type="button"
          className="finance-ov-card finance-ov-card--click finance-ov-card--net"
          onClick={() => handleMerchantAllSettledOrdersClick(store.store_name)}
        >
          <div className="finance-ov-card__label">
            {language === "zh"
              ? `${year}年已结清`
              : language === "en"
                ? `Settled ${year}`
                : `${year} ရှင်းပြီး`}
          </div>
          <div className="finance-ov-card__value">
            {store.settledThisYearCount}
            {language === "zh" ? " 单" : language === "en" ? " orders" : " ခု"}
          </div>
        </button>
        <button
          type="button"
          className="finance-ov-card finance-ov-card--click finance-ov-card--merchant"
          onClick={() =>
            handleMerchantCollectionClick(store.store_name, { scope: "all" })
          }
        >
          <div className="finance-ov-card__label">
            {language === "my" ? "ရှင်းလင်းရန် ကျန်ငွေ" : t.pendingAmount}
          </div>
          <div className="finance-ov-card__value">
            {store.unclearedAmount.toLocaleString()} MMK
          </div>
        </button>
      </div>

      <p className="finance-mc-note">
        {t.unsettledOrders}{" "}
        <strong>
          {store.unclearedCount}
          {language === "zh" ? " 单" : ""}
        </strong>
        {lastSettledLabel ? (
          <>
            {" · "}
            {t.lastSettled} <strong>{lastSettledLabel}</strong>
          </>
        ) : null}
      </p>

      <div className={`finance-mc-due${due.isOverdue ? " is-late" : ""}`}>
        <div className="finance-mc-due__row">
          <span className="finance-mc-due__label">
            {language === "zh"
              ? "COD 结清周期"
              : language === "my"
                ? "COD ရှင်းလင်းရေးကာလ"
                : "COD cycle"}
          </span>
          <span className="finance-mc-due__value">
            {store.cod_settlement_day || "7"}{" "}
            {language === "zh" ? "天" : "Days"}
          </span>
        </div>
        <div className="finance-mc-due__row">
          <span className="finance-mc-due__label">
            {language === "zh"
              ? "下次结清日"
              : language === "my"
                ? "နောက်တစ်ကြိမ်ရှင်းလင်းရမည့်ရက်"
                : "Next settlement"}
          </span>
          <span className="finance-mc-due__value is-date">
            {due.nextDate.toLocaleDateString("zh-CN", {
              month: "2-digit",
              day: "2-digit",
            })}
            {due.isOverdue && (
              <span className="finance-mc-late">
                {language === "zh" ? "逾期" : "Overdue"}
              </span>
            )}
          </span>
        </div>
      </div>

      {isOpen && (
        <button
          type="button"
          className="admin-shell__btn admin-shell__btn--primary"
          disabled={isRegionalUser}
          onClick={() =>
            !isRegionalUser && handleSettleMerchant(store.id, store.store_name)
          }
        >
          {t.confirmSettle} ({store.unclearedAmount.toLocaleString()} MMK)
          {isRegionalUser ? (
            <span>
              {language === "zh"
                ? "仅限总公司管理员操作"
                : language === "my"
                  ? "ပင်မရုံးချုပ် စီမံခန့်ခွဲသူသာ ဆောင်ရွက်နိုင်သည်"
                  : "HQ Admin Only"}
            </span>
          ) : null}
        </button>
      )}
    </article>
  );
}

const FinanceMerchantsCollectionTab: React.FC = () => {
  const {
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
  } = useFinanceWorkspace();

  const cardProps = {
    language,
    t,
    isRegionalUser,
    handleMerchantAllSettledOrdersClick,
    handleMerchantCollectionClick,
    handleSettleMerchant,
  };

  const emptyCopy =
    language === "zh"
      ? "暂无合伙店铺数据"
      : language === "my"
        ? "လုပ်ဖော်ကိုင်ဖက်ဆိုင် အချက်အလက် မရှိသေးပါ"
        : "No merchant store data";

  const regionStores =
    merchantRegionFilter === "all"
      ? merchantsCollectionStats
      : merchantsCollectionStats.filter(
          (store) => getStoreRegionPrefix(store) === merchantRegionFilter,
        );

  const regionMeta = REGIONS.find((r) => r.prefix === merchantRegionFilter);

  return (
    <div className="finance-mc">
      <div className="finance-mc-bar">
        <h3 className="finance-mc-title">{t.merchantsCollection}</h3>
        <label className="finance-mc-label" htmlFor="finance-mc-region">
          {language === "zh"
            ? "分区域"
            : language === "my"
              ? "ဒေသအလိုက်"
              : "Region"}
        </label>
        <select
          id="finance-mc-region"
          className="finance-cr-select"
          value={merchantRegionFilter}
          onChange={(e) => setMerchantRegionFilter(e.target.value)}
        >
          <option value="all">
            {language === "zh"
              ? "全部地区"
              : language === "my"
                ? "ဒေသအားလုံး"
                : "All Regions"}
          </option>
          {REGIONS.map((region) => (
            <option key={region.prefix} value={region.prefix}>
              {region.prefix}
            </option>
          ))}
        </select>
      </div>

      {regionStores.length === 0 ? (
        <div className="finance-mc-empty">{emptyCopy}</div>
      ) : (
        <>
          {regionMeta && (
            <p className="finance-mc-region">
              {regionMeta.name} ({regionMeta.prefix})
            </p>
          )}
          <div className="finance-mc-grid">
            {regionStores.map((store) => (
              <MerchantCodCard key={store.id} store={store} {...cardProps} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default FinanceMerchantsCollectionTab;
