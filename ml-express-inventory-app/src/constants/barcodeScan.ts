/** 相机识别的条码类型（快递单 Code128、QR、EAN 等） */
export const BARCODE_SCAN_TYPES = [
  'code128',
  'qr',
  'code39',
  'codabar',
  'ean13',
  'ean8',
  'pdf417',
  'datamatrix',
] as const;

/** 扫 app 自打 Code128 标签：减少无关格式干扰，提升识别率 */
export const LABEL_BARCODE_SCAN_TYPES = ['code128', 'qr'] as const;

/** 打印标签：单模块最小宽度（dots），低于此值手机相机很难识别 */
export const MIN_PRINT_BARCODE_NARROW = 2;

export const DEFAULT_SCAN_COOLDOWN_MS = 600;
