export type MerchantReceiptItem = {
  label: string;
  qty: number;
  price?: number;
};

export type MerchantReceiptData = {
  orderId: string;
  createdAt: string;
  senderName: string;
  senderPhone: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  paymentMethod: 'cash' | 'balance' | string;
  items: MerchantReceiptItem[];
  deliveryFee: number;
  itemTotal?: number;
  notes?: string;
  isSample?: boolean;
};

export function computeReceiptTotals(data: MerchantReceiptData): {
  itemTotal: number;
  totalFee: number;
  paymentText: string;
} {
  const computedItemTotal = data.items.reduce((sum, item) => sum + (item.price || 0), 0);
  const itemTotal = data.itemTotal != null && data.itemTotal > 0 ? data.itemTotal : computedItemTotal;
  const totalFee = data.deliveryFee + itemTotal;
  const paymentText =
    data.paymentMethod === 'cash'
      ? '现金支付'
      : data.paymentMethod === 'balance'
        ? '余额支付'
        : String(data.paymentMethod || '—');
  return { itemTotal, totalFee, paymentText };
}

export function buildMerchantReceiptHtml(data: MerchantReceiptData): string {
  const { itemTotal, totalFee, paymentText } = computeReceiptTotals(data);
  const qrUrl = data.orderId
    ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(data.orderId)}`
    : '';
  const createdLabel = data.createdAt
    ? new Date(data.createdAt).toLocaleString()
    : new Date().toLocaleString();

  return `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; padding: 0; font-family: Arial, sans-serif; color: #111827; }
            .ticket { width: 100%; max-width: 420px; margin: 0 auto; padding: 8px; }
            .title { text-align: center; font-size: 22px; font-weight: 900; margin-bottom: 4px; }
            .subtitle { text-align: center; font-size: 14px; color: #374151; margin-bottom: 8px; }
            .sample { text-align: center; font-size: 12px; color: #b45309; font-weight: 700; margin-bottom: 6px; }
            .section { margin-top: 8px; padding-top: 8px; border-top: 1px dashed #9ca3af; }
            .row { display: flex; justify-content: space-between; align-items: flex-start; font-size: 14px; margin: 4px 0; gap: 8px; }
            .label { color: #4b5563; flex-shrink: 0; }
            .value { font-weight: 700; text-align: right; word-break: break-all; }
            .items { margin-top: 6px; }
            .item { display: flex; justify-content: space-between; font-size: 14px; margin: 6px 0; gap: 8px; }
            .total { font-size: 18px; font-weight: 900; border-top: 2px solid #000; padding-top: 8px; margin-top: 8px; }
            .note-box { background: #f3f4f6; padding: 8px; border-radius: 4px; margin-top: 8px; border: 1px solid #d1d5db; }
            .note-label { font-size: 12px; font-weight: 700; color: #1f2937; margin-bottom: 4px; display: block; }
            .note-text { font-size: 14px; color: #dc2626; font-weight: 900; }
            .qr { display: flex; flex-direction: column; align-items: center; margin-top: 12px; }
            .qr img { width: 140px; height: 140px; }
            .qr-code { font-size: 12px; font-weight: 700; margin-top: 4px; }
            .footer-msg { text-align: center; font-size: 12px; color: #6b7280; margin-top: 16px; border-top: 1px solid #eee; padding-top: 8px; }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="title">MARKET LINK EXPRESS</div>
            <div class="subtitle">*** 商家存根 / Merchant Copy ***</div>
            ${data.isSample ? '<div class="sample">[ 测试小票 · 仅供预览 ]</div>' : ''}
            <div style="text-align: center; font-size: 24px; font-weight: 900; margin: 10px 0;">#${data.orderId.slice(-5)}</div>

            <div class="section">
              <div class="row"><div class="label">下单时间</div><div class="value">${createdLabel}</div></div>
              <div class="row"><div class="label">订单编号</div><div class="value">${data.orderId}</div></div>
            </div>

            <div class="section">
              <div class="row"><div class="label">商家</div><div class="value">${data.senderName || '-'}</div></div>
              <div class="row"><div class="label">电话</div><div class="value">${data.senderPhone || '-'}</div></div>
            </div>

            <div class="section">
              <div class="row"><div class="label">收件人</div><div class="value">${data.receiverName || '-'}</div></div>
              <div class="row"><div class="label">电话</div><div class="value">${data.receiverPhone || '-'}</div></div>
              <div class="row"><div class="label">地址</div><div class="value">${data.receiverAddress || '-'}</div></div>
            </div>

            <div class="section">
              <div class="row"><div class="label">支付方式</div><div class="value">${paymentText}</div></div>
              <div class="items">
                ${(data.items.length === 0)
                  ? '<div class="item"><div class="label">商品</div><div class="value">-</div></div>'
                  : data.items
                      .map(
                        (item) => `
                      <div class="item">
                        <div>${item.label} x${item.qty}</div>
                        <div class="value">${item.price ? `${item.price.toLocaleString()} MMK` : '-'}</div>
                      </div>
                    `,
                      )
                      .join('')}
              </div>
              <div class="row"><div class="label">跑腿费</div><div class="value">${data.deliveryFee.toLocaleString()} MMK</div></div>
              <div class="row total"><div class="label">合计金额</div><div class="value">${totalFee.toLocaleString()} MMK</div></div>
            </div>

            ${data.notes ? `
              <div class="note-box">
                <span class="note-label">备注:</span>
                <div class="note-text">${data.notes}</div>
              </div>
            ` : ''}

            ${qrUrl ? `
              <div class="qr">
                <img src="${qrUrl}" />
                <div class="qr-code">扫描取件 / Scan to Pickup</div>
              </div>
            ` : ''}

            <div class="footer-msg">感谢您的配合，祝生意兴隆！</div>
          </div>
        </body>
      </html>
    `;
}

export function createSampleReceiptData(input: {
  storeName?: string;
  storePhone?: string;
}): MerchantReceiptData {
  const now = new Date().toISOString();
  return {
    orderId: `SAMPLE-${Date.now().toString(36).toUpperCase()}`,
    createdAt: now,
    senderName: input.storeName?.trim() || '示例商家店铺',
    senderPhone: input.storePhone?.trim() || '09-123-456-789',
    receiverName: '张三',
    receiverPhone: '09-987-654-321',
    receiverAddress: '仰光 · Kamayut · 示例路 123 号',
    paymentMethod: 'balance',
    items: [
      { label: '示例商品 A', qty: 1, price: 8500 },
      { label: '示例商品 B', qty: 2, price: 12000 },
    ],
    deliveryFee: 2500,
    notes: '少辣 · 尽快送达',
    isSample: true,
  };
}
