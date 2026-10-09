import { isSupabaseConfigured, supabase } from './supabase';
import type { FrozenSignedInvoiceDocument } from '../utils/frozenSignedInvoice';
import {
  normalizeSignedInvoiceRow,
  type SignedInvoiceListItem,
} from '../utils/signedInvoiceArchiveList';

export type { SignedInvoiceListItem };

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

export const SIGNED_INVOICE_PAGE = 40;

export async function listSignedInvoices(offset = 0): Promise<SignedInvoiceListItem[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase.rpc('inventory_list_signed_invoices', {
    p_offset: Math.max(0, Math.floor(offset)),
  });
  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  return rows
    .map((row) => normalizeSignedInvoiceRow(row))
    .filter((row): row is SignedInvoiceListItem => Boolean(row));
}
