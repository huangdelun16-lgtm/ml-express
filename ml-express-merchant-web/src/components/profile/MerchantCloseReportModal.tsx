import React from 'react';
import type { MerchantLanguage } from '../../constants/merchantOrderStatus';
import type { TodayCloseReport } from '../../utils/merchantOpsReport';
import './merchantCloseReportModal.css';

type Props = {
  open: boolean;
  language: MerchantLanguage;
  mode: 'view' | 'close';
  report: TodayCloseReport | null;
  confirmLoading?: boolean;
  onClose: () => void;
  onConfirmClose?: () => void;
  onOpenProducts?: () => void;
};

const copy = {
  zh: {
    titleView: '今日关店报表',
    titleClose: '关店前核对',
    subtitle: '先看一眼今天的单量和缺货，再决定打烊。',
    todayOrders: '今日新单',
    unfinished: '未完成',
    completed: '今日送达',
    cancelled: '今日取消',
    fee: '今日跑腿费',
    cod: '今日代收款',
    pending: '待接单',
    packing: '打包中',
    pickup: '待取件',
    transit: '配送中',
    stock: '缺货提醒',
    stockEmpty: '库存正常，没有缺货或偏低商品。',
    out: '缺货',
    low: '偏低',
    leftoverHint: '还有未完成订单，关店后顾客将无法新下单。',
    closeBtn: '确认今日关店',
    viewBtn: '知道了',
    products: '去补货',
  },
  en: {
    titleView: 'Today’s close report',
    titleClose: 'Check before closing',
    subtitle: 'Review today’s orders and stock before closing the store.',
    todayOrders: 'New today',
    unfinished: 'Unfinished',
    completed: 'Delivered today',
    cancelled: 'Cancelled today',
    fee: 'Delivery fees',
    cod: 'COD today',
    pending: 'To accept',
    packing: 'Packing',
    pickup: 'Pickup',
    transit: 'In transit',
    stock: 'Stock alerts',
    stockEmpty: 'Stock looks fine — no out-of-stock or low items.',
    out: 'Out',
    low: 'Low',
    leftoverHint: 'Unfinished orders remain. Customers cannot place new orders after close.',
    closeBtn: 'Close store today',
    viewBtn: 'OK',
    products: 'Restock',
  },
  my: {
    titleView: 'ယနေ့ပိတ်သိမ်းအစီရင်ခံစာ',
    titleClose: 'မပိတ်မီ စစ်ဆေးရန်',
    subtitle: 'အော်ဒါနှင့် ကုန်ပစ္စည်းလက်ကျန်ကို ကြည့်ပြီးမှ ပိတ်ပါ။',
    todayOrders: 'ယနေ့အော်ဒါ',
    unfinished: 'မပြီးသေး',
    completed: 'ယနေ့ပို့ပြီး',
    cancelled: 'ယနေ့ပယ်ဖျက်',
    fee: 'ပို့ဆောင်ခ',
    cod: 'COD',
    pending: 'လက်ခံရန်',
    packing: 'ထုပ်ပိုးနေ',
    pickup: 'လာယူရန်',
    transit: 'ပို့ဆောင်နေ',
    stock: 'လက်ကျန်သတိပေး',
    stockEmpty: 'လက်ကျန်အဆင်ပြေပါသည်။',
    out: 'ကုန်',
    low: 'နည်း',
    leftoverHint: 'မပြီးသေးသော အော်ဒါရှိပါသည်။ ပိတ်ပြီးနောက် အော်ဒါအသစ်မတင်နိုင်ပါ။',
    closeBtn: 'ယနေ့ဆိုင်ပိတ်မည်',
    viewBtn: 'ရပါပြီ',
    products: 'ကုန်ဖြည့်',
  },
};

function money(n: number) {
  return `${Math.round(n).toLocaleString()} MMK`;
}

const MerchantCloseReportModal: React.FC<Props> = ({
  open,
  language,
  mode,
  report,
  confirmLoading,
  onClose,
  onConfirmClose,
  onOpenProducts,
}) => {
  if (!open || !report) return null;
  const t = copy[language] || copy.zh;
  const stats = [
    { label: t.todayOrders, value: report.todayOrderCount },
    { label: t.unfinished, value: report.unfinishedCount, warn: report.unfinishedCount > 0 },
    { label: t.completed, value: report.completedToday },
    { label: t.cancelled, value: report.cancelledToday },
  ];

  return (
    <div className="merchant-close-report" role="presentation" onClick={onClose}>
      <div
        className="merchant-close-report__panel"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="merchant-close-report__head">
          <div>
            <h2>{mode === 'close' ? t.titleClose : t.titleView}</h2>
            <p>
              {report.dateKey} · {t.subtitle}
            </p>
          </div>
          <button type="button" className="merchant-close-report__x" onClick={onClose}>
            ✕
          </button>
        </header>

        <div className="merchant-close-report__grid">
          {stats.map((item) => (
            <div
              key={item.label}
              className={`merchant-close-report__stat${item.warn ? ' is-warn' : ''}`}
            >
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>

        <div className="merchant-close-report__money">
          <div>
            <span>{t.fee}</span>
            <strong>{money(report.todayDeliveryFee)}</strong>
          </div>
          <div>
            <span>{t.cod}</span>
            <strong>{money(report.todayCodAmount)}</strong>
          </div>
        </div>

        <div className="merchant-close-report__pills">
          <span>
            {t.pending} {report.pendingConfirm}
          </span>
          <span>
            {t.packing} {report.packing}
          </span>
          <span>
            {t.pickup} {report.pendingPickup}
          </span>
          <span>
            {t.transit} {report.inTransit}
          </span>
        </div>

        {report.unfinishedCount > 0 && mode === 'close' ? (
          <p className="merchant-close-report__hint">{t.leftoverHint}</p>
        ) : null}

        <section className="merchant-close-report__stock">
          <div className="merchant-close-report__stock-head">
            <h3>{t.stock}</h3>
            <span>
              {t.out} {report.outOfStockCount} · {t.low} {report.lowStockCount}
            </span>
          </div>
          {report.stockAlerts.length === 0 ? (
            <p className="merchant-close-report__empty">{t.stockEmpty}</p>
          ) : (
            <ul>
              {report.stockAlerts.slice(0, 12).map((item) => (
                <li key={`${item.productId}-${item.variantName || 'base'}`}>
                  <span>
                    {item.productName}
                    {item.variantName ? ` · ${item.variantName}` : ''}
                  </span>
                  <em className={item.level === 'out' ? 'is-out' : 'is-low'}>
                    {item.level === 'out' ? t.out : t.low} {item.stock}
                  </em>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="merchant-close-report__actions">
          {onOpenProducts && report.stockAlerts.length > 0 ? (
            <button type="button" className="is-ghost" onClick={onOpenProducts}>
              {t.products}
            </button>
          ) : null}
          {mode === 'close' ? (
            <button
              type="button"
              className="is-danger"
              disabled={confirmLoading}
              onClick={onConfirmClose}
            >
              {t.closeBtn}
            </button>
          ) : (
            <button type="button" className="is-primary" onClick={onClose}>
              {t.viewBtn}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
};

export default MerchantCloseReportModal;
