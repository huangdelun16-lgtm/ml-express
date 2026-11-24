import core from './volumetricWeightCore';

/** 体积重量 = 长 × 宽 × 高（厘米）÷ 6000，单位公斤。和库存 App、入库接口同一套。 */
export const VOLUMETRIC_DIVISOR: number = core.VOLUMETRIC_DIVISOR;

/** 只保留数字和一个小数点。`1.2.3` 收成 `1.23`。 */
export function sanitizeDecimalInput(raw: string): string {
  return core.sanitizeDecimalInput(raw);
}

export function volumetricWeightKg(l: string, w: string, h: string): number | null {
  return core.volumetricWeightKg(l, w, h);
}

/** 两边都有数时才比较。体积重量更大就用体积重量，否则用实际重量。 */
export function preferredChargeBasis(
  volumetricKg: number | null,
  actualKg: number,
): 'volume' | 'weight' | null {
  return core.preferredChargeBasis(volumetricKg, actualKg);
}

/** 从「14 x 14 x 5 cm」这类规格算出体积重量。 */
export function volumetricWeightFromSpec(spec: string): { kg: number; formula: string } | null {
  return core.volumetricDetailFromSpec(spec);
}

export function parseActualKg(raw: string | null | undefined): number | null {
  return core.parseActualKg(raw);
}

/** 体积重量比实际重量大时才返回，供发票多写一行。 */
export function heavierVolumetricFromSpec(
  spec: string | null | undefined,
  actualRaw: string | null | undefined,
): { kg: number; formula: string } | null {
  return core.heavierVolumetricFromSpec(spec, actualRaw);
}

/** 30×20×15=9000÷6000 */
export function volumetricFormula(l: string, w: string, h: string): string {
  return core.volumetricFormula(l, w, h);
}
