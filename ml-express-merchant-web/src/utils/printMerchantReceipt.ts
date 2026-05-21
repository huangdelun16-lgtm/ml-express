import QRCode from 'qrcode';
import LoggerService from '../services/LoggerService';
import {
  computePackageOrderTotalMmk,
  parsePackageLineItems,
} from './parsePackageLineItems';
import type { MerchantLanguage } from '../constants/merchantOrderStatus';

export async function printMerchantReceipt(
  orderData: {
    id: string;
    description?: string | null;
    price?: string | null;
    payment_method?: string | null;
    sender_name?: string | null;
    sender_phone?: string | null;
    sender_address?: string | null;
    receiver_name?: string | null;
    receiver_phone?: string | null;
    receiver_address?: string | null;
  },
  productPriceMap: Record<string, number>,
  language: MerchantLanguage,
): Promise<void> {
  if (!orderData?.id) return;

  try {
    const qrDataUrl = await QRCode.toDataURL(orderData.id, { margin: 1, width: 180 });
    const parsedItems = parsePackageLineItems(orderData.description, productPriceMap);
    const totalFee = computePackageOrderTotalMmk(orderData, parsedItems);
    const deliveryFee = parseFloat(orderData.price?.replace(/[^0-9.]/g, '') || '0');
    const paymentText =
      orderData.payment_method === 'cash'
        ? language === 'zh'
          ? '现金支付'
          : 'Cash'
        : language === 'zh'
          ? '余额支付'
          : 'Balance';
    const orderIdShort = `#${orderData.id.slice(-5)}`;

    const html = `
      <html><head><style>
        body { font-family: sans-serif; padding: 20px; color: #111827; width: 300px; margin: 0 auto; line-height: 1.4; }
        .title { text-align: center; font-size: 20px; font-weight: 900; margin-bottom: 5px; }
        .subtitle { text-align: center; font-size: 12px; color: #6b7280; margin-bottom: 15px; }
        .section { border-top: 1px dashed #d1d5db; padding: 10px 0; margin-top: 5px; }
        .row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 12px; }
        .label { color: #6b7280; min-width: 50px; }
        .value { font-weight: 600; text-align: right; flex: 1; margin-left: 10px; }
        .item-row { display: flex; justify-content: space-between; font-size: 12px; margin: 4px 0; }
        .total-row { font-size: 15px; font-weight: 900; border-top: 1px solid #000; margin-top: 10px; padding-top: 8px; }
        .qr-box { text-align: center; margin: 15px 0; }
        .qr-box img { width: 140px; height: 140px; }
        .footer-note { text-align: center; font-size: 10px; color: #9ca3af; margin-top: 20px; font-style: italic; }
      </style></head><body>
        <div class="title">MARKET LINK EXPRESS</div>
        <div class="subtitle">订单号 ${orderIdShort}</div>
        <div class="qr-box"><img src="${qrDataUrl}" /><div style="font-size:11px;font-weight:bold;margin-top:5px;">取件码: ${orderData.id}</div></div>
        <div class="section">
          <div class="row"><span class="label">商家:</span><span class="value">${orderData.sender_name || '-'}</span></div>
          <div class="row"><span class="label">电话:</span><span class="value">${orderData.sender_phone || '-'}</span></div>
          <div class="row"><span class="label">地址:</span><span class="value">${orderData.sender_address || '-'}</span></div>
        </div>
        <div class="section">
          <div class="row"><span class="label">客户:</span><span class="value">${orderData.receiver_name || '-'}</span></div>
          <div class="row"><span class="label">电话:</span><span class="value">${orderData.receiver_phone || '-'}</span></div>
          <div class="row"><span class="label">地址:</span><span class="value">${orderData.receiver_address || '-'}</span></div>
        </div>
        <div class="section">
          <div class="row"><span class="label">支付:</span><span class="value">${paymentText}</span></div>
          ${parsedItems
            .map(
              (item) =>
                `<div class="item-row"><span>• ${item.label} x${item.qty}</span><span>${item.price ? `${item.price.toLocaleString()} MMK` : '-'}</span></div>`,
            )
            .join('')}
          <div class="row"><span class="label">跑腿费:</span><span class="value">${deliveryFee.toLocaleString()} MMK</span></div>
          <div class="row total-row"><span>合计:</span><span>${totalFee.toLocaleString()} MMK</span></div>
        </div>
        <div class="footer-note">请保留此票据用于对账，感谢使用！</div>
      </body></html>`;

    const iframe = document.createElement('iframe');
    iframe.style.cssText =
      'position:fixed;right:0;bottom:0;width:0;height:0;border:none';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 500);
    }
  } catch (error) {
    LoggerService.error('生成小票失败:', error);
  }
}
