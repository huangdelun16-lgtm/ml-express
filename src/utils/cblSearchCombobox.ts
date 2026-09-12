import { matchesConsoleQuery } from './crossBorderConsoleSearch';

export type CblSearchOption = {
  id: string;
  label: string;
  detail?: string;
  value: string;
};

export const CBL_SEARCH_COMBO_LIMIT = 40;

export function moveComboActiveIndex(current: number, delta: number, length: number): number {
  if (length <= 0) return -1;
  if (current < 0) return delta > 0 ? 0 : length - 1;
  return (current + delta + length) % length;
}

export function filterComboOptions(
  options: CblSearchOption[],
  query: string,
  limit = CBL_SEARCH_COMBO_LIMIT,
): CblSearchOption[] {
  const q = String(query || '').trim();
  const matched = q
    ? options.filter((option) =>
        matchesConsoleQuery(q, option.label, option.detail, option.value),
      )
    : options;
  return matched.slice(0, limit);
}
