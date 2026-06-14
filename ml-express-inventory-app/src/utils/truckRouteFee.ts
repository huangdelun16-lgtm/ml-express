import { normalizePackDestination } from '../constants/destinationOptions';
import { getDatabase } from '../services/database';
import { isSupabaseConfigured, supabase } from '../services/supabase';

function buildSettingsKey(origin: string, destination: string): string {
  return `inventory.truck_fee.${origin.trim().toUpperCase()}.${destination.trim().toUpperCase()}`;
}

function parseFeeValue(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (raw && typeof raw === 'object' && raw !== null && 'value' in (raw as object)) {
    return parseFeeValue((raw as { value: unknown }).value);
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    try {
      return parseFeeValue(JSON.parse(trimmed));
    } catch {
      const n = Number(trimmed.replace(/[^\d.]/g, ''));
      return Number.isFinite(n) ? n : null;
    }
  }
  return null;
}

function originCandidates(originLabel: string): string[] {
  const raw = originLabel.trim().toUpperCase();
  const codes = new Set<string>();
  if (raw) codes.add(raw);
  const normalized = normalizePackDestination(raw);
  if (normalized) codes.add(normalized);
  if (raw.length >= 3) codes.add(raw.slice(0, 3));
  return [...codes];
}

export function parseTransportFeeFromLoadNote(note: string): string {
  const m = note.match(/车费\s+([\d.]+)\s*MMK/i);
  return m?.[1]?.trim() ?? '';
}

export function formatTruckRouteLabel(originLabel: string, destination: string): string {
  const from = originLabel.trim().toUpperCase();
  const to = destination.trim().toUpperCase();
  if (!from || !to) return '';
  return `${from} → ${to}`;
}

async function readLocalFee(origins: string[], dest: string): Promise<number | null> {
  const db = await getDatabase();
  for (const origin of origins) {
    const row = await db.getFirstAsync<{ fee: string }>(
      `SELECT fee FROM truck_route_fees WHERE origin_code = ? AND destination_code = ?`,
      [origin, dest],
    );
    if (!row?.fee?.trim()) continue;
    const fee = parseFeeValue(row.fee);
    if (fee != null) return fee;
  }
  return null;
}

/** 查询发站至目的地的装车车费（本地缓存 → 云端 system_settings） */
export async function fetchTruckRouteFee(
  originLabel: string,
  destination: string,
): Promise<number | null> {
  const dest = destination.trim().toUpperCase();
  if (!dest || !originLabel.trim()) return null;

  const origins = originCandidates(originLabel);
  const local = await readLocalFee(origins, dest);
  if (local != null) return local;

  if (isSupabaseConfigured()) {
    for (const origin of origins) {
      const key = buildSettingsKey(origin, dest);
      const { data, error } = await supabase
        .from('system_settings')
        .select('settings_value')
        .eq('settings_key', key)
        .maybeSingle();
      if (error) continue;
      if (data) {
        const fee = parseFeeValue((data as { settings_value: unknown }).settings_value);
        if (fee != null) return fee;
      }
    }
  }

  return null;
}
