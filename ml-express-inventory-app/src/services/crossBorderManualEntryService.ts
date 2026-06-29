import { svc } from '../errors/serviceError';
import { isSupabaseConfigured, supabase } from './supabase';

export type CrossBorderManualEntryKind = 'income' | 'expense';

export type CrossBorderManualEntryDraft = {
  entry_date: string;
  kind: CrossBorderManualEntryKind;
  amount: number;
  category: string;
  note: string;
  createdBy: string;
};

export async function createCrossBorderManualEntry(
  draft: CrossBorderManualEntryDraft,
): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw svc('cloudNotConfiguredManual');
  }

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
    updated_at: now,
  });

  if (error) throw error.message ? new Error(error.message) : svc('saveFailed');
}
