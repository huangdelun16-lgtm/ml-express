import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  merchantService,
  packageService,
  supabase,
} from '../../services/supabase';
import LoggerService from '../../services/LoggerService';
import type { MerchantPendingOrder } from '../../contexts/MerchantOrderContext';
import {
  buildPackingRows,
  buildProductNamePriceMap,
} from '../../utils/parseOrderPackingItems';
import { printMerchantReceipt } from '../../utils/printMerchantReceipt';
import './OrderAlertModal.css';
import { feedbackService } from '../../services/FeedbackService';
import { packingAcceptFields } from '../../services/_shared/packingCountdown';

type Lang = 'zh' | 'en' | 'my';

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
      setProductPriceMap(buildProductNamePriceMap(products));
    };
    load();
    return () => {
      active = false;
    };
  }, [orderData?.delivery_store_id]);

  const packing = useMemo(
    () =>
      buildPackingRows(String(orderData?.description || ''), productPriceMap),
    [orderData?.description, productPriceMap],
  );
  const items = packing.rows;

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
    const accepted = orderData;
    try {
      const packingFields = packingAcceptFields();
      const ok = await packageService.updatePackageStatus(
        String(accepted.id),
        packingFields.status,
        { packing_started_at: packingFields.packing_started_at },
      );
      if (!ok) throw new Error('update failed');

      let priceMap = productPriceMap;
      if (!Object.keys(priceMap).length && accepted.delivery_store_id) {
        try {
          const products = await merchantService.getStoreProducts(
            String(accepted.delivery_store_id),
          );
          priceMap = buildProductNamePriceMap(products);
        } catch {
          /* print with empty map; item names still appear */
        }
      }

      try {
        await printMerchantReceipt(
          {
            id: String(accepted.id),
            created_at: String(accepted.created_at || accepted.create_time || ''),
            create_time: accepted.create_time ? String(accepted.create_time) : undefined,
            description: accepted.description ? String(accepted.description) : undefined,
            price: accepted.price != null ? String(accepted.price) : undefined,
            payment_method: accepted.payment_method
              ? String(accepted.payment_method)
              : undefined,
            sender_name: accepted.sender_name ? String(accepted.sender_name) : undefined,
            sender_phone: accepted.sender_phone ? String(accepted.sender_phone) : undefined,
            receiver_name: accepted.receiver_name ? String(accepted.receiver_name) : undefined,
            receiver_phone: accepted.receiver_phone
              ? String(accepted.receiver_phone)
              : undefined,
            receiver_address: accepted.receiver_address
              ? String(accepted.receiver_address)
              : undefined,
            notes: accepted.notes ? String(accepted.notes) : undefined,
            cod_amount: Number(accepted.cod_amount || 0),
          },
          priceMap,
          language,
        );
      } catch (printErr) {
        LoggerService.warn('接单后打印打包清单失败', printErr);
        feedbackService.notify(
          language === 'zh'
            ? '已接单，但打包清单未打出。请到「我的账号 → 打印机」检查后补打。'
            : language === 'en'
              ? 'Accepted, but packing list did not print. Check Account → Printer.'
              : 'လက်ခံပြီးပါပြီ။ စာရင်း ပရင့်မထွက်ပါ။',
        );
      }
      onAccepted(String(accepted.id));
    } catch (err) {
      LoggerService.error('接单失败', err);
      feedbackService.notify(language === 'zh' ? '接单失败，请重试' : 'Accept failed');
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
      if (refundAmount > 0) {
        const now = new Date().toISOString();
        const { error: refundMarkError } = await supabase
          .from('packages')
          .update({
            refund_status: 'refunded',
            refund_amount: refundAmount,
            refund_note: '商家拒单退余额',
            refund_at: now,
            refund_by: 'merchant',
            refund_by_name: orderData.delivery_store_name || orderData.sender_name || '',
            updated_at: now,
          })
          .eq('id', orderData.id);
        if (refundMarkError) {
          LoggerService.warn('拒单已完成，退款跟单字段未写入', refundMarkError);
        }
      }
      onDeclined(String(orderData.id));
    } catch (err) {
      LoggerService.error('拒单失败', err);
      feedbackService.notify(language === 'zh' ? '操作失败' : 'Failed');
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
                <div
                  key={`${item.name}-${item.qty}`}
                  className="order-alert-item-line"
                >
                  <span>
                    {item.name} ×{item.qty}
                  </span>
                  <span>
                    {item.lineTotal != null
                      ? `${item.lineTotal.toLocaleString()} MMK`
                      : item.unitPrice != null
                        ? `${(item.unitPrice * item.qty).toLocaleString()} MMK`
                        : '-'}
                  </span>
                </div>
              ))}
              {packing.summaryTotal != null && items.length > 0 ? (
                <div className="order-alert-item-line order-alert-item-line--total">
                  <span>
                    {language === 'zh'
                      ? '商品合计'
                      : language === 'en'
                        ? 'Items total'
                        : 'စုစုပေါင်း'}
                  </span>
                  <span>{packing.summaryTotal.toLocaleString()} MMK</span>
                </div>
              ) : null}
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
