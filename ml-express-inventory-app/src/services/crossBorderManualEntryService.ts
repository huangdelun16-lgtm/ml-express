import { ensureInventoryCloudAuth, type InventoryStoreSession } from './authService';
import { svc } from '../errors/serviceError';
import type { FinanceManualRow } from '../utils/financeLedgerAggregate';
import { normalizeDestinationCode } from '../utils/destinationCode';
import { supabase } from './supabase';

export type CrossBorderManualEntryKind = 'income' | 'expense';

export type CrossBorderManualEntryDraft = {
  entry_date: string;
  kind: CrossBorderManualEntryKind;
  amount: number;
  category: string;
  note: string;
  createdBy: string;
};

function code(value: string): string {
  return value.trim().toUpperCase();
}

async function currentScope(
  requestedStore: InventoryStoreSession,
  requestedHubCode: string,
): Promise<{ store: InventoryStoreSession; hubCode: string }> {
  const authenticated = await ensureInventoryCloudAuth();
  const hubCode = normalizeDestinationCode(requestedHubCode);
  const authHub = normalizeDestinationCode(authenticated.hubCode || authenticated.region);
  if (
    requestedStore.id !== authenticated.id ||
    code(requestedStore.storeCode) !== code(authenticated.storeCode) ||
    !hubCode ||
    hubCode !== authHub
  ) {
    throw svc('financeScopeMismatch');
  }
  return { store: authenticated, hubCode };
}

export async function listCrossBorderManualEntries(
  requestedStore: InventoryStoreSession,
  requestedHubCode: string,
): Promise<FinanceManualRow[]> {
  const { store, hubCode } = await currentScope(requestedStore, requestedHubCode);
  const pageSize = 250;
  const rows: FinanceManualRow[] = [];
  for (let page = 0; page < 100; page += 1) {
    const from = page * pageSize;
    const { data, error } = await supabase
      .from('cross_border_manual_entries')
      .select(
        'id, entry_date, kind, amount, category, note, created_by, created_at',
      )
      .eq('store_id', store.id)
      .eq('store_code', code(store.storeCode))
      .eq('hub_code', hubCode)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const pageRows = (data || []) as FinanceManualRow[];
    rows.push(...pageRows);
    if (pageRows.length < pageSize) return rows;
  }
  throw svc('listTooLarge');
}

export async function createCrossBorderManualEntry(
  requestedStore: InventoryStoreSession,
  requestedHubCode: string,
  draft: CrossBorderManualEntryDraft,
): Promise<void> {
  const { store, hubCode } = await currentScope(requestedStore, requestedHubCode);

  const amount = Math.round(Number(draft.amount));
  if (!Number.isFinite(amount) || amount <= 0) {
    throw svc('amountMustBePositive');
  }

  const entryDate = draft.entry_date.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
    throw svc('invalidDateFormat');
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from('cross_border_manual_entries').insert({
    entry_date: entryDate,
    kind: draft.kind,
    amount,
    currency: 'MMK',
    category: draft.category.trim().slice(0, 120),
    note: draft.note.trim().slice(0, 500),
    created_by: draft.createdBy.trim().slice(0, 120),
    store_id: store.id,
    store_code: code(store.storeCode),
    hub_code: hubCode,
    updated_at: now,
  });

  if (error) throw error.message ? new Error(error.message) : svc('saveFailed');
}

export async function deleteCrossBorderManualEntry(
  requestedStore: InventoryStoreSession,
  requestedHubCode: string,
  entryId: string,
): Promise<void> {
  const { store, hubCode } = await currentScope(requestedStore, requestedHubCode);
  const id = entryId.trim();
  if (!id) throw svc('saveFailed');
  const { error } = await supabase
    .from('cross_border_manual_entries')
    .delete()
    .eq('id', id)
    .eq('store_id', store.id)
    .eq('store_code', code(store.storeCode))
    .eq('hub_code', hubCode);
  if (error) throw new Error(error.message);
}
