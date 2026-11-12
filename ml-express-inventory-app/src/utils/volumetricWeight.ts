import { parseSpec } from './itemFieldFormat';

/** 体积重量 = 长 × 宽 × 高（厘米）÷ 6000，单位公斤。 */
export const VOLUMETRIC_DIVISOR = 6000;

function positiveDim(raw: string): number | null {
  const n = Number(String(raw ?? '').trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function roundKg(kg: number): number {
  return Math.round(kg * 100) / 100;
}

export function volumetricWeightKg(l: string, w: string, h: string): number | null {
  const a = positiveDim(l);
  const b = positiveDim(w);
  const c = positiveDim(h);
  if (a == null || b == null || c == null) return null;
  const kg = roundKg((a * b * c) / VOLUMETRIC_DIVISOR);
  return kg > 0 ? kg : null;
}

export function volumetricWeightFromSpec(spec: string | null | undefined): number | null {
  const parts = parseSpec(String(spec || ''));
  return volumetricWeightKg(parts.l, parts.w, parts.h);
}

/**
 * 两边都有数时才比较。体积重量更大就用体积重量，否则用实际重量。
 * 还没填齐时返回 null，调用方保持现状。
 */
export function preferredChargeBasis(
  volumetricKg: number | null,
  actualKg: number,
): 'volume' | 'weight' | null {
  if (!(actualKg > 0) || volumetricKg == null || !(volumetricKg > 0)) return null;
  return volumetricKg > actualKg ? 'volume' : 'weight';
}

/** 30×20×15=9000÷6000 */
export function volumetricFormula(l: string, w: string, h: string): string {
  const a = positiveDim(l);
  const b = positiveDim(w);
  const c = positiveDim(h);
  if (a == null || b == null || c == null) return '';
  const product = a * b * c;
  const shown = Number.isInteger(product) ? String(product) : String(Math.round(product * 100) / 100);
  const dim = (n: number) => (Number.isInteger(n) ? String(n) : String(n));
  return `${dim(a)}×${dim(b)}×${dim(c)}=${shown}÷${VOLUMETRIC_DIVISOR}`;
}
