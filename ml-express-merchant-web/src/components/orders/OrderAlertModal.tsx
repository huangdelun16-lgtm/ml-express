import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import {
  merchantService,
  packageService,
  supabase,
} from '../../services/supabase';
import LoggerService from '../../services/LoggerService';
import type { MerchantPendingOrder } from '../../contexts/MerchantOrderContext';
import './OrderAlertModal.css';

type Lang = 'zh' | 'en' | 'my';

function parseOrderItems(
  description: string | undefined,
  priceMap: Record<string, number>,
) {
  if (!description) return [];
  const itemsMatch = description.match(
    /\[(?:已选商品|Selected|Selected Products|ရွေးချယ်ထားသောပစ္စည်းများ|ကုန်ပစ္စည်းများ): (.*?)\]/,
  );
  if (!itemsMatch?.[1]) return [];
  return itemsMatch[1].split(', ').map((item) => {
    const match = item.match(/^(.+?)\s*x(\d+)$/i);
    if (!match) return { label: item, qty: 1, price: undefined as number | undefined };
    const name = match[1].trim();
    const qty = Number(match[2]) || 1;
    const unit = priceMap[name];
    return { label: name, qty, price: unit ? unit * qty : undefined };
  });
}

async function printMerchantReceipt(
  orderData: MerchantPendingOrder,
  language: Lang,
  productPriceMap: Record<string, number>,
) {
  const qrDataUrl = await QRCode.toDataURL(String(orderData.id), { width: 140, margin: 1 });
  const parsedItems = parseOrderItems(String(orderData.description || ''), productPriceMap);
  const itemPayMatch = String(orderData.description || '').match(
    /\[(?:商品费用 \(仅余额支付\)|Item Cost \(Balance Only\)|ကုန်ပစ္စည်းဖိုး \(လက်ကျန်ငွေဖြင့်သာ\)|余额支付|Balance Payment|လက်ကျန်ငွေဖြင့် ပေးချေခြင်း|平台支付|Platform Payment|ပလက်ဖောင်းမှ ပေးချေခြင်း): (.*?) MMK\]/,
  );
  const itemCost = itemPayMatch?.[1] ? parseFloat(itemPayMatch[1].replace(/,/g, '')) : 0;
  const deliveryFee = parseFloat(String(orderData.price || '').replace(/[^0-9.]/g, '') || '0');
  const computedItemTotal = parsedItems.reduce((sum, item) => sum + (item.price || 0), 0);
  const finalItemTotal = itemCost > 0 ? itemCost : computedItemTotal;
  const totalFee = deliveryFee + finalItemTotal;
  const paymentText =
    orderData.payment_method === 'cash'
      ? language === 'zh'
        ? '现金支付'
        : 'Cash'
      : language === 'zh'
        ? '余额支付'
        : 'Balance';
  const orderIdShort = `#${String(orderData.id).slice(-5)}`;
  const html = `<html><head><style>
    body{font-family:sans-serif;padding:20px;color:#111;width:300px;margin:0 auto}
    .title{text-align:center;font-size:20px;font-weight:900}
    .row{display:flex;justify-content:space-between;font-size:12px;margin:4px 0}
  </style></head><body>
    <div class="title">MARKET LINK EXPRESS</div>
    <div style="text-align:center;font-size:12px;margin:8px 0">${orderIdShort}</div>
    <img src="${qrDataUrl}" width="140" height="140" style="display:block;margin:0 auto"/>
    <div class="row"><span>支付</span><span>${paymentText}</span></div>
    <div class="row"><span>合计</span><span>${totalFee.toLocaleString()} MMK</span></div>
  </body></html>`;
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;width:0;height:0;border:none';
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 800);
  }, 400);
}

function isMemberBalanceOrder(description: string) {
  return (
    description.includes('[下单身份: 会员]') ||
    description.includes('[下单身份: VIP]') ||
    description.includes('[Orderer: VIP]') ||
    description.includes('[Orderer: Member]')
  );
}

export interface OrderAlertModalProps {
  visible: boolean;
  orders: MerchantPendingOrder[];
  language: Lang;
  onClose: () => void;
  onAccepted: (orderId: string) => void;
  onDeclined: (orderId: string) => void;
}

const OrderAlertModal: React.FC<OrderAlertModalProps> = ({
  visible,
  orders,
  language,
  onClose,
  onAccepted,
  onDeclined,
}) => {
  const navigate = useNavigate();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [productPriceMap, setProductPriceMap] = useState<Record<string, number>>({});

  const orderData = orders[selectedIndex];

  useEffect(() => {
    if (selectedIndex >= orders.length) {
      setSelectedIndex(Math.max(0, orders.length - 1));
    }
  }, [orders.length, selectedIndex]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const storeId = orderData?.delivery_store_id;
      if (!storeId) {
        setProductPriceMap({});
        return;
      }
      const products = await merchantService.getStoreProducts(String(storeId));
      if (!active) return;
      setProductPriceMap(
        products.reduce<Record<string, number>>((acc, p) => {
          acc[p.name] = p.price;
          return acc;
        }, {}),
      );
    };
    load();
    return () => {
      active = false;
    };
  }, [orderData?.delivery_store_id]);

  const items = useMemo(
    () => parseOrderItems(String(orderData?.description || ''), productPriceMap),
    [orderData?.description, productPriceMap],
  );

  if (!visible || orders.length === 0 || !orderData) return null;

  const t = {
    zh: {
      badge: '新订单',
      title: '请尽快接单',
      subtitle: '商城客户已下单，确认后进入打包流程',
      accept: '接单并打印',
      decline: '拒绝订单',
      viewAll: '在订单列表中处理',
      receiver: '收件人',
      phone: '电话',
      address: '地址',
      items: '商品清单',
      later: '稍后处理',
    },
    en: {
      badge: 'New order',
      title: 'Accept order',
      subtitle: 'A mall customer placed an order',
      accept: 'Accept & print',
      decline: 'Decline',
      viewAll: 'Open order list',
      receiver: 'Receiver',
      phone: 'Phone',
      address: 'Address',
      items: 'Items',
      later: 'Later',
    },
    my: {
      badge: 'အော်ဒါအသစ်',
      title: 'လက်ခံပေးပါ',
      subtitle: 'ဖောက်သည်မှ အော်ဒါတင်ထားပါသည်',
      accept: 'လက်ခံပြီး ပရင့်ထုတ်',
      decline: 'ငြင်းပယ်',
      viewAll: 'အော်ဒါစာရင်းသို့',
      receiver: 'လက်ခံသူ',
      phone: 'ဖုန်း',
      address: 'လိပ်စာ',
      items: 'ပစ္စည်းများ',
      later: 'နောက်မှ',
    },
  }[language];

  const handleAccept = async () => {
    if (isProcessing || orderData.status !== '待确认') return;
    setIsProcessing(true);
    try {
      const ok = await packageService.updatePackageStatus(String(orderData.id), '打包中');
      if (!ok) throw new Error('update failed');
      try {
        await printMerchantReceipt(orderData, language, productPriceMap);
      } catch (printErr) {
        LoggerService.warn('打印小票失败', printErr);
      }
      onAccepted(String(orderData.id));
    } catch (err) {
      LoggerService.error('接单失败', err);
      window.alert(language === 'zh' ? '接单失败，请重试' : 'Accept failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (isProcessing) return;
    const desc = String(orderData.description || '');
    let refundAmount = 0;
    if (isMemberBalanceOrder(desc)) {
      const itemPayMatch = desc.match(
        /\[(?:商品费用 \(仅余额支付\)|Item Cost \(Balance Only\)|ကုန်ပစ္စည်းဖိုး \(လက်ကျန်ငွေဖြင့်သာ\)|余额支付|Balance Payment|လက်ကျန်ငွေဖြင့် ပေးချေခြင်း): (.*?) MMK\]/,
      );
      if (itemPayMatch?.[1]) refundAmount += parseFloat(itemPayMatch[1].replace(/,/g, ''));
      if (orderData.payment_method === 'balance') {
        refundAmount += parseFloat(String(orderData.price || '').replace(/[^0-9.]/g, '') || '0');
      }
    }
    const msg =
      language === 'zh'
        ? `确定拒绝该订单？${refundAmount > 0 ? `\n将退还余额 ${refundAmount.toLocaleString()} MMK` : ''}`
        : language === 'en'
          ? `Decline this order?${refundAmount > 0 ? `\nRefund: ${refundAmount.toLocaleString()} MMK` : ''}`
          : `ဤအော်ဒါကို ငြင်းပယ်မလား？`;
    if (!window.confirm(msg)) return;

    setIsProcessing(true);
    try {
      const ok = await packageService.updatePackageStatus(String(orderData.id), '已取消');
      if (!ok) throw new Error('cancel failed');

      if (refundAmount > 0 && orderData.customer_id) {
        const { data: userData } = await supabase
          .from('users')
          .select('balance')
          .eq('id', orderData.customer_id)
          .single();
        if (userData) {
          await supabase
            .from('users')
            .update({
              balance: (userData.balance || 0) + refundAmount,
              updated_at: new Date().toISOString(),
            })
            .eq('id', orderData.customer_id);
        }
      }
      onDeclined(String(orderData.id));
    } catch (err) {
      LoggerService.error('拒单失败', err);
      window.alert(language === 'zh' ? '操作失败' : 'Failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="order-alert-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-alert-title"
      onClick={onClose}
    >
      <div className="order-alert-panel" onClick={(e) => e.stopPropagation()}>
        <div className="order-alert-header">
          <div>
            <span className="order-alert-badge">🔔 {t.badge}</span>
            <h2 id="order-alert-title" className="order-alert-title">
              {t.title}
            </h2>
            <p className="order-alert-subtitle">{t.subtitle}</p>
          </div>
          <button
            type="button"
            className="order-alert-close"
            aria-label={t.later}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {orders.length > 1 ? (
          <div className="order-alert-tabs" role="tablist">
            {orders.map((o, idx) => (
              <button
                key={o.id}
                type="button"
                role="tab"
                aria-selected={idx === selectedIndex}
                className={`order-alert-tab${idx === selectedIndex ? ' order-alert-tab--active' : ''}`}
                onClick={() => setSelectedIndex(idx)}
              >
                #{String(o.id).slice(-6)}
              </button>
            ))}
          </div>
        ) : null}

        <div className="order-alert-body">
          <div className="order-alert-row">
            <span className="order-alert-label">ID</span>
            <span className="order-alert-value">{String(orderData.id)}</span>
          </div>
          <div className="order-alert-row">
            <span className="order-alert-label">{t.receiver}</span>
            <span className="order-alert-value">
              {String(orderData.receiver_name || '-')}
            </span>
          </div>
          <div className="order-alert-row">
            <span className="order-alert-label">{t.phone}</span>
            <span className="order-alert-value">
              {String(orderData.receiver_phone || '-')}
            </span>
          </div>
          <div className="order-alert-row">
            <span className="order-alert-label">{t.address}</span>
            <span className="order-alert-value">
              {String(orderData.receiver_address || '-')}
            </span>
          </div>
          {items.length > 0 ? (
            <div className="order-alert-items">
              <div className="order-alert-items-title">{t.items}</div>
              {items.map((item) => (
                <div key={`${item.label}-${item.qty}`} className="order-alert-item-line">
                  <span>
                    {item.label} ×{item.qty}
                  </span>
                  <span>
                    {item.price != null ? `${item.price.toLocaleString()} MMK` : '-'}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="order-alert-actions">
          <button
            type="button"
            className="order-alert-btn order-alert-btn--accept"
            disabled={isProcessing}
            onClick={handleAccept}
          >
            {isProcessing ? '…' : t.accept}
          </button>
          <button
            type="button"
            className="order-alert-btn order-alert-btn--decline"
            disabled={isProcessing}
            onClick={handleDecline}
          >
            {t.decline}
          </button>
          <button
            type="button"
            className="order-alert-btn order-alert-btn--list"
            onClick={() => {
              onClose();
              navigate('/orders?status=待确认');
            }}
          >
            {t.viewAll}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderAlertModal;
