import React, { useCallback, useEffect, useState } from 'react';
import { packageService } from '../../services/supabase';
import { MERCHANT_ORDERS_REFRESH } from '../../utils/merchantOrderEvents';
import LoggerService from '../../services/LoggerService';

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

  return (
    <div
      style={{
        marginBottom: '2rem',
        padding: '1.35rem',
        borderRadius: '20px',
        background:
          'linear-gradient(135deg, rgba(30, 58, 138, 0.25) 0%, rgba(15, 23, 42, 0.6) 100%)',
        border: '1px solid rgba(96, 165, 250, 0.25)',
        boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
      }}
    >
      <div style={{ marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>
          📈 {copy.title}
        </h2>
        <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', color: 'rgba(203,213,225,0.8)' }}>
          {copy.hint}
        </p>
      </div>

      {loading && !stats ? (
        <p style={{ color: 'rgba(148,163,184,0.9)', margin: 0 }}>…</p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '0.75rem',
          }}
        >
          {[
            { label: copy.year, value: stats?.revenueOneYear ?? 0, accent: '#fbbf24', isMoney: true },
            { label: copy.yesterday, value: stats?.yesterdayRevenue ?? 0, accent: '#a78bfa', isMoney: true },
            { label: copy.today, value: stats?.todayRevenue ?? 0, accent: '#34d399', isMoney: true },
            {
              label: copy.ordersToday,
              value: stats?.todayOrderCount ?? 0,
              accent: '#38bdf8',
              isMoney: false,
            },
            {
              label: copy.ordersYesterday,
              value: stats?.yesterdayOrderCount ?? 0,
              accent: '#94a3b8',
              isMoney: false,
            },
          ].map((card) => (
            <div
              key={card.label}
              style={{
                padding: '0.9rem 1rem',
                borderRadius: '14px',
                background: 'rgba(0,0,0,0.22)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: 'rgba(203,213,225,0.75)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: '0.35rem',
                }}
              >
                {card.label}
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: card.accent }}>
                {fmt(card.value)}
                {card.isMoney ? ` ${copy.mmk}` : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MerchantRevenuePanel;
