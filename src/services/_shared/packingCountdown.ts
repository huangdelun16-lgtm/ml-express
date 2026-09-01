// ⚠️ AUTO-GENERATED from /shared/src — 请勿在此文件直接修改。
// 修改请编辑 /shared/src 下的源文件，并运行 "npm run sync:shared"。

/**
 * 商家打包 SLA：接单进入「打包中」后倒计时。
 * Admin 可为每家店配置 packing_sla_minutes；未配置时回退配送速度默认值
 * （急送达 8 / 准时达 12 / Eco Way 20 / 定时达 15）。
 * 纯逻辑，无 DOM / React Native 依赖。
 */

import {
  formatCountdownDuration,
  getDeliverySpeedShortLabel,
  isScheduledDeliverySpeed,
  parseOrderCreatedAt,
  type DeliveryCountdownPhase,
  type DeliveryCountdownUrgency,
} from './deliveryCountdown';

export const PACKING_STATUS = '打包中';

export const PACKING_SLA_MINUTES = {
  express: 8,
  onTime: 12,
  eco: 20,
  scheduled: 15,
  default: 12,
} as const;

/** Admin 未单独设置时的默认商家打包时限（分钟）。 */
export const DEFAULT_STORE_PACKING_SLA_MINUTES = PACKING_SLA_MINUTES.default;

export const STORE_PACKING_SLA_PRESETS = [8, 12, 15, 20, 30] as const;

export const STORE_PACKING_SLA_MIN = 1;
export const STORE_PACKING_SLA_MAX = 180;

export type PackingCountdownUrgency = DeliveryCountdownUrgency;
export type PackingCountdownPhase = DeliveryCountdownPhase;

export interface PackingCountdownResult {
  visible: boolean;
  phase: PackingCountdownPhase;
  displayTime: string;
  labelZh: string;
  labelEn: string;
  labelMy: string;
  urgency: PackingCountdownUrgency;
  totalMs?: number;
  remainingMs?: number;
  deadline?: Date;
  slaMinutes?: number;
}

export interface PackingCountdownPackageInput {
  status?: string | null;
  delivery_speed?: string | null;
  packing_started_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  create_time?: string | null;
  /** Admin 为该店配置的打包时限（分钟）。有值时优先于配送速度默认值。 */
  packing_sla_minutes?: number | null;
}

export function isPackingStatus(status?: string | null): boolean {
  return String(status || '').trim() === PACKING_STATUS;
}

export function isMissingPackingStartedAtColumn(
  error: { message?: string; code?: string } | null | undefined,
): boolean {
  const message = String(error?.message || '');
  return (
    error?.code === 'PGRST204' ||
    error?.code === '42703' ||
    /packing_started_at/i.test(message)
  );
}

export function packingAcceptFields(): {
  status: typeof PACKING_STATUS;
  packing_started_at: string;
} {
  return {
    status: PACKING_STATUS,
    packing_started_at: new Date().toISOString(),
  };
}

export function getPackingSlaMinutes(speed?: string | null): number {
  const full = (speed || '').trim();
  const short = getDeliverySpeedShortLabel(full);
  if (short.includes('急送达') || full.includes('急送达')) {
    return PACKING_SLA_MINUTES.express;
  }
  if (/eco\s*way/i.test(short) || /eco\s*way/i.test(full)) {
    return PACKING_SLA_MINUTES.eco;
  }
  if (isScheduledDeliverySpeed(full)) return PACKING_SLA_MINUTES.scheduled;
  if (short.includes('准时达') || full.includes('准时达')) {
    return PACKING_SLA_MINUTES.onTime;
  }
  return PACKING_SLA_MINUTES.default;
}

export function normalizeStorePackingSlaMinutes(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value.trim()) : Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(
    STORE_PACKING_SLA_MAX,
    Math.max(STORE_PACKING_SLA_MIN, Math.round(n)),
  );
}

/** 店铺时限优先；未配置时回退到配送速度默认值。 */
export function resolvePackingSlaMinutes(
  storeMinutes?: unknown,
  speed?: string | null,
): number {
  return normalizeStorePackingSlaMinutes(storeMinutes) ?? getPackingSlaMinutes(speed);
}

export function withStorePackingSla<T extends object>(
  item: T,
  storeMinutes?: unknown,
): T & { packing_sla_minutes?: number } {
  const minutes = normalizeStorePackingSlaMinutes(storeMinutes);
  if (minutes == null) return item as T & { packing_sla_minutes?: number };
  return { ...item, packing_sla_minutes: minutes };
}

export function parsePackingStartedAt(
  input: PackingCountdownPackageInput,
): Date | null {
  const started = parseOrderCreatedAt(input.packing_started_at, null);
  if (started) return started;
  if (isPackingStatus(input.status)) {
    const updated = parseOrderCreatedAt(input.updated_at, null);
    if (updated) return updated;
  }
  return parseOrderCreatedAt(input.created_at, input.create_time);
}

export function shouldShowPackingCountdown(status?: string | null): boolean {
  return isPackingStatus(status);
}

const unavailable = (): PackingCountdownResult => ({
  visible: false,
  phase: 'unavailable',
  displayTime: '',
  labelZh: '',
  labelEn: '',
  labelMy: '',
  urgency: 'none',
});

export function computePackingCountdown(
  input: PackingCountdownPackageInput,
  now: Date = new Date(),
): PackingCountdownResult {
  if (!shouldShowPackingCountdown(input.status)) return unavailable();

  const started = parsePackingStartedAt(input);
  if (!started) return unavailable();

  const slaMinutes = resolvePackingSlaMinutes(
    input.packing_sla_minutes,
    input.delivery_speed,
  );
  const deadline = new Date(started.getTime() + slaMinutes * 60 * 1000);
  const totalMs = Math.max(deadline.getTime() - started.getTime(), 1);
  const remainingMs = deadline.getTime() - now.getTime();
  const displayTime = formatCountdownDuration(Math.abs(remainingMs));

  if (remainingMs >= 0) {
    const ratio = remainingMs / totalMs;
    let urgency: PackingCountdownUrgency = 'ok';
    if (ratio <= 0.2) urgency = 'critical';
    else if (ratio <= 0.5) urgency = 'warning';

    return {
      visible: true,
      phase: 'remaining',
      displayTime,
      labelZh: '打包剩余',
      labelEn: 'Pack by',
      labelMy: 'ထုပ်ပိုးရန်ကျန်',
      urgency,
      totalMs,
      remainingMs,
      deadline,
      slaMinutes,
    };
  }

  return {
    visible: true,
    phase: 'overdue',
    displayTime,
    labelZh: '打包超时',
    labelEn: 'Pack overdue',
    labelMy: 'ထုပ်ပိုးကျော်',
    urgency: 'overdue',
    totalMs,
    remainingMs,
    deadline,
    slaMinutes,
  };
}

/** 越小越靠前：超时（负值）→ 即将超时 → 非打包单 */
export function packingSlaSortKey(
  input: PackingCountdownPackageInput,
  now: Date = new Date(),
): number {
  const cd = computePackingCountdown(input, now);
  if (!cd.visible || cd.remainingMs == null) return Number.POSITIVE_INFINITY;
  return cd.remainingMs;
}

export function sortByPackingSla<T extends PackingCountdownPackageInput>(
  orders: T[],
  now: Date = new Date(),
): T[] {
  return [...orders].sort((a, b) => packingSlaSortKey(a, now) - packingSlaSortKey(b, now));
}
