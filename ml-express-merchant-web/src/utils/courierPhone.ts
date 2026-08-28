import { supabase } from '../services/supabase';
import LoggerService from '../services/LoggerService';
import {
  isCourierUnassigned,
  sanitizeDialNumber,
} from '../services/_shared/dialPhone';

const phoneCache = new Map<string, string | null>();

export async function lookupCourierDialNumber(
  courierNameOrId?: string | null,
): Promise<string | null> {
  const raw = String(courierNameOrId || '').trim();
  if (isCourierUnassigned(raw)) return null;
  if (phoneCache.has(raw)) return phoneCache.get(raw) || null;

  const pick = (phone?: string | null) => {
    const dial = sanitizeDialNumber(phone);
    return dial || null;
  };

  try {
    const { data: byName } = await supabase
      .from('couriers')
      .select('phone')
      .eq('name', raw)
      .limit(1);
    const fromName = pick(byName?.[0]?.phone);
    if (fromName) {
      phoneCache.set(raw, fromName);
      return fromName;
    }

    const { data: byId } = await supabase
      .from('couriers')
      .select('phone')
      .eq('id', raw)
      .limit(1);
    const fromId = pick(byId?.[0]?.phone);
    phoneCache.set(raw, fromId);
    return fromId;
  } catch (error) {
    LoggerService.error('查询骑手电话失败', error);
    return null;
  }
}

export async function dialCourierByAssignment(
  courierNameOrId?: string | null,
): Promise<'unassigned' | 'no-phone' | 'dialed'> {
  if (isCourierUnassigned(courierNameOrId)) return 'unassigned';
  const phone = await lookupCourierDialNumber(courierNameOrId);
  if (!phone) return 'no-phone';
  window.location.href = `tel:${phone}`;
  return 'dialed';
}
