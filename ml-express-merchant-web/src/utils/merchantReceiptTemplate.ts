import {
  RECEIPT_PAPER_PRESETS,
  type ReceiptPaperWidthMm,
} from '../constants/receiptPaper';
import { buildReceiptItemDisplays } from './receiptItemFormat';
import { itemLabelForEscPos, paymentTextForEscPos } from './escposText';

export type MerchantReceiptItem = {
  label: string;
  qty: number;
  unitPrice?: number;
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

export function createSampleReceiptData(input: {
  storeName?: string;
  storePhone?: string;
}): MerchantReceiptData {
  const now = new Date().toISOString();
  return {
    orderId: `SAMPLE-${Date.now().toString(36).toUpperCase()}`,
    createdAt: now,
    senderName: input.storeName?.trim() || 'Sample Store',
    senderPhone: input.storePhone?.trim() || '09-123-456-789',
    receiverName: 'Customer',
    receiverPhone: '09-987-654-321',
    receiverAddress: 'Sample Address 123',
    paymentMethod: 'balance',
    items: [
      { label: 'Photo frame nail', qty: 1, unitPrice: 5000, price: 5000 },
      { label: 'frame corner brace', qty: 3, unitPrice: 200, price: 600 },
    ],
    deliveryFee: 2300,
    notes: 'Sample receipt',
    isSample: true,
  };
}

export function buildMerchantReceiptHtml(
  data: MerchantReceiptData,
  paperWidthMm: ReceiptPaperWidthMm,
  qrDataUrl: string,
): string {
  const preset = RECEIPT_PAPER_PRESETS[paperWidthMm];
  const { totalFee } = computeReceiptTotals(data);
  const paymentText = paymentTextForEscPos(data.paymentMethod);
  const displays = buildReceiptItemDisplays(data.items, itemLabelForEscPos);
  const createdLabel = new Date(data.createdAt).toLocaleString();

  const itemRows = displays
    .map(
      (d) => `
      <div class="item-row">
        <span>${d.lineText}</span>
        <span class="amount${d.isSummary ? ' summary' : ''}">${d.amountText === '-' ? '—' : d.amountText}</span>
      </div>`,
    )
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8" />
    <style>
      @page { size: ${paperWidthMm}mm auto; margin: 4mm; }
      body { margin: 0; font-family: "Courier New", monospace; color: #111; }
      .ticket { width: ${preset.previewWidth}px; max-width: 100%; margin: 0 auto; padding: 8px; font-size: 12px; line-height: 1.35; }
      .center { text-align: center; }
      .brand { font-size: 16px; font-weight: 900; }
      .order-no { font-size: 20px; font-weight: 900; margin: 8px 0; }
      .dash { border-top: 1px dashed #999; margin: 8px 0; }
      .row { display: flex; justify-content: space-between; gap: 6px; margin: 3px 0; }
      .item-row { display: flex; justify-content: space-between; gap: 6px; margin: 4px 0; }
      .amount { font-weight: 700; text-align: right; }
      .amount.summary { font-weight: 900; }
      .total { border-top: 2px solid #000; margin-top: 8px; padding-top: 6px; font-weight: 900; font-size: 14px; }
      .qr { text-align: center; margin-top: 12px; }
      .qr img { width: 120px; height: 120px; }
      .sample { color: #b45309; font-weight: 800; text-align: center; font-size: 11px; }
    </style></head><body>
    <div class="ticket">
      ${data.isSample ? '<div class="sample">[ Sample / Test ]</div>' : ''}
      <div class="center brand">MARKET LINK EXPRESS</div>
      <div class="center">*** Merchant Copy ***</div>
      <div class="center order-no">#${data.orderId.slice(-5)}</div>
      <div class="dash"></div>
      <div class="row"><span>Time</span><span>${createdLabel}</span></div>
      <div class="row"><span>Order</span><span>${data.orderId}</span></div>
      <div class="dash"></div>
      <div class="row"><span>Store</span><span>${data.senderName}</span></div>
      <div class="row"><span>Tel</span><span>${data.senderPhone}</span></div>
      <div class="dash"></div>
      <div class="row"><span>To</span><span>${data.receiverName}</span></div>
      <div class="row"><span>Tel</span><span>${data.receiverPhone}</span></div>
      <div class="row"><span>Addr</span><span>${data.receiverAddress}</span></div>
      <div class="dash"></div>
      <div class="row"><span>Pay</span><span>${paymentText}</span></div>
      ${itemRows}
      <div class="row"><span>Delivery</span><span>${data.deliveryFee.toLocaleString()} MMK</span></div>
      <div class="row total"><span>TOTAL</span><span>${totalFee.toLocaleString()} MMK</span></div>
      <div class="qr"><img src="${qrDataUrl}" alt="QR" /><div>Scan for Pickup</div></div>
    </div></body></html>`;
}
