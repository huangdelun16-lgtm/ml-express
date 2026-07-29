import { XPRINTER_P203A } from './xprinterP203a';

export type LabelPaperSpec = {
  widthMm: number;
  heightMm: number;
  gapMm: number;
};

export type LabelPaperPreset = {
  id: string;
  widthMm: number;
  heightMm: number;
  gapMm: number;
};

export const DEFAULT_LABEL_PAPER: LabelPaperSpec = {
  widthMm: XPRINTER_P203A.defaultWidthMm,
  heightMm: XPRINTER_P203A.defaultHeightMm,
  gapMm: XPRINTER_P203A.defaultGapMm,
};

export const LABEL_PAPER_PRESETS: LabelPaperPreset[] = [
  { id: '58x40', widthMm: 58, heightMm: 40, gapMm: 2 },
  { id: '40x30', widthMm: 40, heightMm: 30, gapMm: 2 },
  { id: '40x20', widthMm: 40, heightMm: 20, gapMm: 2 },
  { id: '50x30', widthMm: 50, heightMm: 30, gapMm: 2 },
];

function clampMm(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value * 10) / 10));
}

export function clampLabelPaperSpec(spec: LabelPaperSpec): LabelPaperSpec {
  return {
    widthMm: clampMm(spec.widthMm, 20, 80),
    heightMm: clampMm(spec.heightMm, 10, 80),
    gapMm: clampMm(spec.gapMm, 0, 10),
  };
}

export function normalizeLabelPaperSpec(raw: unknown): LabelPaperSpec | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Partial<LabelPaperSpec>;
  if (
    typeof value.widthMm !== 'number' ||
    typeof value.heightMm !== 'number' ||
    typeof value.gapMm !== 'number'
  ) {
    return null;
  }
  return clampLabelPaperSpec({
    widthMm: value.widthMm,
    heightMm: value.heightMm,
    gapMm: value.gapMm,
  });
}

export function paperSpecsEqual(a: LabelPaperSpec, b: LabelPaperSpec): boolean {
  return a.widthMm === b.widthMm && a.heightMm === b.heightMm && a.gapMm === b.gapMm;
}

export function formatPaperSpec(spec: LabelPaperSpec): string {
  return `${spec.widthMm}×${spec.heightMm} · gap ${spec.gapMm}mm`;
}

export function findMatchingPaperPreset(spec: LabelPaperSpec): string | null {
  const match = LABEL_PAPER_PRESETS.find(
    (preset) =>
      preset.widthMm === spec.widthMm &&
      preset.heightMm === spec.heightMm &&
      preset.gapMm === spec.gapMm,
  );
  return match?.id ?? null;
}
