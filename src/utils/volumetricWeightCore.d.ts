export const VOLUMETRIC_DIVISOR: number;

export function sanitizeDecimalInput(raw: string): string;

export function volumetricWeightKg(l: string, w: string, h: string): number | null;

export function preferredChargeBasis(
  volumetricKg: number | null,
  actualKg: number,
): 'volume' | 'weight' | null;

export function volumetricFormula(l: string, w: string, h: string): string;

export function volumetricDetailFromSpec(
  spec: string | null | undefined,
): { kg: number; formula: string } | null;

export function parseActualKg(raw: string | null | undefined): number | null;

export function heavierVolumetricFromSpec(
  spec: string | null | undefined,
  actualRaw: string | null | undefined,
): { kg: number; formula: string } | null;

export function normalizeSpec(spec: string | null | undefined): string;

export function volumetricKgFromSpec(spec: string | null | undefined): number;

declare const core: {
  VOLUMETRIC_DIVISOR: number;
  sanitizeDecimalInput: (raw: string) => string;
  volumetricWeightKg: (l: string, w: string, h: string) => number | null;
  preferredChargeBasis: (
    volumetricKg: number | null,
    actualKg: number,
  ) => 'volume' | 'weight' | null;
  volumetricFormula: (l: string, w: string, h: string) => string;
  volumetricDetailFromSpec: (
    spec: string | null | undefined,
  ) => { kg: number; formula: string } | null;
  parseActualKg: (raw: string | null | undefined) => number | null;
  heavierVolumetricFromSpec: (
    spec: string | null | undefined,
    actualRaw: string | null | undefined,
  ) => { kg: number; formula: string } | null;
  normalizeSpec: (spec: string | null | undefined) => string;
  volumetricKgFromSpec: (spec: string | null | undefined) => number;
};

export default core;
