/** Xprinter P201A / P203A：203 DPI，58mm 间隙纸标签机，推荐 TSPL + 蓝牙 */
export const XPRINTER_P203A = {
  modelId: 'xprinter_p203a' as const,
  /** iOS 系统打印对话框中常见显示名 */
  iosDisplayName: 'Xprinter P201A',
  dpi: 203,
  defaultWidthMm: 58,
  defaultHeightMm: 40,
  defaultGapMm: 2,
  /** 58mm @ 203dpi 可打印宽度（dots） */
  widthDots: 464,
  defaultProtocol: 'tspl' as const,
  defaultConnectionMode: 'bluetooth' as const,
};

/** expo-print / AirPrint 页面尺寸用 72 PPI 像素 */
export const IOS_LABEL_PRINT_PPI = 72;

export function labelPagePixels(widthMm: number, heightMm: number): { width: number; height: number } {
  return {
    width: Math.round((widthMm / 25.4) * IOS_LABEL_PRINT_PPI),
    height: Math.round((heightMm / 25.4) * IOS_LABEL_PRINT_PPI),
  };
}

export type PrinterModelId = typeof XPRINTER_P203A.modelId | 'generic';
export type LabelPrintProtocol = 'tspl' | 'escpos';
