import React, { useCallback, useEffect, useState } from 'react';
import { packageService } from '../../services/supabase';
import { MERCHANT_ORDERS_REFRESH } from '../../utils/merchantOrderEvents';
import LoggerService from '../../services/LoggerService';
import '../../styles/merchantRevenuePanel.css';

interface Props {
  language: string;
  storeId: string | null | undefined;
  storeName?: string;
}

type RevenueStats = {
  revenueOneYear: number;
  yesterdayRevenue: number;
  todayRevenue: number;
  todayOrderCount: number;
  yesterdayOrderCount: number;
};

const MerchantRevenuePanel: React.FC<Props> = ({ language, storeId, storeName }) => {
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [loading, setLoading] = useState(false);

  const copy = {
    zh: {
      title: '经营概况',
      hint: '已送达订单商品费（不含跑腿费）',
      year: '本年营收',
      yesterday: '昨日营收',
      today: '今日营收',
      ordersToday: '今日单量',
      ordersYesterday: '昨日单量',
      mmk: 'MMK',
    },
    en: {
      title: 'Business overview',
      hint: 'Delivered item fees only (excl. delivery)',
      year: 'YTD revenue',
      yesterday: 'Yesterday',
      today: 'Today',
      ordersToday: 'Orders today',
      ordersYesterday: 'Orders yesterday',
      mmk: 'MMK',
    },
    my: {
      title: 'လုပ်ငန်းအခြေအနေ',
      hint: 'ပို့ဆောင်ပြီး ကုန်ပစ္စည်းဖိုးသာ',
      year: 'ယခုနှစ် ဝင်ငွေ',
      yesterday: 'မနေ့ ဝင်ငွေ',
      today: 'ယနေ့ ဝင်ငွေ',
      ordersToday: 'ယနေ့ အော်ဒါ',
      ordersYesterday: 'မနေ့ အော်ဒါ',
      mmk: 'MMK',
    },
  }[(language === 'en' || language === 'my' ? language : 'zh') as 'zh' | 'en' | 'my'];

  const load = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const data = await packageService.getRevenueStats(storeId, storeName);
      setStats(data);
    } catch (e) {
      LoggerService.error('加载营收失败', e);
    } finally {
      setLoading(false);
    }
  }, [storeId, storeName]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onRefresh = () => load();
    window.addEventListener(MERCHANT_ORDERS_REFRESH, onRefresh);
    return () => window.removeEventListener(MERCHANT_ORDERS_REFRESH, onRefresh);
  }, [load]);

  if (!storeId) return null;

  const fmt = (n: number) => Math.round(n).toLocaleString();

  const cards = [
    { key: 'today', label: copy.today, value: stats?.todayRevenue ?? 0, isMoney: true, variant: 'today' },
    { key: 'year', label: copy.year, value: stats?.revenueOneYear ?? 0, isMoney: true, variant: 'year' },
    { key: 'yesterday', label: copy.yesterday, value: stats?.yesterdayRevenue ?? 0, isMoney: true, variant: 'yesterday' },
    { key: 'ordersToday', label: copy.ordersToday, value: stats?.todayOrderCount ?? 0, isMoney: false, variant: 'count' },
    { key: 'ordersYesterday', label: copy.ordersYesterday, value: stats?.yesterdayOrderCount ?? 0, isMoney: false, variant: 'count' },
  ] as const;

  return (
    <section className="merchant-revenue" aria-busy={loading && !stats} aria-labelledby="merchant-revenue-title">
      <header className="merchant-revenue__head">
        <h2 id="merchant-revenue-title" className="merchant-revenue__title">
          {copy.title}
        </h2>
        <p className="merchant-revenue__hint">{copy.hint}</p>
      </header>

      <div className="merchant-revenue__grid">
        {cards.map((card) => (
          <div key={card.key} className={`merchant-revenue__card merchant-revenue__card--${card.variant}`}>
            <p className="merchant-revenue__label">{card.label}</p>
            {loading && !stats ? (
              <span className="merchant-revenue__skel" aria-hidden="true" />
            ) : (
              <div className="merchant-revenue__value-row">
                <span className="merchant-revenue__value">{fmt(card.value)}</span>
                {card.isMoney ? <span className="merchant-revenue__unit">{copy.mmk}</span> : null}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default MerchantRevenuePanel;
