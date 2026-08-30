import { supabase } from './supabase';
import LoggerService from './LoggerService';
import { MERCHANT_ORDER_STATUS } from '../constants/merchantOrderStatus';

const CHUNK = 40;

async function updatePackagesByIds(
  ids: string[],
  patch: Record<string, unknown>,
): Promise<{ ok: number; failed: number }> {
  const unique = Array.from(new Set(ids.map((id) => String(id || '').trim()).filter(Boolean)));
  let ok = 0;
  let failed = 0;
  for (let i = 0; i < unique.length; i += CHUNK) {
    const part = unique.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from('packages')
      .update({
        ...patch,
        updated_at: new Date().toISOString(),
      })
      .in('id', part)
      .select('id');
    if (error) {
      LoggerService.error('批量更新订单失败:', error);
      failed += part.length;
    } else {
      ok += data?.length ?? part.length;
    }
  }
  return { ok, failed };
}

export function batchAcceptOrders(ids: string[]) {
  return updatePackagesByIds(ids, { status: MERCHANT_ORDER_STATUS.PACKING });
}

export function batchSettleCodOrders(ids: string[]) {
  return updatePackagesByIds(ids, {
    cod_settled: true,
    cod_settled_at: new Date().toISOString(),
  });
}
