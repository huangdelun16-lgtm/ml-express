/** 相机识别的条码类型（快递单 Code128、QR、EAN 等） */
export const BARCODE_SCAN_TYPES = [
  'qr',
  'code128',
  'code39',
  'codabar',
  'ean13',
  'ean8',
  'pdf417',
  'datamatrix',
] as const;

export const DEFAULT_SCAN_COOLDOWN_MS = 1200;
