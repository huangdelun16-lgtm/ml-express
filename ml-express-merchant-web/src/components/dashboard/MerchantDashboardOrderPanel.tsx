import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMerchantOrdersOptional } from '../../contexts/MerchantOrderContext';

interface Props {
  language: string;
  orderStats: {
    total: number;
    pendingConfirmation: number;
    packing: number;
    pendingPickup: number;
    inTransit: number;
    completed: number;
  };
  isPartnerStore: boolean;
}

const MerchantDashboardOrderPanel: React.FC<Props> = ({
  language,
  orderStats,
  isPartnerStore,
}) => {
  const navigate = useNavigate();
  const merchantOrders = useMerchantOrdersOptional();
  const pendingRealtime = merchantOrders?.pendingCount ?? orderStats.pendingConfirmation;

  const copy = {
    zh: {
      title: '订单处理',
      hint: '完整列表与打包、地图等功能请在「订单列表」中操作',
      all: '全部订单',
      pending: '待接单',
      packing: '打包中',
      pickup: '待取件',
      transit: '配送中',
      done: '已完成',
      open: '进入订单列表',
    },
    en: {
      title: 'Orders',
      hint: 'Use Orders page for packing, maps, and full list',
      all: 'All',
      pending: 'To accept',
      packing: 'Packing',
      pickup: 'Pickup',
      transit: 'In transit',
      done: 'Completed',
      open: 'Open orders',
    },
    my: {
      title: 'အော်ဒါစီမံမှု',
      hint: 'အပြည့်အစုံ စာရင်းနှင့် ထုပ်ပိုးခြင်းကို အော်ဒါစာရင်းတွင် လုပ်ဆောင်ပါ',
      all: 'အားလုံး',
      pending: 'လက်ခံရန်',
      packing: 'ထုပ်ပိုးနေ',
      pickup: 'လာယူရန်',
      transit: 'ပို့ဆောင်နေ',
      done: 'ပြီးစီး',
      open: 'အော်ဒါစာရင်းသို့',
    },
  }[(language === 'en' || language === 'my' ? language : 'zh') as 'zh' | 'en' | 'my'];

  const go = (status?: string) => {
    navigate(status ? `/orders?status=${encodeURIComponent(status)}` : '/orders');
  };

  const chips: { key: string; label: string; count: number; status?: string; highlight?: boolean }[] = [
    { key: 'all', label: copy.all, count: orderStats.total, status: undefined },
    ...(isPartnerStore
      ? [
          {
            key: 'pending',
            label: copy.pending,
            count: pendingRealtime,
            status: '待确认',
            highlight: pendingRealtime > 0,
          },
          {
            key: 'packing',
            label: copy.packing,
            count: orderStats.packing,
            status: '打包中',
          },
        ]
      : []),
    { key: 'pickup', label: copy.pickup, count: orderStats.pendingPickup, status: '待取件' },
    { key: 'transit', label: copy.transit, count: orderStats.inTransit, status: '运输中' },
    { key: 'done', label: copy.done, count: orderStats.completed, status: '已完成' },
  ];

  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.12)',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        padding: '1.5rem',
        border: '1px solid rgba(255, 255, 255, 0.22)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        marginBottom: '2rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1rem',
        }}
      >
        <div>
          <h2 style={{ color: '#fff', fontSize: '1.35rem', margin: '0 0 0.35rem', fontWeight: 800 }}>
            {copy.title}
          </h2>
          <p style={{ margin: 0, color: 'rgba(226,232,240,0.75)', fontSize: '0.88rem' }}>{copy.hint}</p>
        </div>
        <button
          type="button"
          onClick={() => go()}
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '12px',
            border: 'none',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: '#fff',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer',
            boxShadow: '0 8px 20px rgba(37,99,235,0.35)',
          }}
        >
          {copy.open} →
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '0.75rem',
        }}
      >
        {chips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={() => go(chip.status)}
            style={{
              textAlign: 'left',
              padding: '0.85rem 1rem',
              borderRadius: '14px',
              border: chip.highlight
                ? '2px solid #fbbf24'
                : '1px solid rgba(255,255,255,0.12)',
              background: chip.highlight
                ? 'rgba(251,191,36,0.12)'
                : 'rgba(255,255,255,0.06)',
              color: '#f8fafc',
              cursor: 'pointer',
              transition: 'transform 0.15s ease',
            }}
          >
            <div style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.2rem' }}>
              {chip.count}
            </div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, opacity: 0.85 }}>{chip.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MerchantDashboardOrderPanel;
