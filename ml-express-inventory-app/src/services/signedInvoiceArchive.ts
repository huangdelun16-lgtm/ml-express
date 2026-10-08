import { isSupabaseConfigured, supabase } from './supabase';
import type { FrozenSignedInvoiceDocument } from '../utils/frozenSignedInvoice';

export async function freezeSignedInvoice(input: {
  document: FrozenSignedInvoiceDocument;
  itemIds: string[];
  signedBy: string;
}): Promise<string> {
  if (!isSupabaseConfigured()) {
    throw new Error('supabase is not configured');
  }
  const { data, error } = await supabase.rpc('inventory_freeze_signed_invoice', {
    p_document: input.document,
    p_item_ids: input.itemIds,
    p_signed_by: input.signedBy,
  });
  if (error) throw error;
  const invoiceNo = String((data as { invoice_no?: string } | null)?.invoice_no || '').trim();
  if (!invoiceNo) throw new Error('invoice number missing');
  return invoiceNo;
}
