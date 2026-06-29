/** 打包快递可选目的地（3 字母区域码） */
export const PACK_DESTINATION_OPTIONS = [
  'MSE',
  'RUI',
  'LSO',
  'POL',
  'MDY',
  'YGN',
  'TGI',
] as const;

export type PackDestination = (typeof PACK_DESTINATION_OPTIONS)[number];

/** UI 展示名（如 RUI → RUILI） */
export const REGION_DISPLAY_LABELS: Record<PackDestination, string> = {
  MSE: 'MSE',
  RUI: 'RUILI',
  LSO: 'LSO',
  POL: 'POL',
  MDY: 'MDY',
  YGN: 'YGN',
  TGI: 'TGI',
};

/** 区域码 → UI 展示名 */
export function regionDisplayLabel(code: string): string {
  const normalized = normalizePackDestination(code) || code.trim().toUpperCase();
  if ((PACK_DESTINATION_OPTIONS as readonly string[]).includes(normalized)) {
    return REGION_DISPLAY_LABELS[normalized as PackDestination];
  }
  if (normalized === 'RUILI') return 'RUILI';
  return code.trim().toUpperCase() || code;
}

/** 将草稿/历史文本规范为装车出库同款目的地码 */
export function normalizePackDestination(value: string): PackDestination | '' {
  const upper = value.trim().toUpperCase();
  if (!upper) return '';
  if (upper.startsWith('RUILI')) return 'RUI';
  if ((PACK_DESTINATION_OPTIONS as readonly string[]).includes(upper)) {
    return upper as PackDestination;
  }
  const prefix = upper.replace(/[0-9]/g, '').slice(0, 3);
  if (prefix && (PACK_DESTINATION_OPTIONS as readonly string[]).includes(prefix)) {
    return prefix as PackDestination;
  }
  return '';
}
