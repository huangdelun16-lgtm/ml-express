import { isSupabaseConfigured, supabase } from './supabase';
import type { ExportCostLedgerSource } from '../utils/exportCostLedger';

export type ExportLegDestination = 'MSE' | 'LSO';

export type SavedExportCost = {
  subjectKind: 'single' | 'package';
  subjectKey: string;
  legDestination: ExportLegDestination;
  weightKg: number;
  unitPriceCny: number;
  totalCny: number;
  totalMmk: number;
  payCurrency: 'CNY' | 'MMK';
  mmkPerCny: number | null;
  tripNumber: string;
};

export type ExportCostDraft = {
  subjectKind: 'single' | 'package';
  subjectKey: string;
  displayBarcode: string;
  customerName: string;
  finalDestination: string;
  legDestination: ExportLegDestination;
  weightKg: number;
  unitPriceCny: number;
  payCurrency: 'CNY' | 'MMK';
  mmkPerCny: number | null;
  tripNumber: string;
  createdBy: string;
};

type CostRow = {
  subject_kind?: string;
  subject_key?: string;
  leg_destination?: string;
  weight_kg?: number | string;
  unit_price_cny?: number | string;
  total_cny?: number | string;
  total_mmk?: number | string;
  pay_currency?: string;
  fx_mmk_per_cny?: number | string | null;
  trip_number?: string;
  id?: string;
  display_barcode?: string;
  customer_name?: string;
  created_at?: string;
};

function asCost(row: CostRow | null | undefined): SavedExportCost | null {
  const kind = row?.subject_kind === 'package' ? 'package' : row?.subject_kind === 'single' ? 'single' : '';
  const key = String(row?.subject_key || '').trim();
  const dest = String(row?.leg_destination || '').trim().toUpperCase();
  if (!kind || !key || (dest !== 'MSE' && dest !== 'LSO')) return null;
  return {
    subjectKind: kind,
    subjectKey: key,
    legDestination: dest,
    weightKg: Number(row?.weight_kg) || 0,
    unitPriceCny: Number(row?.unit_price_cny) || 0,
    totalCny: Number(row?.total_cny) || 0,
    totalMmk: Number(row?.total_mmk) || 0,
    payCurrency: String(row?.pay_currency || '').toUpperCase() === 'MMK' ? 'MMK' : 'CNY',
    mmkPerCny: Number(row?.fx_mmk_per_cny) > 0 ? Number(row?.fx_mmk_per_cny) : null,
    tripNumber: String(row?.trip_number || '').trim().toUpperCase(),
  };
}

export function exportCostKey(kind: 'single' | 'package', subjectKey: string): string {
  const key = kind === 'package' ? subjectKey.trim().toUpperCase() : subjectKey.trim();
  return `${kind}:${key}`;
}

export async function listExportCosts(): Promise<SavedExportCost[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase.rpc('inventory_list_export_costs');
  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  return rows.map((row) => asCost(row as CostRow)).filter((row): row is SavedExportCost => Boolean(row));
}

export async function addExportCost(draft: ExportCostDraft): Promise<SavedExportCost> {
  if (!isSupabaseConfigured()) throw new Error('supabase is not configured');
  const { data, error } = await supabase.rpc('inventory_add_export_cost', {
    p_subject_kind: draft.subjectKind,
    p_subject_key: draft.subjectKey,
    p_display_barcode: draft.displayBarcode,
    p_customer_name: draft.customerName,
    p_final_destination: draft.finalDestination,
    p_leg_destination: draft.legDestination,
    p_weight_kg: draft.weightKg,
    p_unit_price_cny: draft.unitPriceCny,
    p_pay_currency: draft.payCurrency,
    p_mmk_per_cny: draft.payCurrency === 'MMK' ? draft.mmkPerCny : null,
    p_trip_number: draft.tripNumber,
    p_created_by: draft.createdBy,
  });
  if (error) throw error;
  const saved = asCost(data as CostRow);
  if (!saved) throw new Error('export cost missing');
  return saved;
}

export async function listExportCostLedgerSources(): Promise<ExportCostLedgerSource[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase.rpc('inventory_list_export_costs');
  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  const sources: ExportCostLedgerSource[] = [];
  for (const raw of rows) {
    const row = raw as CostRow;
    const cost = asCost(row);
    const id = String(row.id || '').trim();
    if (!cost || !id) continue;
    sources.push({
      id,
      displayBarcode: String(row.display_barcode || '').trim(),
      customerName: String(row.customer_name || '').trim(),
      legDestination: cost.legDestination,
      weightKg: cost.weightKg,
      unitPriceCny: cost.unitPriceCny,
      totalCny: cost.totalCny,
      totalMmk: cost.totalMmk,
      payCurrency: cost.payCurrency,
      tripNumber: cost.tripNumber,
      createdAt: String(row.created_at || '').trim(),
    });
  }
  return sources;
}

export async function listLoadedPackTrips(): Promise<Array<{ barcode: string; trip: string; weightKg: number }>> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('inventory_pkg_tracking')
    .select('pack_barcode, trip_number, total_weight, truck_loaded_at')
    .not('truck_loaded_at', 'is', null)
    .limit(1000);
  if (error) throw error;
  const rows: Array<{ barcode: string; trip: string; weightKg: number }> = [];
  for (const row of data || []) {
    const barcode = String(row.pack_barcode || '').trim();
    const trip = String(row.trip_number || '').trim();
    if (!barcode || !trip) continue;
    rows.push({
      barcode,
      trip,
      weightKg: parseWeightKg(String(row.total_weight || '')),
    });
  }
  return rows;
}
