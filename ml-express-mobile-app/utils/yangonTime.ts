/** 缅甸仰光固定 UTC+6:30，不随夏令时变化。 */
const YANGON_OFFSET_MS = (6 * 60 + 30) * 60 * 1000;

function shifted(input: string | Date | null | undefined): Date | null {
  if (input == null || input === '') return null;
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getTime() + YANGON_OFFSET_MS);
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** 仰光日历日，形如 2026-11-27。无效时间返回空字符串。 */
export function yangonDayKey(input: string | Date | null | undefined): string {
  const date = shifted(input);
  if (!date) return '';
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** 给骑手看的时间。同年省略年份，例如 11-27 21:25。 */
export function formatYangonStamp(input: string | null | undefined, now: Date = new Date()): string {
  const date = shifted(input);
  if (!date) return '';
  const today = shifted(now);
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hour = pad(date.getUTCHours());
  const minute = pad(date.getUTCMinutes());
  const sameYear = today != null && year === today.getUTCFullYear();
  return sameYear
    ? `${month}-${day} ${hour}:${minute}`
    : `${year}-${month}-${day} ${hour}:${minute}`;
}
