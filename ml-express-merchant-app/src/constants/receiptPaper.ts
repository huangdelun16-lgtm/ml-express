export const RECEIPT_PAPER_WIDTH_OPTIONS = [57, 58, 76, 80, 110] as const;

export type ReceiptPaperWidthMm = (typeof RECEIPT_PAPER_WIDTH_OPTIONS)[number];

export type ReceiptPaperPreset = {
  widthMm: ReceiptPaperWidthMm;
  charsPerLine: number;
  previewWidth: number;
  labelZh: string;
  labelEn: string;
  /** 蓝牙 / Wi-Fi 热敏常见 */
  tags: ('ble' | 'wifi' | 'wide')[];
};

export const RECEIPT_PAPER_PRESETS: Record<ReceiptPaperWidthMm, ReceiptPaperPreset> = {
  57: {
    widthMm: 57,
    charsPerLine: 31,
    previewWidth: 215,
    labelZh: '57mm 小票纸',
    labelEn: '57mm receipt',
    tags: ['ble'],
  },
  58: {
    widthMm: 58,
    charsPerLine: 32,
    previewWidth: 220,
    labelZh: '58mm 小票纸',
    labelEn: '58mm receipt',
    tags: ['ble'],
  },
  76: {
    widthMm: 76,
    charsPerLine: 42,
    previewWidth: 280,
    labelZh: '76mm 中宽纸',
    labelEn: '76mm receipt',
    tags: ['ble', 'wifi'],
  },
  80: {
    widthMm: 80,
    charsPerLine: 48,
    previewWidth: 300,
    labelZh: '80mm 小票纸',
    labelEn: '80mm receipt',
    tags: ['ble', 'wifi'],
  },
  110: {
    widthMm: 110,
    charsPerLine: 64,
    previewWidth: 380,
    labelZh: '110mm 宽幅纸',
    labelEn: '110mm wide',
    tags: ['wifi', 'wide'],
  },
};

export const DEFAULT_RECEIPT_PAPER_WIDTH: ReceiptPaperWidthMm = 58;

export const RECEIPT_PAPER_SETTINGS_KEY = 'merchant_receipt_paper_width';

export function isReceiptPaperWidthMm(value: unknown): value is ReceiptPaperWidthMm {
  return (
    typeof value === 'number' &&
    (RECEIPT_PAPER_WIDTH_OPTIONS as readonly number[]).includes(value)
  );
}

export function getReceiptPaperLabel(
  widthMm: ReceiptPaperWidthMm,
  language: string,
): string {
  const preset = RECEIPT_PAPER_PRESETS[widthMm];
  return language === 'en' || language === 'my' ? preset.labelEn : preset.labelZh;
}
