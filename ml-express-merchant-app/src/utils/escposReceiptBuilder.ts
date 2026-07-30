import {
  RECEIPT_PAPER_PRESETS,
  type ReceiptPaperWidthMm,
} from '../constants/receiptPaper';
import { computeReceiptTotals, type MerchantReceiptData } from './merchantReceiptTemplate';
import {
  ESCPOS_RECEIPT_LABELS,
  itemLabelForEscPos,
  paymentTextForEscPos,
  toEscPosSafeText,
} from './escposText';

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

function asciiBytes(text: string): Uint8Array {
  const safe = toEscPosSafeText(text);
  const bytes = new Uint8Array(safe.length);
  for (let i = 0; i < safe.length; i += 1) {
    bytes[i] = safe.charCodeAt(i) & 0x7f;
  }
  return bytes;
}

function wrapText(text: string, maxChars: number): string[] {
  const normalized = toEscPosSafeText(text);
  if (!normalized || normalized === '-') return ['-'];
  if (normalized.length <= maxChars) return [normalized];

  const lines: string[] = [];
  let current = '';
  for (const char of normalized) {
    const next = current + char;
    if (next.length > maxChars) {
      if (current) lines.push(current);
      current = char;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function appendLine(bytes: number[], text: string, maxChars: number): void {
  for (const line of wrapText(text, maxChars)) {
    bytes.push(...asciiBytes(line));
    bytes.push(LF);
  }
}

function appendSeparator(bytes: number[], maxChars: number): void {
  bytes.push(...asciiBytes('-'.repeat(Math.max(8, Math.min(maxChars, 48)))));
  bytes.push(LF);
}

function appendKeyValue(
  bytes: number[],
  label: string,
  value: string,
  maxChars: number,
): void {
  appendLine(bytes, `${label}: ${toEscPosSafeText(value)}`, maxChars);
}

function appendQrCode(bytes: number[], data: string): void {
  const payload = asciiBytes(toEscPosSafeText(data));
  const storeLen = payload.length + 3;
  bytes.push(
    GS,
    0x28,
    0x6b,
    storeLen & 0xff,
    (storeLen >> 8) & 0xff,
    0x31,
    0x50,
    0x30,
  );
  bytes.push(...payload);
  bytes.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30);
  bytes.push(LF);
}

export function buildEscPosReceiptBytes(
  data: MerchantReceiptData,
  paperWidthMm: ReceiptPaperWidthMm = 58,
): Uint8Array {
  const preset = RECEIPT_PAPER_PRESETS[paperWidthMm];
  const maxChars = preset.charsPerLine;
  const { totalFee } = computeReceiptTotals(data);
  const paymentText = paymentTextForEscPos(data.paymentMethod);
  const createdLabel = toEscPosSafeText(
    new Date(data.createdAt).toLocaleString('en-GB'),
  );
  const bytes: number[] = [];

  bytes.push(ESC, 0x40);

  bytes.push(ESC, 0x61, 0x01);
  bytes.push(ESC, 0x45, 0x01);
  appendLine(bytes, 'MARKET LINK EXPRESS', maxChars);
  bytes.push(ESC, 0x45, 0x00);
  appendLine(bytes, ESCPOS_RECEIPT_LABELS.merchantCopy, maxChars);

  if (data.isSample) {
    appendLine(bytes, ESCPOS_RECEIPT_LABELS.sample, maxChars);
  }

  bytes.push(ESC, 0x45, 0x01);
  appendLine(bytes, `#${toEscPosSafeText(data.orderId.slice(-5))}`, maxChars);
  bytes.push(ESC, 0x45, 0x00);
  appendSeparator(bytes, maxChars);

  bytes.push(ESC, 0x61, 0x00);
  appendKeyValue(bytes, ESCPOS_RECEIPT_LABELS.time, createdLabel, maxChars);
  appendKeyValue(bytes, ESCPOS_RECEIPT_LABELS.order, data.orderId, maxChars);
  appendSeparator(bytes, maxChars);

  appendKeyValue(bytes, ESCPOS_RECEIPT_LABELS.store, data.senderName, maxChars);
  appendKeyValue(bytes, ESCPOS_RECEIPT_LABELS.tel, data.senderPhone, maxChars);
  appendSeparator(bytes, maxChars);

  appendKeyValue(bytes, ESCPOS_RECEIPT_LABELS.to, data.receiverName, maxChars);
  appendKeyValue(bytes, ESCPOS_RECEIPT_LABELS.tel, data.receiverPhone, maxChars);
  appendLine(
    bytes,
    `${ESCPOS_RECEIPT_LABELS.addr}: ${toEscPosSafeText(data.receiverAddress || '-')}`,
    maxChars,
  );
  appendSeparator(bytes, maxChars);

  appendKeyValue(bytes, ESCPOS_RECEIPT_LABELS.pay, paymentText, maxChars);
  for (const item of data.items) {
    const priceText = item.price ? `${item.price.toLocaleString()} MMK` : '-';
    appendLine(bytes, `${itemLabelForEscPos(item.label)} x${item.qty}`, maxChars);
    appendLine(bytes, `  ${priceText}`, maxChars);
  }
  appendKeyValue(
    bytes,
    ESCPOS_RECEIPT_LABELS.delivery,
    `${data.deliveryFee.toLocaleString()} MMK`,
    maxChars,
  );
  bytes.push(ESC, 0x45, 0x01);
  appendKeyValue(bytes, ESCPOS_RECEIPT_LABELS.total, `${totalFee.toLocaleString()} MMK`, maxChars);
  bytes.push(ESC, 0x45, 0x00);

  if (data.notes?.trim()) {
    appendSeparator(bytes, maxChars);
    appendLine(bytes, `${ESCPOS_RECEIPT_LABELS.note}: ${data.notes.trim()}`, maxChars);
  }

  appendSeparator(bytes, maxChars);
  bytes.push(ESC, 0x61, 0x01);
  appendQrCode(bytes, data.orderId);
  appendLine(bytes, ESCPOS_RECEIPT_LABELS.qrHint, maxChars);
  appendLine(bytes, toEscPosSafeText(data.orderId), maxChars);
  appendLine(bytes, ESCPOS_RECEIPT_LABELS.footer, maxChars);

  bytes.push(LF, LF, LF);
  bytes.push(GS, 0x56, 0x00);

  return new Uint8Array(bytes);
}
