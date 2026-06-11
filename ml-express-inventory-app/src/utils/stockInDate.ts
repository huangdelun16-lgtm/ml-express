const YANGON = 'Asia/Yangon';

/** 缅甸当地今天的日期（用于入库日期默认值） */
export function todayInMyanmar(): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: YANGON,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '01';
  return new Date(`${get('year')}-${get('month')}-${get('day')}T12:00:00+06:30`);
}

export function formatInboundDateLabel(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: YANGON,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(date);
}

export function formatInboundDateYmd(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: YANGON,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** 将入库日期与当前缅甸时间合并为 ISO 时间戳 */
export function inboundDateToIso(date: Date): string {
  const ymd = formatInboundDateYmd(date);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: YANGON,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${ymd}T${get('hour')}:${get('minute')}:${get('second')}.000+06:30`;
}
