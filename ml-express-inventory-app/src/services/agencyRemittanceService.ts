import type { InventoryStoreSession } from './authService';
import { ensureInventoryCloudAuth } from './authService';
import { svc } from '../errors/serviceError';
import { supabase } from './supabase';
import { normalizeDestinationCode } from '../utils/destinationCode';
import { yangonTodayYmd } from '../utils/yangonFinancePeriod';

function code(value: string): string {
  return value.trim().toUpperCase();
}

export async function createAgencyRemittance(params: {
  store: InventoryStoreSession;
  hubCode: string;
  toOriginKey: string;
  amount: number;
  note?: string;
  createdBy: string;
  remittedAt?: string;
}): Promise<void> {
  const authenticated = await ensureInventoryCloudAuth();
  const hub = normalizeDestinationCode(params.hubCode);
  const authHub = normalizeDestinationCode(authenticated.hubCode || authenticated.region);
  if (
    params.store.id !== authenticated.id ||
    code(params.store.storeCode) !== code(authenticated.storeCode) ||
    !hub ||
    hub !== authHub
  ) {
    throw svc('financeScopeMismatch');
  }
  const origin = code(params.toOriginKey);
  if (!origin) throw svc('remitOriginRequired');
  const amount = Math.round(Number(params.amount) || 0);
  if (!Number.isFinite(amount) || amount <= 0) throw svc('remitAmountInvalid');

  const { error } = await supabase.from('inventory_agency_remittances').insert({
    from_store_id: authenticated.id,
    from_store_code: code(authenticated.storeCode),
    from_hub_code: hub,
    to_origin_key: origin,
    amount,
    remitted_at: params.remittedAt || yangonTodayYmd(),
    note: String(params.note || '').trim().slice(0, 500),
    created_by: params.createdBy.trim().slice(0, 120),
  });
  if (error) throw new Error(error.message);
}
