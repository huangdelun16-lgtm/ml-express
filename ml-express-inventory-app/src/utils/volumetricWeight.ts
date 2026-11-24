import core from '../../../src/utils/volumetricWeightCore';

/** 体积重量 = 长 × 宽 × 高（厘米）÷ 6000，单位公斤。和后台、入库接口同一套。 */
export const VOLUMETRIC_DIVISOR: number = core.VOLUMETRIC_DIVISOR;

export function volumetricWeightKg(l: string, w: string, h: string): number | null {
  return core.volumetricWeightKg(l, w, h);
}

export function parseActualKg(raw: string | null | undefined): number | null {
  return core.parseActualKg(raw);
}

export function volumetricWeightFromSpec(spec: string | null | undefined): number | null {
  return core.volumetricDetailFromSpec(spec)?.kg ?? null;
}

/** 体积重量比这条实际重量大时返回体积公斤，否则不显示。 */
export function heavierVolumetricKg(
  spec: string | null | undefined,
  actualRaw: string | null | undefined,
): number | null {
  return core.heavierVolumetricFromSpec(spec, actualRaw)?.kg ?? null;
}

/**
 * 两边都有数时才比较。体积重量更大就用体积重量，否则用实际重量。
 * 还没填齐时返回 null，调用方保持现状。
 */
export function preferredChargeBasis(
  volumetricKg: number | null,
  actualKg: number,
): 'volume' | 'weight' | null {
  return core.preferredChargeBasis(volumetricKg, actualKg);
}

/** 30×20×15=9000÷6000 */
export function volumetricFormula(l: string, w: string, h: string): string {
  return core.volumetricFormula(l, w, h);
}
