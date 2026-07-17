import type { InventoryStoreSession } from './authService';
import { isSupabaseConfigured, supabase } from './supabase';
import { resolveTripNumberPrefix } from '../utils/tripNumber';

/** 预览下一车次（提交前展示，可能与最终分配差 1 若并发装车） */
export async function peekNextTripNumber(store: InventoryStoreSession): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const prefix = resolveTripNumberPrefix(store);
  const { data, error } = await supabase.rpc('inventory_peek_trip_number', {
    p_prefix: prefix,
  });
  if (error) return null;
  const value = String(data ?? '').trim().toUpperCase();
  return value || null;
}
