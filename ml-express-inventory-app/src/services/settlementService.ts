import type { InventoryStoreSession } from './authService';
import { ensureInventoryCloudAuth } from './authService';
import { svc } from '../errors/serviceError';
import { supabase } from './supabase';
import { normalizeDestinationCode } from '../utils/destinationCode';
import {
  buildSettlementSnapshot,
  resolveFinancePeriod,
  type FinancePeriodKind,
  type FinancePeriodRange,
  type SettlementSnapshot,
} from '../utils/yangonFinancePeriod';
import type { FinanceLedgerEntry, FinanceLedgerSummary } from '../types/financeLedger';

export type StationSettlementRow = {
  id: string;
  period_type: 'day' | 'month';
  period_start: string;
  period_end: string;
  store_id: string;
  store_code: string;
  hub_code: string;
  status: 'submitted' | 'confirmed' | 'rejected';
  snapshot: SettlementSnapshot;
  submitted_by: string;
  submitted_at: string;
  confirmed_by: string;
  confirmed_at?: string | null;
  rejected_reason: string;
  note: string;
};

function code(value: string): string {
  return value.trim().toUpperCase();
}

async function scopedStore(
  requested: InventoryStoreSession,
  hubCode: string,
): Promise<{ store: InventoryStoreSession; hub: string }> {
  const authenticated = await ensureInventoryCloudAuth();
  const hub = normalizeDestinationCode(hubCode);
  const authHub = normalizeDestinationCode(authenticated.hubCode || authenticated.region);
  if (
    requested.id !== authenticated.id ||
    code(requested.storeCode) !== code(authenticated.storeCode) ||
    !hub ||
    hub !== authHub
  ) {
    throw svc('financeScopeMismatch');
  }
  return { store: authenticated, hub };
}

export async function fetchStationSettlement(
  requested: InventoryStoreSession,
  hubCode: string,
  kind: FinancePeriodKind,
  range: FinancePeriodRange,
): Promise<StationSettlementRow | null> {
  const { store } = await scopedStore(requested, hubCode);
  const { data, error } = await supabase
    .from('inventory_station_settlements')
    .select(
      'id, period_type, period_start, period_end, store_id, store_code, hub_code, status, snapshot, submitted_by, submitted_at, confirmed_by, confirmed_at, rejected_reason, note',
    )
    .eq('store_id', store.id)
    .eq('period_type', kind)
    .eq('period_start', range.periodStart)
    .maybeSingle();
  if (error) {
    if (/does not exist|schema cache/i.test(error.message || '')) return null;
    throw new Error(error.message);
  }
  return (data as StationSettlementRow | null) ?? null;
}

export async function submitStationSettlement(params: {
  store: InventoryStoreSession;
  hubCode: string;
  kind: 'day' | 'month';
  operatorName: string;
  summary: FinanceLedgerSummary;
  entries: FinanceLedgerEntry[];
}): Promise<StationSettlementRow> {
  const { store, hub } = await scopedStore(params.store, params.hubCode);
  const range = resolveFinancePeriod(params.kind);
  if (params.kind !== 'day' && params.kind !== 'month') {
    throw svc('settlementPeriodInvalid');
  }
  const existing = await fetchStationSettlement(store, hub, params.kind, range);
  if (existing?.status === 'submitted') throw svc('settlementAlreadySubmitted');
  if (existing?.status === 'confirmed') throw svc('settlementAlreadyConfirmed');

  const snapshot = buildSettlementSnapshot(
    {
      ...params.summary,
      agencyRemittedTotal: params.summary.agencyRemittedTotal ?? 0,
    },
    params.entries,
  );
  const now = new Date().toISOString();
  const payload = {
    period_type: params.kind,
    period_start: range.periodStart,
    period_end: range.periodEnd,
    store_id: store.id,
    store_code: code(store.storeCode),
    hub_code: hub,
    status: 'submitted' as const,
    snapshot,
    submitted_by: params.operatorName.trim().slice(0, 120),
    submitted_at: now,
    confirmed_by: '',
    confirmed_at: null,
    rejected_reason: '',
    updated_at: now,
  };

  if (existing?.id) {
    const { data, error } = await supabase
      .from('inventory_station_settlements')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as StationSettlementRow;
  }

  const { data, error } = await supabase
    .from('inventory_station_settlements')
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as StationSettlementRow;
}

export function isPeriodReadOnly(row: StationSettlementRow | null | undefined): boolean {
  return row?.status === 'submitted' || row?.status === 'confirmed';
}
