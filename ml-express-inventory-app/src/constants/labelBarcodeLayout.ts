import { MIN_PRINT_BARCODE_NARROW } from './barcodeScan';
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
/** 合并居中：快递单号与条码间距（更紧） */
export const MERGE_CENTER_EXPRESS_BARCODE_GAP = 2;
/** 合并居中：条码与入库码间距 */
export const MERGE_CENTER_BARCODE_TEXT_GAP = 4;
/** @deprecated use MERGE_CENTER_*_GAP */
export const MERGE_CENTER_LINE_GAP = MERGE_CENTER_BARCODE_TEXT_GAP;
export const GROUP_TEXT_SCALE_STEP = 0.2;
export const GROUP_TEXT_SCALE_MIN = 1;
export const GROUP_TEXT_SCALE_MAX = 2;
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

/** 布局步进专用：保留正负号，避免 mmToDots 的 Math.max(1, …) 把减量变成 +1 dot */
export function mmDeltaToLayoutDots(mm: number): number {
  if (!Number.isFinite(mm) || mm === 0) return 0;
  return Math.round((mm / 25.4) * XPRINTER_P203A.dpi);
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

function textPrintWidthDots(
  layout: LabelBarcodeLayoutConfig,
  target: 'expressNo' | 'inboundCode',
  content: LabelLayoutContentSizes,
  widthMm = XPRINTER_P203A.defaultWidthMm,
): number {
  const text = textForTarget(target, content);
  const dims = getElementDimensions(layout, target, content, widthMm);
  const el = layout[target];
  const { xMul } = getTextPrintMul(
    el.widthDots ?? dims.widthDots,
    el.heightDots ?? dims.heightDots,
    text,
  );
  return xMul * defaultTextWidthDots(text);
}

/** 在条码宽度范围内，按实际打印文字宽度水平居中 */
function textXAlignedToBarcode(
  barcodeX: number,
  barcodeWidth: number,
  textPrintWidth: number,
  labelW: number,
): number {
  const centered = Math.round(barcodeX + (barcodeWidth - textPrintWidth) / 2);
  return Math.max(0, Math.min(labelW - textPrintWidth, centered));
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
  const { xMul, yMul } = getTextPrintMul(
    el.widthDots ?? naturalW,
    el.heightDots ?? naturalH,
    text,
  );
  return {
    widthDots: xMul * naturalW,
    heightDots: yMul * naturalH,
  };
}

export function getBarcodePrintMetrics(
  layout: LabelBarcodeLayoutConfig,
  content: LabelLayoutContentSizes,
  widthMm = XPRINTER_P203A.defaultWidthMm,
): BarcodePrintMetrics {
  const code = content.barcode.trim();
  const modules = Math.max(1, getCode128TotalModules(code));
  const maxNarrow = barcodeMaxNarrow(content, widthMm);
  const minNarrow = Math.min(barcodeMinNarrow(), maxNarrow);

  let narrow: number;
  if (layout.barcode.widthDots != null) {
    narrow = clampDots(Math.round(layout.barcode.widthDots / modules), minNarrow, maxNarrow);
  } else {
    narrow = clampDots(Math.min(TSPL_BARCODE_NARROW, maxNarrow), minNarrow, maxNarrow);
  }

  let height = clampBarcodeHeightDots(layout.barcode.height);
  if (narrow <= 1) {
    height = Math.max(height, 112);
  } else if (narrow === 2) {
    height = Math.max(height, 104);
  }

  const wide = clampDots(
    Math.round(narrow * (TSPL_BARCODE_WIDE / TSPL_BARCODE_NARROW)),
    2,
    24,
  );
  return {
    height,
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
  const hasExpress = Boolean(content.expressNo?.trim());

  const expressDims = getElementDimensions(layout, 'expressNo', content, widthMm);
  const barcodeDims = getElementDimensions(layout, 'barcode', content, widthMm);
  const inboundDims = getElementDimensions(layout, 'inboundCode', content, widthMm);
  const barcodeHeight = layout.barcode.height;

  let expressGap = hasExpress ? MERGE_CENTER_EXPRESS_BARCODE_GAP : 0;
  let textGap = MERGE_CENTER_BARCODE_TEXT_GAP;

  const stackHeightFor = (expressG: number, barTextG: number) =>
    barcodeHeight +
    barTextG +
    inboundDims.heightDots +
    (hasExpress ? expressDims.heightDots + expressG : 0);

  let stackHeight = stackHeightFor(expressGap, textGap);
  if (stackHeight > labelH - 4) {
    const overflow = stackHeight - (labelH - 4);
    textGap = Math.max(2, textGap - Math.ceil(overflow / 2));
    expressGap = hasExpress ? Math.max(1, expressGap - Math.floor(overflow / 2)) : 0;
    stackHeight = stackHeightFor(expressGap, textGap);
  }

  const startY = Math.max(0, Math.round((labelH - stackHeight) / 2));

  const next: LabelBarcodeLayoutConfig = {
    version: 1,
    expressNo: { ...layout.expressNo },
    barcode: { ...layout.barcode },
    inboundCode: { ...layout.inboundCode },
  };

  let y = startY;

  const barcodeWidth = barcodeDims.widthDots;
  const barcodeX = centerElementXDots(labelW, barcodeWidth);
  const barcodeY = hasExpress ? y + expressDims.heightDots + expressGap : y;

  next.barcode = {
    ...layout.barcode,
    x: barcodeX,
    y: barcodeY,
  };

  const inboundPrintW = textPrintWidthDots(layout, 'inboundCode', content, widthMm);
  next.inboundCode = {
    ...layout.inboundCode,
    x: textXAlignedToBarcode(barcodeX, barcodeWidth, inboundPrintW, labelW),
    y: barcodeY + barcodeHeight + textGap,
    widthDots: inboundPrintW,
  };

  if (hasExpress) {
    const expressPrintW = textPrintWidthDots(layout, 'expressNo', content, widthMm);
    next.expressNo = {
      ...layout.expressNo,
      x: textXAlignedToBarcode(barcodeX, barcodeWidth, expressPrintW, labelW),
      y: barcodeY - expressGap - expressDims.heightDots,
      widthDots: expressPrintW,
    };
  }

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
      const modules = barcodeModuleCount(content);
      const metrics = getBarcodePrintMetrics(layout, content, widthMm);
      const maxNarrow = barcodeMaxNarrow(content, widthMm);
      let nextNarrow = metrics.narrow;
      if (deltaDots > 0) {
        nextNarrow = Math.min(maxNarrow, metrics.narrow + 1);
      } else if (deltaDots < 0) {
        nextNarrow = Math.max(barcodeMinNarrow(), metrics.narrow - 1);
      }
      if (nextNarrow === metrics.narrow) {
        return layout;
      }
      next.barcode = withResolvedBarcodeSize(
        {
          ...next.barcode,
          widthDots: nextNarrow * modules,
        },
        content,
        widthMm,
      );
      return clampLabelBarcodeLayout(next, widthMm);
    } else {
      next.barcode.height = clampBarcodeHeightDots(next.barcode.height + deltaDots);
    }
    return clampLabelBarcodeLayout(next, widthMm);
  }

  const text = textForTarget(target, content);
  const naturalW = defaultTextWidthDots(text);
  const naturalH = defaultTextHeightDots();
  const dims = getElementDimensions(layout, target, content, widthMm);
  const stored = layout[target];
  const { xMul, yMul } = getTextPrintMul(
    stored.widthDots ?? dims.widthDots,
    stored.heightDots ?? dims.heightDots,
    text,
  );

  if (axis === 'width') {
    let nextMul = clampDots(Math.round((dims.widthDots + deltaDots) / naturalW), 1, TSPL_TEXT_MUL_MAX);
    if (deltaDots > 0 && nextMul <= xMul) {
      nextMul = Math.min(TSPL_TEXT_MUL_MAX, xMul + 1);
    } else if (deltaDots < 0 && nextMul >= xMul) {
      nextMul = Math.max(1, xMul - 1);
    }
    next[target] = withResolvedTextSize(
      { ...next[target], widthDots: nextMul * naturalW },
      text,
      widthMm,
    );
  } else {
    let nextMul = clampDots(Math.round((dims.heightDots + deltaDots) / naturalH), 1, TSPL_TEXT_MUL_MAX);
    if (deltaDots > 0 && nextMul <= yMul) {
      nextMul = Math.min(TSPL_TEXT_MUL_MAX, yMul + 1);
    } else if (deltaDots < 0 && nextMul >= yMul) {
      nextMul = Math.max(1, yMul - 1);
    }
    next[target] = withResolvedTextSize(
      { ...next[target], heightDots: nextMul * naturalH },
      text,
      widthMm,
    );
  }
  return clampLabelBarcodeLayout(next, widthMm);
}

export function canAdjustElementSize(
  layout: LabelBarcodeLayoutConfig,
  target: 'expressNo' | 'barcode' | 'inboundCode',
  axis: 'width' | 'height',
  direction: 1 | -1,
  content: LabelLayoutContentSizes,
  widthMm = XPRINTER_P203A.defaultWidthMm,
): boolean {
  if (target === 'barcode') {
    const metrics = getBarcodePrintMetrics(layout, content, widthMm);
    const maxNarrow = barcodeMaxNarrow(content, widthMm);
    if (axis === 'width') {
      if (maxNarrow <= barcodeMinNarrow()) return false;
      return direction > 0 ? metrics.narrow < maxNarrow : metrics.narrow > barcodeMinNarrow();
    }
    const height = metrics.height;
    return direction > 0 ? height < LABEL_BARCODE_HEIGHT_MAX : height > LABEL_BARCODE_HEIGHT_MIN;
  }

  const text = textForTarget(target, content);
  const dims = getElementDimensions(layout, target, content, widthMm);
  const stored = layout[target];
  const { xMul, yMul } = getTextPrintMul(
    stored.widthDots ?? dims.widthDots,
    stored.heightDots ?? dims.heightDots,
    text,
  );
  if (axis === 'width') {
    return direction > 0 ? xMul < TSPL_TEXT_MUL_MAX : xMul > 1;
  }
  return direction > 0 ? yMul < TSPL_TEXT_MUL_MAX : yMul > 1;
}

function barcodeModuleCount(content: LabelLayoutContentSizes): number {
  return Math.max(1, getCode128TotalModules(content.barcode.trim()));
}

export function barcodeMaxNarrow(
  content: LabelLayoutContentSizes,
  widthMm = XPRINTER_P203A.defaultWidthMm,
): number {
  const modules = barcodeModuleCount(content);
  const maxWidth = labelWidthDots(widthMm) - 8;
  return Math.min(12, Math.max(1, Math.floor(maxWidth / modules)));
}

export function barcodeMinNarrow(): number {
  return MIN_PRINT_BARCODE_NARROW;
}

export type LabelGroupBounds = {
  x: number;
  y: number;
  widthDots: number;
  heightDots: number;
};

function labelGroupTargets(
  content: LabelLayoutContentSizes,
): Array<'expressNo' | 'barcode' | 'inboundCode'> {
  return content.expressNo?.trim()
    ? ['expressNo', 'barcode', 'inboundCode']
    : ['barcode', 'inboundCode'];
}

export function getLabelGroupBounds(
  layout: LabelBarcodeLayoutConfig,
  content: LabelLayoutContentSizes,
  widthMm = XPRINTER_P203A.defaultWidthMm,
): LabelGroupBounds {
  const targets = labelGroupTargets(content);
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const target of targets) {
    const dims = getElementDimensions(layout, target, content, widthMm);
    const pos = layout[target];
    const width = getEffectiveElementWidthDots(layout, target, content, widthMm);
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + width);
    maxY = Math.max(maxY, pos.y + dims.heightDots);
  }

  if (!Number.isFinite(minX)) {
    return { x: 0, y: 0, widthDots: 0, heightDots: 0 };
  }

  return {
    x: minX,
    y: minY,
    widthDots: Math.max(0, maxX - minX),
    heightDots: Math.max(0, maxY - minY),
  };
}

export function moveLabelGroup(
  layout: LabelBarcodeLayoutConfig,
  deltaX: number,
  deltaY: number,
  content: LabelLayoutContentSizes,
  widthMm = XPRINTER_P203A.defaultWidthMm,
  heightMm = XPRINTER_P203A.defaultHeightMm,
): LabelBarcodeLayoutConfig {
  const next: LabelBarcodeLayoutConfig = {
    version: 1,
    expressNo: { ...layout.expressNo },
    barcode: { ...layout.barcode },
    inboundCode: { ...layout.inboundCode },
  };

  for (const target of labelGroupTargets(content)) {
    next[target].x += deltaX;
    next[target].y += deltaY;
  }

  return clampLabelBarcodeLayout(next, widthMm, heightMm);
}

export function alignLabelGroup(
  layout: LabelBarcodeLayoutConfig,
  alignment: { horizontal?: LabelLayoutAlignH; vertical?: LabelLayoutAlignV },
  content: LabelLayoutContentSizes,
  widthMm = XPRINTER_P203A.defaultWidthMm,
  heightMm = XPRINTER_P203A.defaultHeightMm,
): LabelBarcodeLayoutConfig {
  const labelW = labelWidthDots(widthMm);
  const labelH = labelHeightDots(heightMm);
  const bounds = getLabelGroupBounds(layout, content, widthMm);
  const margin = 4;

  let targetX = bounds.x;
  let targetY = bounds.y;

  if (alignment.horizontal === 'left') {
    targetX = 0;
  } else if (alignment.horizontal === 'center') {
    targetX = centerElementXDots(labelW, bounds.widthDots);
  } else if (alignment.horizontal === 'right') {
    targetX = Math.max(0, labelW - bounds.widthDots - margin);
  }

  if (alignment.vertical === 'top') {
    targetY = 0;
  } else if (alignment.vertical === 'middle') {
    targetY = Math.round((labelH - bounds.heightDots) / 2);
  } else if (alignment.vertical === 'bottom') {
    targetY = Math.max(0, labelH - bounds.heightDots - margin);
  }

  return moveLabelGroup(
    layout,
    targetX - bounds.x,
    targetY - bounds.y,
    content,
    widthMm,
    heightMm,
  );
}

function snapGroupTextScale(scale: number): number {
  return Math.round(scale * 5) / 5;
}

export function formatGroupTextScale(scale: number): string {
  const snapped = snapGroupTextScale(scale);
  return Number.isInteger(snapped) ? `×${snapped}` : `×${snapped.toFixed(1)}`;
}

export function getGroupTextScaleMul(
  layout: LabelBarcodeLayoutConfig,
  content: LabelLayoutContentSizes,
  widthMm = XPRINTER_P203A.defaultWidthMm,
): number {
  const dims = getElementDimensions(layout, 'inboundCode', content, widthMm);
  const heightDots = layout.inboundCode.heightDots ?? dims.heightDots;
  const scale = heightDots / TSPL_TEXT_LINE_HEIGHT_DOTS;
  return snapGroupTextScale(scale);
}

function applyGroupTextScaleToTarget(
  layout: LabelBarcodeLayoutConfig,
  target: 'expressNo' | 'inboundCode',
  scale: number,
  content: LabelLayoutContentSizes,
  widthMm: number,
): LabelBarcodeLayoutConfig {
  const text = textForTarget(target, content);
  const naturalW = defaultTextWidthDots(text);
  const heightDots = Math.round(scale * TSPL_TEXT_LINE_HEIGHT_DOTS);
  const widthDots = Math.round(scale * naturalW);
  return {
    ...layout,
    [target]: withResolvedTextSize(
      { ...layout[target], widthDots, heightDots },
      text,
      widthMm,
    ),
  };
}

export function adjustGroupTextScale(
  layout: LabelBarcodeLayoutConfig,
  direction: 1 | -1,
  content: LabelLayoutContentSizes,
  widthMm = XPRINTER_P203A.defaultWidthMm,
  heightMm = XPRINTER_P203A.defaultHeightMm,
): LabelBarcodeLayoutConfig {
  const current = getGroupTextScaleMul(layout, content, widthMm);
  const next = snapGroupTextScale(current + direction * GROUP_TEXT_SCALE_STEP);
  const clamped = Math.max(GROUP_TEXT_SCALE_MIN, Math.min(GROUP_TEXT_SCALE_MAX, next));
  if (clamped === current) {
    return layout;
  }

  let nextLayout = layout;
  if (content.expressNo?.trim()) {
    nextLayout = applyGroupTextScaleToTarget(
      nextLayout,
      'expressNo',
      clamped,
      content,
      widthMm,
    );
  }
  nextLayout = applyGroupTextScaleToTarget(
    nextLayout,
    'inboundCode',
    clamped,
    content,
    widthMm,
  );
  return clampLabelBarcodeLayout(nextLayout, widthMm, heightMm);
}

export function canAdjustGroupTextScale(
  layout: LabelBarcodeLayoutConfig,
  direction: 1 | -1,
  content: LabelLayoutContentSizes,
  widthMm = XPRINTER_P203A.defaultWidthMm,
): boolean {
  const current = getGroupTextScaleMul(layout, content, widthMm);
  if (direction > 0) {
    return current < GROUP_TEXT_SCALE_MAX;
  }
  return current > GROUP_TEXT_SCALE_MIN;
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
