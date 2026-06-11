const SPEC_RE = /^\s*(\S*)\s*x\s*(\S*)\s*x\s*(\S*)\s*cm\s*$/i;
const UNIT_RE = /^\s*(\S*)\s*Pcs\s*$/i;
const WEIGHT_RE = /^\s*(\S*)\s*Kg\s*$/i;

export type SpecParts = { l: string; w: string; h: string };
export type UnitPart = { n: string };
export type WeightPart = { n: string };

export function sanitizeNumberInput(raw: string): string {
  return raw.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
}

export function parseSpec(value: string): SpecParts {
  const trimmed = value.trim();
  if (!trimmed) return { l: '', w: '', h: '' };
  const m = trimmed.match(SPEC_RE);
  if (m) return { l: m[1], w: m[2], h: m[3] };
  return { l: '', w: '', h: '' };
}

export function formatSpec(parts: SpecParts): string {
  const { l, w, h } = parts;
  if (!l && !w && !h) return '';
  return `${l || '0'} x ${w || '0'} x ${h || '0'} cm`;
}

export function parseUnit(value: string): UnitPart {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '件') return { n: '1' };
  const m = trimmed.match(UNIT_RE);
  if (m) return { n: m[1] || '1' };
  if (/^Pcs$/i.test(trimmed)) return { n: '1' };
  return { n: '1' };
}

export function formatUnit(parts: UnitPart): string {
  const n = parts.n.trim() || '1';
  return `${n} Pcs`;
}

export function parseWeight(value: string): WeightPart {
  const trimmed = value.trim();
  if (!trimmed) return { n: '' };
  const m = trimmed.match(WEIGHT_RE);
  if (m) return { n: m[1] };
  return { n: sanitizeNumberInput(trimmed) };
}

export function formatWeight(parts: WeightPart): string {
  const n = parts.n.trim();
  if (!n) return '';
  return `${n} Kg`;
}

/** 库存展示用：固定 Pcs */
export function stockUnitLabel(): string {
  return 'Pcs';
}

export function parseWeightKg(value: string): number {
  const n = parseWeight(value).n;
  if (!n) return 0;
  const num = Number(n);
  return Number.isFinite(num) ? num : 0;
}

export function sumPackageWeightsKg(weights: string[]): string {
  const total = weights.reduce((acc, w) => acc + parseWeightKg(w), 0);
  if (total <= 0) return '';
  return total % 1 === 0 ? String(total) : total.toFixed(2);
}
