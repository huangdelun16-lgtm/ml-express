const WEEKDAY_ZH = ['日', '一', '二', '三', '四', '五', '六'] as const;

export function toIsoDateString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayIsoDate(): string {
  return toIsoDateString(new Date());
}

export function parseIsoDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const d = new Date(`${trimmed}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isValidIsoDate(value: string): boolean {
  return parseIsoDate(value) !== null;
}

export function formatDisplayDate(value: string): string {
  const d = parseIsoDate(value);
  if (!d) return value || '未选择';
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 周${WEEKDAY_ZH[d.getDay()]}`;
}

export function addDaysIsoDate(base: string, days: number): string {
  const d = parseIsoDate(base) ?? new Date();
  d.setDate(d.getDate() + days);
  return toIsoDateString(d);
}

export function offsetFromTodayIsoDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toIsoDateString(d);
}
