import { XPRINTER_P203A } from './xprinterP203a';
import { mmToDots } from '../utils/labelPrintLayout';

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

export const DEFAULT_LABEL_BARCODE_LAYOUT: LabelBarcodeLayoutConfig = {
  version: 1,
  expressNo: { x: 12, y: 8 },
  barcode: { x: 12, y: 42, height: 96 },
  inboundCode: { x: 12, y: 148 },
};

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
