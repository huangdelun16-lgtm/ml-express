import { isSupabaseConfigured, supabase } from './supabase';

export type CrossBorderCustomerLookup = {
  customer_code: string;
  customer_name: string;
  phone: string;
  delivery_area_code: string;
  delivery_region_id?: string;
  notify_method?: string;
  notify_account?: string;
};

function parseLookupRow(data: unknown): CrossBorderCustomerLookup | null {
  if (!data || typeof data !== 'object') return null;
  const row = data as Record<string, unknown>;
  const code = String(row.customer_code ?? '').trim().toUpperCase();
  if (!code) return null;
  return {
    customer_code: code,
    customer_name: String(row.customer_name ?? '').trim(),
    phone: String(row.phone ?? '').trim(),
    delivery_area_code: String(row.delivery_area_code ?? '').trim().toUpperCase(),
    delivery_region_id: String(row.delivery_region_id ?? '').trim() || undefined,
    notify_method: String(row.notify_method ?? '').trim() || undefined,
    notify_account: String(row.notify_account ?? '').trim() || undefined,
  };
}

/** 按 Admin 登记的客户编码查询姓名与电话 */
export async function lookupCrossBorderCustomer(
  code: string,
): Promise<CrossBorderCustomerLookup | null> {
  const normalized = code.trim().toUpperCase();
  if (!normalized || !isSupabaseConfigured()) return null;

  const { data, error } = await supabase.rpc('lookup_cross_border_customer', {
    p_code: normalized,
  });
  if (error || !data) return null;
  return parseLookupRow(data);
}
