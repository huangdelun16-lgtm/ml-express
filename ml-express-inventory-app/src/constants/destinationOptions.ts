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

/** 将草稿/历史文本规范为装车出库同款目的地码 */
export function normalizePackDestination(value: string): PackDestination | '' {
  const upper = value.trim().toUpperCase();
  if (!upper) return '';
  if ((PACK_DESTINATION_OPTIONS as readonly string[]).includes(upper)) {
    return upper as PackDestination;
  }
  const prefix = upper.replace(/[0-9]/g, '').slice(0, 3);
  if (prefix && (PACK_DESTINATION_OPTIONS as readonly string[]).includes(prefix)) {
    return prefix as PackDestination;
  }
  return '';
}
