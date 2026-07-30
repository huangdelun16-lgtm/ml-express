export type ReceiptPaperWidthMm = 58 | 80;

export type ReceiptPaperPreset = {
  widthMm: ReceiptPaperWidthMm;
  charsPerLine: number;
  previewWidth: number;
  labelZh: string;
  labelEn: string;
};

export const RECEIPT_PAPER_PRESETS: Record<ReceiptPaperWidthMm, ReceiptPaperPreset> = {
  58: {
    widthMm: 58,
    charsPerLine: 32,
    previewWidth: 220,
    labelZh: '58mm 小票纸',
    labelEn: '58mm receipt',
  },
  80: {
    widthMm: 80,
    charsPerLine: 48,
    previewWidth: 300,
    labelZh: '80mm 小票纸',
    labelEn: '80mm receipt',
  },
};

export const DEFAULT_RECEIPT_PAPER_WIDTH: ReceiptPaperWidthMm = 58;

export const RECEIPT_PAPER_SETTINGS_KEY = 'merchant_receipt_paper_width';
