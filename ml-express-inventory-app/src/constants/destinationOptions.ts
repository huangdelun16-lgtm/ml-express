/** 打包快递可选目的地 */
export const PACK_DESTINATION_OPTIONS = [
  'MSE',
  'LSO',
  'POL',
  'MDY',
  'YGN',
  'TGI',
] as const;

export type PackDestination = (typeof PACK_DESTINATION_OPTIONS)[number];
