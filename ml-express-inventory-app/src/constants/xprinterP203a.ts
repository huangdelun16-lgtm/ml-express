/** Xprinter P203A：203 DPI，58mm 间隙纸标签机，推荐 TSPL 标签模式 + 蓝牙 SPP */
export const XPRINTER_P203A = {
  modelId: 'xprinter_p203a' as const,
  dpi: 203,
  defaultWidthMm: 58,
  defaultHeightMm: 40,
  defaultGapMm: 2,
  /** 58mm @ 203dpi 可打印宽度（dots） */
  widthDots: 464,
  defaultProtocol: 'tspl' as const,
  defaultConnectionMode: 'bluetooth' as const,
};

export type PrinterModelId = typeof XPRINTER_P203A.modelId | 'generic';
export type LabelPrintProtocol = 'tspl' | 'escpos';
