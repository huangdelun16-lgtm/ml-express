import {
  DEFAULT_RECEIPT_PAPER_WIDTH,
  isReceiptPaperWidthMm,
  RECEIPT_PAPER_SETTINGS_KEY,
  type ReceiptPaperWidthMm,
} from '../constants/receiptPaper';

export function loadReceiptPaperWidth(): ReceiptPaperWidthMm {
  try {
    const raw = localStorage.getItem(RECEIPT_PAPER_SETTINGS_KEY);
    if (raw == null) return DEFAULT_RECEIPT_PAPER_WIDTH;
    const parsed = Number(raw);
    if (isReceiptPaperWidthMm(parsed)) return parsed;
  } catch {
    /* ignore */
  }
  return DEFAULT_RECEIPT_PAPER_WIDTH;
}

export function saveReceiptPaperWidth(widthMm: ReceiptPaperWidthMm): void {
  localStorage.setItem(RECEIPT_PAPER_SETTINGS_KEY, String(widthMm));
}
