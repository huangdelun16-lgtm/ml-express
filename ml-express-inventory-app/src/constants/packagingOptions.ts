export const PACKAGING_OPTIONS = ['塑料袋', '纸箱', '泡沫'] as const;

export type PackagingType = (typeof PACKAGING_OPTIONS)[number];
