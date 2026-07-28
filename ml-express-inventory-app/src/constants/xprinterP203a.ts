/** Xprinter P201A / P203A：203 DPI，58mm 间隙纸标签机，推荐 TSPL + 蓝牙 */
export const XPRINTER_P203A = {
  modelId: 'xprinter_p203a' as const,
  dpi: 203,
  defaultWidthMm: 58,
  defaultHeightMm: 40,
  defaultGapMm: 2,
  defaultProtocol: 'tspl' as const,
};

export type PrintLabelSheetKind = 'barcode' | 'inbound' | 'pack' | 'express';
