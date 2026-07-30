/** 热敏小票机 ESC/POS 通常仅稳定支持 ASCII，非拉丁字符会乱码 */

export function toEscPosSafeText(text: string): string {
  const normalized = text.normalize('NFKC');
  const ascii = normalized.replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim();
  return ascii || '-';
}

export function paymentTextForEscPos(paymentMethod: string | undefined): string {
  if (paymentMethod === 'cash') return 'Cash';
  if (paymentMethod === 'balance') return 'Balance';
  if (paymentMethod === 'qr') return 'QR Pay';
  return toEscPosSafeText(String(paymentMethod || 'Cash'));
}

export function itemLabelForEscPos(label: string): string {
  const trimmed = label.trim();
  if (trimmed === '代收款 COD' || trimmed.includes('代收款')) return 'COD Collect';
  if (trimmed === '商品费用') return 'Item Cost';
  return toEscPosSafeText(trimmed);
}

export const ESCPOS_RECEIPT_LABELS = {
  merchantCopy: '*** Merchant Copy ***',
  time: 'Time',
  order: 'Order',
  store: 'Store',
  tel: 'Tel',
  to: 'To',
  addr: 'Addr',
  pay: 'Pay',
  delivery: 'Delivery',
  total: 'TOTAL',
  note: 'Note',
  qrHint: 'Scan for Pickup',
  footer: 'Thank you!',
  sample: '[ Sample / Test ]',
} as const;
