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
    throw new Error('未配置云端，无法登记其它开销');
  }

  const amount = Math.round(Number(draft.amount));
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('金额须大于 0');
  }

  const entryDate = draft.entry_date.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
    throw new Error('日期格式无效');
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

  if (error) throw new Error(error.message || '保存失败');
}
