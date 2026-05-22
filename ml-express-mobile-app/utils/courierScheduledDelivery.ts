import type { Package } from '../services/supabase';

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
  // 后台偶发存成字面量 "undefined 10:00"
  let t = s.replace(/\bundefined\b/gi, '').replace(/\s+/g, ' ').trim();
  t = t.replace(/^[,，:：\s]+|[,，:：\s]+$/g, '').trim();
  return t || '';
}

/**
 * 是否为「定时达」类订单（库中可能存短码「定时达」或带说明的长文案）。
 */
export function isScheduledDeliverySpeed(speed?: string | null): boolean {
  if (!speed || typeof speed !== 'string') return false;
  const s = speed.trim();
  if (s === '定时达') return true;
  if (s.includes('定时达')) return true;
  if (/scheduled\s*delivery/i.test(s)) return true;
  if (/customer.*requested.*time/i.test(s)) return true;
  return false;
}

/**
 * 卡片/列表展示：去掉全角或半角括号内的说明摘要。
 * 例：「准时达（订单后1小时送达）」→「准时达」；「定时达（客户要求的时间送达）」→「定时达」。
 * 逻辑判断请仍使用原始 `delivery_speed`（如 isScheduledDeliverySpeed）。
 */
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

/**
 * 客户要求送达的日期与时间：`scheduled_delivery_time` 优先，`description` 内方括号兜底。
 */
export function getCourierScheduledDeliveryDisplay(
  pkg: Pick<Package, 'scheduled_delivery_time' | 'description'>,
): string {
  const raw = normalizeScheduledRaw(pkg.scheduled_delivery_time as unknown);
  if (raw) return raw;
  const desc = pkg.description || '';
  const bracket = desc.match(
    /\[(?:指定时间|预约时间|定时配送|配送时间|Scheduled|Delivery time)\s*[:：]\s*(.+?)\]/i,
  );
  if (bracket?.[1]) return bracket[1].trim();
  return '';
}
