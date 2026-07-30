import {
  RECEIPT_PAPER_PRESETS,
  type ReceiptPaperWidthMm,
} from '../constants/receiptPaper';
import { computeReceiptTotals, type MerchantReceiptData } from './merchantReceiptTemplate';

const ESC = 0x1b;
const GS = 0x1d;
const FS = 0x1c;
const LF = 0x0a;

function utf8Bytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function wrapText(text: string, maxChars: number): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [''];
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
    bytes.push(...utf8Bytes(line));
    bytes.push(LF);
  }
}

function appendSeparator(bytes: number[], maxChars: number): void {
  bytes.push(...utf8Bytes('-'.repeat(Math.max(8, Math.min(maxChars, 48)))));
  bytes.push(LF);
}

function appendKeyValue(
  bytes: number[],
  label: string,
  value: string,
  maxChars: number,
): void {
  const content = `${label}: ${value}`.trim();
  appendLine(bytes, content, maxChars);
}

/** 常见 XPrinter / ESC-POS QR（Model 2） */
function appendQrCode(bytes: number[], data: string): void {
  const payload = utf8Bytes(data);
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
  const { totalFee, paymentText } = computeReceiptTotals(data);
  const createdLabel = new Date(data.createdAt).toLocaleString();
  const bytes: number[] = [];

  bytes.push(ESC, 0x40);
  bytes.push(FS, 0x26);

  bytes.push(ESC, 0x61, 0x01);
  bytes.push(ESC, 0x45, 0x01);
  appendLine(bytes, 'MARKET LINK EXPRESS', maxChars);
  bytes.push(ESC, 0x45, 0x00);
  appendLine(bytes, '*** Merchant Copy ***', maxChars);

  if (data.isSample) {
    appendLine(bytes, '[ Sample / Test ]', maxChars);
  }

  bytes.push(ESC, 0x45, 0x01);
  appendLine(bytes, `#${data.orderId.slice(-5)}`, maxChars);
  bytes.push(ESC, 0x45, 0x00);
  appendSeparator(bytes, maxChars);

  bytes.push(ESC, 0x61, 0x00);
  appendKeyValue(bytes, 'Time', createdLabel, maxChars);
  appendKeyValue(bytes, 'Order', data.orderId, maxChars);
  appendSeparator(bytes, maxChars);

  appendKeyValue(bytes, 'Store', data.senderName || '-', maxChars);
  appendKeyValue(bytes, 'Tel', data.senderPhone || '-', maxChars);
  appendSeparator(bytes, maxChars);

  appendKeyValue(bytes, 'To', data.receiverName || '-', maxChars);
  appendKeyValue(bytes, 'Tel', data.receiverPhone || '-', maxChars);
  appendLine(bytes, `Addr: ${data.receiverAddress || '-'}`, maxChars);
  appendSeparator(bytes, maxChars);

  appendKeyValue(bytes, 'Pay', paymentText, maxChars);
  for (const item of data.items) {
    const priceText = item.price ? `${item.price.toLocaleString()} MMK` : '-';
    appendLine(bytes, `${item.label} x${item.qty}`, maxChars);
    appendLine(bytes, `  ${priceText}`, maxChars);
  }
  appendKeyValue(bytes, 'Delivery', `${data.deliveryFee.toLocaleString()} MMK`, maxChars);
  bytes.push(ESC, 0x45, 0x01);
  appendKeyValue(bytes, 'TOTAL', `${totalFee.toLocaleString()} MMK`, maxChars);
  bytes.push(ESC, 0x45, 0x00);

  if (data.notes?.trim()) {
    appendSeparator(bytes, maxChars);
    appendLine(bytes, `Note: ${data.notes.trim()}`, maxChars);
  }

  appendSeparator(bytes, maxChars);
  bytes.push(ESC, 0x61, 0x01);
  appendQrCode(bytes, data.orderId);
  appendLine(bytes, 'Scan for Pickup', maxChars);
  appendLine(bytes, data.orderId, maxChars);
  appendLine(bytes, 'Thank you!', maxChars);

  bytes.push(LF, LF, LF);
  bytes.push(GS, 0x56, 0x00);

  return new Uint8Array(bytes);
}
