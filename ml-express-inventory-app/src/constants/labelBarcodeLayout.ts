import { XPRINTER_P203A } from './xprinterP203a';
import { mmToDots } from '../utils/labelPrintLayout';
import { getCode128TotalModules } from '../utils/barcodeImage';

export type LabelElementPosition = {
  x: number;
  y: number;
};

export type LabelSizedElement = LabelElementPosition & {
  widthDots?: number;
  heightDots?: number;
};

export type LabelBarcodeElement = LabelElementPosition & {
  widthDots?: number;
  height: number;
};

export type LabelBarcodeLayoutConfig = {
  version: 1;
  expressNo: LabelSizedElement;
  barcode: LabelBarcodeElement;
  inboundCode: LabelSizedElement;
};

export const LABEL_LAYOUT_STEP_DOTS = 1;
export const LABEL_LAYOUT_MM_STEP = 0.5;
export const LABEL_BARCODE_HEIGHT_MIN = 48;
export const LABEL_BARCODE_HEIGHT_MAX = 160;
export const LABEL_ELEMENT_WIDTH_MM_MIN = 5;
export const LABEL_ELEMENT_WIDTH_MM_MAX = 56;
export const LABEL_ELEMENT_HEIGHT_MM_MIN = 2;
export const LABEL_ELEMENT_HEIGHT_MM_MAX = 18;
export const TSPL_BARCODE_NARROW = 3;
export const TSPL_BARCODE_WIDE = 6;
export const TSPL_TEXT_CHAR_WIDTH_DOTS = 12;
export const TSPL_TEXT_LINE_HEIGHT_DOTS = 24;
export const TSPL_TEXT_MUL_MAX = 10;

export type LabelLayoutAlignH = 'left' | 'center' | 'right';
export type LabelLayoutAlignV = 'top' | 'middle' | 'bottom';

export type LabelLayoutContentSizes = {
  expressNo?: string;
  barcode: string;
  inboundCode?: string;
};

export type ElementDimensions = {
  widthDots: number;
  heightDots: number;
};

export type BarcodePrintMetrics = {
  height: number;
  narrow: number;
  wide: number;
  widthDots: number;
};

type LegacySized = {
  scale?: number;
};

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

function clampWidthDots(value: number, widthMm = XPRINTER_P203A.defaultWidthMm): number {
  const max = Math.min(
    mmToLayoutDots(LABEL_ELEMENT_WIDTH_MM_MAX),
    labelWidthDots(widthMm) - 8,
  );
  return clampDots(value, mmToLayoutDots(LABEL_ELEMENT_WIDTH_MM_MIN), max);
}

function clampHeightDots(value: number): number {
  return clampDots(value, mmToLayoutDots(LABEL_ELEMENT_HEIGHT_MM_MIN), mmToLayoutDots(LABEL_ELEMENT_HEIGHT_MM_MAX));
}

function clampBarcodeHeightDots(value: number): number {
  return clampDots(value, LABEL_BARCODE_HEIGHT_MIN, LABEL_BARCODE_HEIGHT_MAX);
}

export function formatLayoutMm(dots: number): string {
  return `${dotsToMm(dots).toFixed(2)} mm`;
}

export function formatLayoutMmShort(dots: number): string {
  return `${dotsToMm(dots).toFixed(1)} mm`;
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

function defaultTextWidthDots(text: string): number {
  return estimateTextWidthDots(text);
}

function defaultTextHeightDots(): number {
  return TSPL_TEXT_LINE_HEIGHT_DOTS;
}

function defaultBarcodeWidthDots(code: string, widthMm = XPRINTER_P203A.defaultWidthMm): number {
  return estimateCode128WidthDots(code, TSPL_BARCODE_NARROW, labelWidthDots(widthMm));
}

function effectiveElementWidth(width: number, labelW: number): number {
  return Math.min(width, Math.max(24, labelW - 16));
}

function centerElementXDots(labelW: number, elemW: number): number {
  const width = effectiveElementWidth(elemW, labelW);
  return Math.max(0, Math.round((labelW - width) / 2));
}

function textForTarget(
  target: 'expressNo' | 'inboundCode',
  content: LabelLayoutContentSizes,
): string {
  return target === 'expressNo' ? content.expressNo ?? '' : content.inboundCode ?? content.barcode;
}

export function getTextPrintMul(widthDots: number, heightDots: number, text: string): {
  xMul: number;
  yMul: number;
} {
  const naturalW = Math.max(1, estimateTextWidthDots(text));
  const naturalH = TSPL_TEXT_LINE_HEIGHT_DOTS;
  return {
    xMul: clampDots(Math.max(1, Math.round(widthDots / naturalW)), 1, TSPL_TEXT_MUL_MAX),
    yMul: clampDots(Math.max(1, Math.round(heightDots / naturalH)), 1, TSPL_TEXT_MUL_MAX),
  };
}

export function getElementDimensions(
  layout: LabelBarcodeLayoutConfig,
  target: 'expressNo' | 'barcode' | 'inboundCode',
  content: LabelLayoutContentSizes,
  widthMm = XPRINTER_P203A.defaultWidthMm,
): ElementDimensions {
  if (target === 'barcode') {
    const metrics = getBarcodePrintMetrics(layout, content, widthMm);
    return { widthDots: metrics.widthDots, heightDots: metrics.height };
  }
  const text = textForTarget(target, content);
  const naturalW = defaultTextWidthDots(text);
  const naturalH = defaultTextHeightDots();
  const el = layout[target];
  return {
    widthDots: el.widthDots ?? naturalW,
    heightDots: el.heightDots ?? naturalH,
  };
}

export function getBarcodePrintMetrics(
  layout: LabelBarcodeLayoutConfig,
  content: LabelLayoutContentSizes,
  widthMm = XPRINTER_P203A.defaultWidthMm,
): BarcodePrintMetrics {
  const labelW = labelWidthDots(widthMm);
  const code = content.barcode.trim();
  const modules = Math.max(1, getCode128TotalModules(code));
  const targetWidth =
    layout.barcode.widthDots ?? defaultBarcodeWidthDots(code, widthMm);
  const narrow = clampDots(Math.round(targetWidth / modules), 1, 12);
  const wide = clampDots(
    Math.round(narrow * (TSPL_BARCODE_WIDE / TSPL_BARCODE_NARROW)),
    2,
    24,
  );
  return {
    height: clampBarcodeHeightDots(layout.barcode.height),
    narrow,
    wide,
    widthDots: modules * narrow,
  };
}

function migrateLegacyTextElement(
  element: LabelSizedElement & LegacySized,
  text: string,
  widthMm = XPRINTER_P203A.defaultWidthMm,
): LabelSizedElement {
  const legacyScale = element.scale ?? 1;
  const naturalW = defaultTextWidthDots(text);
  const naturalH = defaultTextHeightDots();
  return {
    x: element.x,
    y: element.y,
    widthDots: clampWidthDots(element.widthDots ?? Math.round(naturalW * legacyScale), widthMm),
    heightDots: clampHeightDots(element.heightDots ?? Math.round(naturalH * legacyScale)),
  };
}

function migrateLegacyBarcode(
  barcode: LabelBarcodeElement & LegacySized,
  content: LabelLayoutContentSizes,
  widthMm = XPRINTER_P203A.defaultWidthMm,
): LabelBarcodeElement {
  const legacyScale = barcode.scale ?? 1;
  const naturalW = defaultBarcodeWidthDots(content.barcode, widthMm);
  return {
    x: barcode.x,
    y: barcode.y,
    height: clampBarcodeHeightDots(Math.round(barcode.height * legacyScale)),
    widthDots: clampWidthDots(
      barcode.widthDots ?? Math.round(naturalW * legacyScale),
      widthMm,
    ),
  };
}

export function clampLabelBarcodeLayout(
  layout: LabelBarcodeLayoutConfig,
  widthMm = XPRINTER_P203A.defaultWidthMm,
  heightMm = XPRINTER_P203A.defaultHeightMm,
): LabelBarcodeLayoutConfig {
  const maxX = labelWidthDots(widthMm) - 8;
  const maxY = labelHeightDots(heightMm) - 8;

  return {
    version: 1,
    expressNo: {
      x: clampDots(layout.expressNo.x, 0, maxX),
      y: clampDots(layout.expressNo.y, 0, maxY),
      ...(layout.expressNo.widthDots != null
        ? { widthDots: clampWidthDots(layout.expressNo.widthDots, widthMm) }
        : {}),
      ...(layout.expressNo.heightDots != null
        ? { heightDots: clampHeightDots(layout.expressNo.heightDots) }
        : {}),
    },
    barcode: {
      x: clampDots(layout.barcode.x, 0, maxX),
      y: clampDots(layout.barcode.y, 0, maxY),
      height: clampBarcodeHeightDots(layout.barcode.height),
      ...(layout.barcode.widthDots != null
        ? { widthDots: clampWidthDots(layout.barcode.widthDots, widthMm) }
        : {}),
    },
    inboundCode: {
      x: clampDots(layout.inboundCode.x, 0, maxX),
      y: clampDots(layout.inboundCode.y, 0, maxY),
      ...(layout.inboundCode.widthDots != null
        ? { widthDots: clampWidthDots(layout.inboundCode.widthDots, widthMm) }
        : {}),
      ...(layout.inboundCode.heightDots != null
        ? { heightDots: clampHeightDots(layout.inboundCode.heightDots) }
        : {}),
    },
  };
}

export function normalizeLabelBarcodeLayout(
  raw: unknown,
  content: LabelLayoutContentSizes = DEFAULT_LAYOUT_SAMPLE,
  widthMm = XPRINTER_P203A.defaultWidthMm,
): LabelBarcodeLayoutConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Partial<LabelBarcodeLayoutConfig> & {
    expressNo?: LabelSizedElement & LegacySized;
    barcode?: LabelBarcodeElement & LegacySized;
    inboundCode?: LabelSizedElement & LegacySized;
  };
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

  return clampLabelBarcodeLayout(
    {
      version: 1,
      expressNo: migrateLegacyTextElement(value.expressNo, content.expressNo ?? '', widthMm),
      barcode: migrateLegacyBarcode(value.barcode, content, widthMm),
      inboundCode: migrateLegacyTextElement(
        value.inboundCode,
        content.inboundCode ?? content.barcode,
        widthMm,
      ),
    },
    widthMm,
  );
}

export function getEffectiveElementWidthDots(
  layout: LabelBarcodeLayoutConfig,
  target: 'expressNo' | 'barcode' | 'inboundCode',
  content: LabelLayoutContentSizes,
  widthMm = XPRINTER_P203A.defaultWidthMm,
): number {
  const labelW = labelWidthDots(widthMm);
  const dims = getElementDimensions(layout, target, content, widthMm);
  return effectiveElementWidth(dims.widthDots, labelW);
}

function elementSizeDots(
  layout: LabelBarcodeLayoutConfig,
  target: 'expressNo' | 'barcode' | 'inboundCode',
  content: LabelLayoutContentSizes,
  widthMm = XPRINTER_P203A.defaultWidthMm,
): ElementDimensions {
  return getElementDimensions(layout, target, content, widthMm);
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
  const rawSize = elementSizeDots(layout, target, content, widthMm);
  const width = effectiveElementWidth(rawSize.widthDots, labelW);
  const height = rawSize.heightDots;
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
    next[target].x = centerElementXDots(labelW, rawSize.widthDots);
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

export function mergeAndCenterLabelLayout(
  layout: LabelBarcodeLayoutConfig,
  content: LabelLayoutContentSizes,
  widthMm = XPRINTER_P203A.defaultWidthMm,
  heightMm = XPRINTER_P203A.defaultHeightMm,
): LabelBarcodeLayoutConfig {
  const labelW = labelWidthDots(widthMm);
  const labelH = labelHeightDots(heightMm);
  const gap = 10;
  const expressDims = getElementDimensions(layout, 'expressNo', content, widthMm);
  const inboundDims = getElementDimensions(layout, 'inboundCode', content, widthMm);
  const barcodeDims = getElementDimensions(layout, 'barcode', content, widthMm);
  const hasExpress = Boolean(content.expressNo?.trim());

  let stackHeight = barcodeDims.heightDots + gap + inboundDims.heightDots;
  if (hasExpress) stackHeight += expressDims.heightDots + gap;
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
      ...layout.expressNo,
      x: centerElementXDots(labelW, expressDims.widthDots),
      y,
    };
    y += expressDims.heightDots + gap;
  }

  next.barcode = {
    ...layout.barcode,
    x: centerElementXDots(labelW, barcodeDims.widthDots),
    y,
  };
  y += barcodeDims.heightDots + gap;

  next.inboundCode = {
    ...layout.inboundCode,
    x: centerElementXDots(labelW, inboundDims.widthDots),
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

function withResolvedTextSize(
  element: LabelSizedElement,
  text: string,
  widthMm: number,
): LabelSizedElement {
  return {
    ...element,
    widthDots: clampWidthDots(element.widthDots ?? defaultTextWidthDots(text), widthMm),
    heightDots: clampHeightDots(element.heightDots ?? defaultTextHeightDots()),
  };
}

function withResolvedBarcodeSize(
  element: LabelBarcodeElement,
  content: LabelLayoutContentSizes,
  widthMm: number,
): LabelBarcodeElement {
  return {
    ...element,
    widthDots: clampWidthDots(
      element.widthDots ?? defaultBarcodeWidthDots(content.barcode, widthMm),
      widthMm,
    ),
    height: clampBarcodeHeightDots(element.height),
  };
}

export function setLayoutElementPosition(
  layout: LabelBarcodeLayoutConfig,
  target: 'expressNo' | 'barcode' | 'inboundCode',
  patch: Partial<LabelElementPosition> & {
    widthDots?: number;
    heightDots?: number;
    height?: number;
  },
  content: LabelLayoutContentSizes = DEFAULT_LAYOUT_SAMPLE,
  widthMm = XPRINTER_P203A.defaultWidthMm,
): LabelBarcodeLayoutConfig {
  const next: LabelBarcodeLayoutConfig = {
    version: 1,
    expressNo: { ...layout.expressNo },
    barcode: { ...layout.barcode },
    inboundCode: { ...layout.inboundCode },
  };

  if (patch.x != null) next[target].x = patch.x;
  if (patch.y != null) next[target].y = patch.y;

  if (target === 'barcode') {
    if (patch.height != null) next.barcode.height = patch.height;
    if (patch.widthDots != null) next.barcode.widthDots = patch.widthDots;
  } else {
    if (patch.widthDots != null) next[target].widthDots = patch.widthDots;
    if (patch.heightDots != null) next[target].heightDots = patch.heightDots;
  }

  return clampLabelBarcodeLayout(next, widthMm);
}

export function adjustLayoutElement(
  layout: LabelBarcodeLayoutConfig,
  target: 'expressNo' | 'barcode' | 'inboundCode',
  axis: 'x' | 'y' | 'width' | 'height',
  deltaDots: number,
  content: LabelLayoutContentSizes = DEFAULT_LAYOUT_SAMPLE,
  widthMm = XPRINTER_P203A.defaultWidthMm,
): LabelBarcodeLayoutConfig {
  const next: LabelBarcodeLayoutConfig = {
    version: 1,
    expressNo: { ...layout.expressNo },
    barcode: { ...layout.barcode },
    inboundCode: { ...layout.inboundCode },
  };

  if (axis === 'x' || axis === 'y') {
    next[target][axis] += deltaDots;
    return clampLabelBarcodeLayout(next, widthMm);
  }

  if (target === 'barcode') {
    const dims = getElementDimensions(layout, 'barcode', content, widthMm);
    if (axis === 'width') {
      const code = content.barcode.trim();
      const modules = Math.max(1, getCode128TotalModules(code));
      const metrics = getBarcodePrintMetrics(layout, content, widthMm);
      const currentNarrow = metrics.narrow;
      let nextNarrow = clampDots(Math.round((dims.widthDots + deltaDots) / modules), 1, 12);
      if (deltaDots > 0 && nextNarrow <= currentNarrow) {
        nextNarrow = Math.min(12, currentNarrow + 1);
      } else if (deltaDots < 0 && nextNarrow >= currentNarrow) {
        nextNarrow = Math.max(1, currentNarrow - 1);
      }
      next.barcode = withResolvedBarcodeSize(
        {
          ...next.barcode,
          widthDots: nextNarrow * modules,
        },
        content,
        widthMm,
      );
    } else {
      next.barcode.height = clampBarcodeHeightDots(next.barcode.height + deltaDots);
    }
    return clampLabelBarcodeLayout(next, widthMm);
  }

  const text = textForTarget(target, content);
  const dims = getElementDimensions(layout, target, content, widthMm);
  next[target] = withResolvedTextSize(
    {
      ...next[target],
      widthDots: axis === 'width' ? dims.widthDots + deltaDots : dims.widthDots,
      heightDots: axis === 'height' ? dims.heightDots + deltaDots : dims.heightDots,
    },
    text,
    widthMm,
  );
  return clampLabelBarcodeLayout(next, widthMm);
}

export function getElementSizeLimitsMm(
  widthMm = XPRINTER_P203A.defaultWidthMm,
): {
  widthMinMm: number;
  widthMaxMm: number;
  heightMinMm: number;
  heightMaxMm: number;
  barcodeHeightMinMm: number;
  barcodeHeightMaxMm: number;
} {
  const widthMax = Math.min(LABEL_ELEMENT_WIDTH_MM_MAX, widthMm - 2);
  return {
    widthMinMm: LABEL_ELEMENT_WIDTH_MM_MIN,
    widthMaxMm: widthMax,
    heightMinMm: LABEL_ELEMENT_HEIGHT_MM_MIN,
    heightMaxMm: LABEL_ELEMENT_HEIGHT_MM_MAX,
    barcodeHeightMinMm: dotsToMm(LABEL_BARCODE_HEIGHT_MIN),
    barcodeHeightMaxMm: dotsToMm(LABEL_BARCODE_HEIGHT_MAX),
  };
}
