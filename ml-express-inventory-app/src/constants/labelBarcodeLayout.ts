import { XPRINTER_P203A } from './xprinterP203a';
import { mmToDots } from '../utils/labelPrintLayout';
import { getCode128TotalModules } from '../utils/barcodeImage';

export type LabelElementPosition = {
  x: number;
  y: number;
};

export type LabelBarcodeLayoutConfig = {
  version: 1;
  expressNo: LabelElementPosition;
  barcode: LabelElementPosition & { height: number };
  inboundCode: LabelElementPosition;
};

export const LABEL_LAYOUT_STEP_DOTS = 1;
export const TSPL_BARCODE_NARROW = 3;
export const TSPL_TEXT_CHAR_WIDTH_DOTS = 12;
export const TSPL_TEXT_LINE_HEIGHT_DOTS = 24;

export type LabelLayoutAlignH = 'left' | 'center' | 'right';
export type LabelLayoutAlignV = 'top' | 'middle' | 'bottom';

export type LabelLayoutContentSizes = {
  expressNo?: string;
  barcode: string;
  inboundCode?: string;
};

/** 打印预览示例数据，用于默认居中布局估算 */
const DEFAULT_LAYOUT_SAMPLE: LabelLayoutContentSizes = {
  expressNo: '67499191994',
  barcode: 'MDY060400290726',
  inboundCode: 'MDY060400290726',
};

function buildCenteredDefaultLayout(
  content: LabelLayoutContentSizes = DEFAULT_LAYOUT_SAMPLE,
  barcodeHeight = 96,
): LabelBarcodeLayoutConfig {
  return mergeAndCenterLabelLayout(
    {
      version: 1,
      expressNo: { x: 0, y: 0 },
      barcode: { x: 0, y: 0, height: barcodeHeight },
      inboundCode: { x: 0, y: 0 },
    },
    content,
  );
}

export const DEFAULT_LABEL_BARCODE_LAYOUT: LabelBarcodeLayoutConfig = buildCenteredDefaultLayout();

export function labelWidthDots(widthMm = XPRINTER_P203A.defaultWidthMm): number {
  return mmToDots(widthMm);
}

export function labelHeightDots(heightMm = XPRINTER_P203A.defaultHeightMm): number {
  return mmToDots(heightMm);
}

export function dotsToMm(dots: number): number {
  return (dots / XPRINTER_P203A.dpi) * 25.4;
}

export function mmToLayoutDots(mm: number): number {
  return mmToDots(mm);
}

function clampDots(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function clampLabelBarcodeLayout(
  layout: LabelBarcodeLayoutConfig,
  widthMm = XPRINTER_P203A.defaultWidthMm,
  heightMm = XPRINTER_P203A.defaultHeightMm,
): LabelBarcodeLayoutConfig {
  const maxX = labelWidthDots(widthMm) - 8;
  const maxY = labelHeightDots(heightMm) - 8;
  const barcodeHeight = clampDots(layout.barcode.height, 48, 160);

  return {
    version: 1,
    expressNo: {
      x: clampDots(layout.expressNo.x, 0, maxX),
      y: clampDots(layout.expressNo.y, 0, maxY),
    },
    barcode: {
      x: clampDots(layout.barcode.x, 0, maxX),
      y: clampDots(layout.barcode.y, 0, maxY),
      height: barcodeHeight,
    },
    inboundCode: {
      x: clampDots(layout.inboundCode.x, 0, maxX),
      y: clampDots(layout.inboundCode.y, 0, maxY),
    },
  };
}

export function normalizeLabelBarcodeLayout(raw: unknown): LabelBarcodeLayoutConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Partial<LabelBarcodeLayoutConfig>;
  if (value.version !== 1) return null;
  if (!value.expressNo || !value.barcode || !value.inboundCode) return null;
  if (
    typeof value.expressNo.x !== 'number' ||
    typeof value.expressNo.y !== 'number' ||
    typeof value.barcode.x !== 'number' ||
    typeof value.barcode.y !== 'number' ||
    typeof value.barcode.height !== 'number' ||
    typeof value.inboundCode.x !== 'number' ||
    typeof value.inboundCode.y !== 'number'
  ) {
    return null;
  }

  return clampLabelBarcodeLayout({
    version: 1,
    expressNo: { x: value.expressNo.x, y: value.expressNo.y },
    barcode: {
      x: value.barcode.x,
      y: value.barcode.y,
      height: value.barcode.height,
    },
    inboundCode: { x: value.inboundCode.x, y: value.inboundCode.y },
  });
}

export function formatLayoutMm(dots: number): string {
  return `${dotsToMm(dots).toFixed(2)} mm`;
}

export function estimateTextWidthDots(
  text: string,
  charWidth = TSPL_TEXT_CHAR_WIDTH_DOTS,
): number {
  const len = text.trim().length;
  if (len <= 0) return charWidth;
  return len * charWidth;
}

export function estimateCode128WidthDots(
  code: string,
  narrow = TSPL_BARCODE_NARROW,
  maxWidthDots = labelWidthDots(),
): number {
  const trimmed = code.trim();
  if (!trimmed) return Math.min(narrow * 40, maxWidthDots);
  const raw = getCode128TotalModules(trimmed) * narrow;
  return Math.min(raw, Math.max(narrow * 20, maxWidthDots - 16));
}

function effectiveElementWidth(width: number, labelW: number): number {
  return Math.min(width, Math.max(24, labelW - 16));
}

function centerElementXDots(labelW: number, elemW: number): number {
  const width = effectiveElementWidth(elemW, labelW);
  return Math.max(0, Math.round((labelW - width) / 2));
}

export function getEffectiveElementWidthDots(
  layout: LabelBarcodeLayoutConfig,
  target: 'expressNo' | 'barcode' | 'inboundCode',
  content: LabelLayoutContentSizes,
  widthMm = XPRINTER_P203A.defaultWidthMm,
): number {
  const labelW = labelWidthDots(widthMm);
  return effectiveElementWidth(elementSizeDots(layout, target, content).width, labelW);
}

function elementSizeDots(
  layout: LabelBarcodeLayoutConfig,
  target: 'expressNo' | 'barcode' | 'inboundCode',
  content: LabelLayoutContentSizes,
): { width: number; height: number } {
  if (target === 'barcode') {
    return {
      width: estimateCode128WidthDots(content.barcode),
      height: layout.barcode.height,
    };
  }
  const text =
    target === 'expressNo'
      ? content.expressNo ?? ''
      : content.inboundCode ?? content.barcode;
  return {
    width: estimateTextWidthDots(text),
    height: TSPL_TEXT_LINE_HEIGHT_DOTS,
  };
}

export function applyLayoutAlignment(
  layout: LabelBarcodeLayoutConfig,
  target: 'expressNo' | 'barcode' | 'inboundCode',
  alignment: { horizontal?: LabelLayoutAlignH; vertical?: LabelLayoutAlignV },
  content: LabelLayoutContentSizes,
  widthMm = XPRINTER_P203A.defaultWidthMm,
  heightMm = XPRINTER_P203A.defaultHeightMm,
): LabelBarcodeLayoutConfig {
  const labelW = labelWidthDots(widthMm);
  const labelH = labelHeightDots(heightMm);
  const rawSize = elementSizeDots(layout, target, content);
  const width = effectiveElementWidth(rawSize.width, labelW);
  const height = rawSize.height;
  const margin = 4;

  const next: LabelBarcodeLayoutConfig = {
    version: 1,
    expressNo: { ...layout.expressNo },
    barcode: { ...layout.barcode },
    inboundCode: { ...layout.inboundCode },
  };

  if (alignment.horizontal === 'left') {
    next[target].x = 0;
  } else if (alignment.horizontal === 'center') {
    next[target].x = centerElementXDots(labelW, rawSize.width);
  } else if (alignment.horizontal === 'right') {
    next[target].x = Math.max(0, labelW - width - margin);
  }

  if (target === 'barcode') {
    if (alignment.vertical === 'top') {
      next.barcode.y = 0;
    } else if (alignment.vertical === 'middle') {
      next.barcode.y = Math.round((labelH - height) / 2);
    } else if (alignment.vertical === 'bottom') {
      next.barcode.y = Math.max(0, labelH - height - margin);
    }
  } else if (alignment.vertical === 'top') {
    next[target].y = 0;
  } else if (alignment.vertical === 'middle') {
    next[target].y = Math.round((labelH - height) / 2);
  } else if (alignment.vertical === 'bottom') {
    next[target].y = Math.max(0, labelH - height - margin);
  }

  return clampLabelBarcodeLayout(next, widthMm, heightMm);
}

export function centerTextLabelElement(
  layout: LabelBarcodeLayoutConfig,
  target: 'expressNo' | 'barcode' | 'inboundCode',
  content: LabelLayoutContentSizes,
  widthMm = XPRINTER_P203A.defaultWidthMm,
  heightMm = XPRINTER_P203A.defaultHeightMm,
): LabelBarcodeLayoutConfig {
  return applyLayoutAlignment(
    layout,
    target,
    { horizontal: 'center' },
    content,
    widthMm,
    heightMm,
  );
}

/** 三项作为整体在标签内水平+垂直居中（Merge & Center） */
export function mergeAndCenterLabelLayout(
  layout: LabelBarcodeLayoutConfig,
  content: LabelLayoutContentSizes,
  widthMm = XPRINTER_P203A.defaultWidthMm,
  heightMm = XPRINTER_P203A.defaultHeightMm,
): LabelBarcodeLayoutConfig {
  const labelW = labelWidthDots(widthMm);
  const labelH = labelHeightDots(heightMm);
  const gap = 10;
  const expressH = TSPL_TEXT_LINE_HEIGHT_DOTS;
  const inboundH = TSPL_TEXT_LINE_HEIGHT_DOTS;
  const barcodeH = layout.barcode.height;
  const hasExpress = Boolean(content.expressNo?.trim());

  const expressW = estimateTextWidthDots(content.expressNo ?? '');
  const barcodeW = estimateCode128WidthDots(content.barcode, TSPL_BARCODE_NARROW, labelW);
  const inboundW = estimateTextWidthDots(content.inboundCode ?? content.barcode);

  let stackHeight = barcodeH + gap + inboundH;
  if (hasExpress) stackHeight += expressH + gap;
  const startY = Math.max(4, Math.round((labelH - stackHeight) / 2));

  let y = startY;
  const next: LabelBarcodeLayoutConfig = {
    version: 1,
    expressNo: { ...layout.expressNo },
    barcode: { ...layout.barcode },
    inboundCode: { ...layout.inboundCode },
  };

  if (hasExpress) {
    next.expressNo = {
      x: centerElementXDots(labelW, expressW),
      y,
    };
    y += expressH + gap;
  }

  next.barcode = {
    x: centerElementXDots(labelW, barcodeW),
    y,
    height: barcodeH,
  };
  y += barcodeH + gap;

  next.inboundCode = {
    x: centerElementXDots(labelW, inboundW),
    y,
  };

  return clampLabelBarcodeLayout(next, widthMm, heightMm);
}

export function centerAllLabelElements(
  layout: LabelBarcodeLayoutConfig,
  content: LabelLayoutContentSizes,
  widthMm = XPRINTER_P203A.defaultWidthMm,
  heightMm = XPRINTER_P203A.defaultHeightMm,
): LabelBarcodeLayoutConfig {
  let next = layout;
  if (content.expressNo?.trim()) {
    next = centerTextLabelElement(next, 'expressNo', content, widthMm, heightMm);
  }
  next = centerTextLabelElement(next, 'barcode', content, widthMm, heightMm);
  next = centerTextLabelElement(next, 'inboundCode', content, widthMm, heightMm);
  return next;
}

export function buildDefaultCenteredLayout(
  content: LabelLayoutContentSizes,
  widthMm = XPRINTER_P203A.defaultWidthMm,
  heightMm = XPRINTER_P203A.defaultHeightMm,
): LabelBarcodeLayoutConfig {
  return mergeAndCenterLabelLayout(
    {
      version: 1,
      expressNo: { x: 0, y: 0 },
      barcode: { x: 0, y: 0, height: 96 },
      inboundCode: { x: 0, y: 0 },
    },
    content,
    widthMm,
    heightMm,
  );
}

export function setLayoutElementPosition(
  layout: LabelBarcodeLayoutConfig,
  target: 'expressNo' | 'barcode' | 'inboundCode',
  patch: Partial<LabelElementPosition> & { height?: number },
): LabelBarcodeLayoutConfig {
  const next: LabelBarcodeLayoutConfig = {
    version: 1,
    expressNo: { ...layout.expressNo },
    barcode: { ...layout.barcode },
    inboundCode: { ...layout.inboundCode },
  };

  if (patch.x != null) next[target].x = patch.x;
  if (patch.y != null) next[target].y = patch.y;
  if (target === 'barcode' && patch.height != null) {
    next.barcode.height = patch.height;
  }

  return clampLabelBarcodeLayout(next);
}

export function adjustLayoutElement(
  layout: LabelBarcodeLayoutConfig,
  target: 'expressNo' | 'barcode' | 'inboundCode',
  axis: 'x' | 'y' | 'height',
  deltaDots: number,
): LabelBarcodeLayoutConfig {
  const next: LabelBarcodeLayoutConfig = {
    version: 1,
    expressNo: { ...layout.expressNo },
    barcode: { ...layout.barcode },
    inboundCode: { ...layout.inboundCode },
  };
  if (target === 'barcode' && axis === 'height') {
    next.barcode.height += deltaDots;
  } else if (axis === 'x' || axis === 'y') {
    next[target][axis] += deltaDots;
  }
  return clampLabelBarcodeLayout(next);
}
