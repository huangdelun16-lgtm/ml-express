/**
 * 配送 SLA 倒计时：准时达 60min、急送达 30min、Eco Way 24h、定时达 → scheduled_delivery_time。
 * 纯逻辑，无 DOM / React Native 依赖。
 */

export type DeliveryCountdownUrgency = 'ok' | 'warning' | 'critical' | 'overdue' | 'none';

export type DeliveryCountdownPhase = 'remaining' | 'overdue' | 'unavailable';

export interface DeliveryCountdownResult {
  visible: boolean;
  phase: DeliveryCountdownPhase;
  /** MM:SS 或 H:MM:SS */
  displayTime: string;
  labelZh: string;
  labelEn: string;
  labelMy: string;
  urgency: DeliveryCountdownUrgency;
  totalMs?: number;
  remainingMs?: number;
  deadline?: Date;
}

export interface DeliveryCountdownPackageInput {
  delivery_speed?: string | null;
  created_at?: string | null;
  create_time?: string | null;
  scheduled_delivery_time?: string | null;
  status?: string | null;
}

const TERMINAL_STATUS_MARKERS = [
  '已送达',
  '已取消',
  '已完成',
  'Delivered',
  'Cancelled',
  'Completed',
];

function normalizeScheduledRaw(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
    const o = value as Record<string, unknown>;
    const date = o.date ?? o.scheduled_date ?? o.delivery_date ?? o.day;
    const time = o.time ?? o.scheduled_time ?? o.hour;
    const parts: string[] = [];
    if (date != null && String(date).trim() && String(date) !== 'undefined') {
      parts.push(String(date).trim());
    }
    if (time != null && String(time).trim() && String(time) !== 'undefined') {
      parts.push(String(time).trim());
    }
    if (parts.length) return parts.join(' ');
  }
  const s = typeof value === 'string' ? value.trim() : String(value).trim();
  if (!s || /^null$/i.test(s) || /^undefined$/i.test(s)) return '';
  let t = s.replace(/\bundefined\b/gi, '').replace(/\s+/g, ' ').trim();
  t = t.replace(/^[,，:：\s]+|[,，:：\s]+$/g, '').trim();
  return t || '';
}

/** 展示用短标签（去掉括号说明） */
export function getDeliverySpeedShortLabel(speed?: string | null): string {
  if (!speed || typeof speed !== 'string') return '';
  const t = speed.trim();
  if (!t) return '';
  const iFull = t.indexOf('（');
  if (iFull >= 0) {
    const head = t.slice(0, iFull).trim();
    return head || t;
  }
  const iHalf = t.indexOf('(');
  if (iHalf >= 0) {
    const head = t.slice(0, iHalf).trim();
    return head || t;
  }
  return t;
}

export function isScheduledDeliverySpeed(speed?: string | null): boolean {
  if (!speed || typeof speed !== 'string') return false;
  const s = speed.trim();
  if (s === '定时达') return true;
  if (s.includes('定时达')) return true;
  if (/scheduled\s*delivery/i.test(s)) return true;
  return false;
}

export function shouldShowDeliveryCountdown(status?: string | null): boolean {
  if (status == null || !String(status).trim()) return true;
  const s = String(status).trim();
  return !TERMINAL_STATUS_MARKERS.some((m) => s.includes(m));
}

export function parseOrderCreatedAt(
  created_at?: string | null,
  create_time?: string | null,
): Date | null {
  if (created_at) {
    const d = new Date(created_at);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (create_time) {
    const d = new Date(create_time);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

function getSlaMinutes(speed?: string | null): number {
  const full = (speed || '').trim();
  const short = getDeliverySpeedShortLabel(full);
  if (short.includes('急送达') || full.includes('急送达')) return 30;
  if (/eco\s*way/i.test(short) || /eco\s*way/i.test(full)) return 24 * 60;
  if (isScheduledDeliverySpeed(full)) return 0;
  if (short.includes('准时达') || full.includes('准时达')) return 60;
  return 60;
}

/**
 * 解析客户填写的预约时间（如「今天 18:00」「Today 18:00」）。
 */
export function parseScheduledDeliveryTime(
  raw: unknown,
  orderCreated: Date,
  referenceNow: Date = new Date(),
): Date | null {
  const text = normalizeScheduledRaw(raw);
  if (!text) return null;

  if (/\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(text)) {
    const iso = new Date(text.replace(/\//g, '-'));
    if (!Number.isNaN(iso.getTime())) return iso;
  }

  const timeMatch = text.match(/(\d{1,2})[:：](\d{2})/);
  if (!timeMatch) return null;

  const hour = parseInt(timeMatch[1], 10);
  const minute = parseInt(timeMatch[2], 10);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  let dayOffset = 0;
  if (/明天|明日|tomorrow|မနက်ဖြန/i.test(text)) {
    dayOffset = 1;
  } else if (/后天|day after/i.test(text)) {
    dayOffset = 2;
  } else if (/今天|今日|today|ယနေ့/i.test(text)) {
    dayOffset = 0;
  }

  const base = new Date(orderCreated);
  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() + dayOffset);
  base.setHours(hour, minute, 0, 0);

  if (
    base.getTime() < orderCreated.getTime() &&
    dayOffset === 0 &&
    !/今天|今日|today|ယနေ့/i.test(text)
  ) {
    base.setDate(base.getDate() + 1);
  }

  if (base.getTime() < referenceNow.getTime() - 48 * 60 * 60 * 1000) {
    return null;
  }

  return base;
}

export function resolveDeliveryDeadline(
  input: DeliveryCountdownPackageInput,
  now: Date = new Date(),
): Date | null {
  const created = parseOrderCreatedAt(input.created_at, input.create_time);
  if (!created) return null;

  const speed = input.delivery_speed;
  if (isScheduledDeliverySpeed(speed)) {
    return parseScheduledDeliveryTime(input.scheduled_delivery_time, created, now);
  }

  const minutes = getSlaMinutes(speed);
  if (minutes <= 0) return null;
  return new Date(created.getTime() + minutes * 60 * 1000);
}

export function formatCountdownDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function computeDeliveryCountdown(
  input: DeliveryCountdownPackageInput,
  now: Date = new Date(),
): DeliveryCountdownResult {
  const unavailable: DeliveryCountdownResult = {
    visible: false,
    phase: 'unavailable',
    displayTime: '',
    labelZh: '',
    labelEn: '',
    labelMy: '',
    urgency: 'none',
  };

  if (!shouldShowDeliveryCountdown(input.status)) return unavailable;

  const created = parseOrderCreatedAt(input.created_at, input.create_time);
  const deadline = resolveDeliveryDeadline(input, now);
  if (!created || !deadline) return unavailable;

  const totalMs = Math.max(deadline.getTime() - created.getTime(), 1);
  const remainingMs = deadline.getTime() - now.getTime();
  const absMs = Math.abs(remainingMs);
  const displayTime = formatCountdownDuration(absMs);

  if (remainingMs >= 0) {
    const ratio = remainingMs / totalMs;
    let urgency: DeliveryCountdownUrgency = 'ok';
    if (ratio <= 0.2) urgency = 'critical';
    else if (ratio <= 0.5) urgency = 'warning';

    return {
      visible: true,
      phase: 'remaining',
      displayTime,
      labelZh: '剩余',
      labelEn: 'Left',
      labelMy: 'ကျန်',
      urgency,
      totalMs,
      remainingMs,
      deadline,
    };
  }

  return {
    visible: true,
    phase: 'overdue',
    displayTime,
    labelZh: '超时',
    labelEn: 'Overdue',
    labelMy: 'အချိန်ကျော်',
    urgency: 'overdue',
    totalMs,
    remainingMs,
    deadline,
  };
}
