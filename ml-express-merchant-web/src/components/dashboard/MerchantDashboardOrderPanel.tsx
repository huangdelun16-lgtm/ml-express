import React from 'react';
import { MERCHANT_ORDER_STATUS } from '../../constants/merchantOrderStatus';
import { useNavigate } from 'react-router-dom';
import { useMerchantOrdersOptional } from '../../contexts/MerchantOrderContext';
import '../../styles/merchantDashboardOrderPanel.css';

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
            status: MERCHANT_ORDER_STATUS.PENDING_CONFIRM,
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
    <div className="merchant-order-panel">
      <div className="merchant-order-panel__top">
        <div>
          <h2 className="merchant-order-panel__title">{copy.title}</h2>
          <p className="merchant-order-panel__hint">{copy.hint}</p>
        </div>
        <button type="button" className="merchant-order-panel__open" onClick={() => go()}>
          {copy.open}
        </button>
      </div>

      <div className="merchant-order-panel__grid">
        {chips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            className={`merchant-order-panel__chip${chip.highlight ? ' is-alert' : ''}`}
            onClick={() => go(chip.status)}
          >
            <div className="merchant-order-panel__count">{chip.count}</div>
            <div className="merchant-order-panel__label">{chip.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MerchantDashboardOrderPanel;
