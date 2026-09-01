import { supabase } from './supabase';
import LoggerService from './LoggerService';
import {
  isMissingPackingStartedAtColumn,
  packingAcceptFields,
} from './_shared/packingCountdown';

const CHUNK = 40;

export type CodSettleActor = {
  id?: string;
  name?: string;
};

export type BatchSettleResult = {
  ok: number;
  failed: number;
  skipped: number;
};

function isMissingCodSettledByColumn(error: { message?: string; code?: string } | null): boolean {
  const message = String(error?.message || '');
  return (
    error?.code === 'PGRST204' ||
    error?.code === '42703' ||
    /cod_settled_by/i.test(message)
  );
}

function stripCodSettledByFields(patch: Record<string, unknown>): Record<string, unknown> {
  const next = { ...patch };
  delete next.cod_settled_by;
  delete next.cod_settled_by_id;
  delete next.cod_settled_by_name;
  return next;
}

async function updatePackagesByIds(
  ids: string[],
  patch: Record<string, unknown>,
): Promise<{ ok: number; failed: number }> {
  const unique = Array.from(new Set(ids.map((id) => String(id || '').trim()).filter(Boolean)));
  let ok = 0;
  let failed = 0;
  for (let i = 0; i < unique.length; i += CHUNK) {
    const part = unique.slice(i, i + CHUNK);
    const body = {
      ...patch,
      updated_at: new Date().toISOString(),
    };
    let { data, error } = await supabase.from('packages').update(body).in('id', part).select('id');
    if (error && isMissingPackingStartedAtColumn(error) && 'packing_started_at' in patch) {
      const retryPatch = { ...patch };
      delete retryPatch.packing_started_at;
      const retry = await supabase
        .from('packages')
        .update({
          ...retryPatch,
          updated_at: new Date().toISOString(),
        })
        .in('id', part)
        .select('id');
      data = retry.data;
      error = retry.error;
    }
    if (error) {
      LoggerService.error('批量更新订单失败:', error);
      failed += part.length;
    } else {
      ok += data?.length ?? part.length;
    }
  }
  return { ok, failed };
}

async function updateUnsettledCodByIds(
  ids: string[],
  patch: Record<string, unknown>,
): Promise<BatchSettleResult> {
  const unique = Array.from(new Set(ids.map((id) => String(id || '').trim()).filter(Boolean)));
  let ok = 0;
  let failed = 0;
  let useActor = true;

  for (let i = 0; i < unique.length; i += CHUNK) {
    const part = unique.slice(i, i + CHUNK);
    const body = {
      ...(useActor ? patch : stripCodSettledByFields(patch)),
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from('packages')
      .update(body)
      .in('id', part)
      .or('cod_settled.eq.false,cod_settled.is.null')
      .select('id');

    if (error && useActor && isMissingCodSettledByColumn(error)) {
      useActor = false;
      const retry = await supabase
        .from('packages')
        .update({
          ...stripCodSettledByFields(patch),
          updated_at: new Date().toISOString(),
        })
        .in('id', part)
        .or('cod_settled.eq.false,cod_settled.is.null')
        .select('id');
      if (retry.error) {
        LoggerService.error('批量结清代收款失败:', retry.error);
        failed += part.length;
      } else {
        ok += retry.data?.length ?? 0;
      }
      continue;
    }

    if (error) {
      LoggerService.error('批量结清代收款失败:', error);
      failed += part.length;
    } else {
      ok += data?.length ?? 0;
    }
  }

  return {
    ok,
    failed,
    skipped: Math.max(0, unique.length - ok - failed),
  };
}

export function batchAcceptOrders(ids: string[]) {
  return updatePackagesByIds(ids, packingAcceptFields());
}

export async function acceptOrderToPacking(id: string): Promise<boolean> {
  const { ok } = await batchAcceptOrders([id]);
  return ok > 0;
}

/** 只更新未结清；已由后台结清的单不会被后写覆盖 */
export function batchSettleCodOrders(ids: string[], actor?: CodSettleActor) {
  const now = new Date().toISOString();
  return updateUnsettledCodByIds(ids, {
    cod_settled: true,
    cod_settled_at: now,
    cod_settled_by: 'merchant',
    cod_settled_by_id: String(actor?.id || '').trim(),
    cod_settled_by_name: String(actor?.name || '').trim(),
  });
}
