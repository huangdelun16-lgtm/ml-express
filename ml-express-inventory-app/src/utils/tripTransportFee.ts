export function parseTripTransportFee(raw: unknown): number {
  if (raw == null) return 0;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const n = Number(String(raw).trim().replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export type TripFeeLoadBatchRef = {
  truck_loaded_at?: string | null;
  origin_store_code?: string | null;
  leg_destination_code?: string | null;
  destination_code?: string | null;
};

function normalizeTripLegCode(raw: string | null | undefined): string {
  return String(raw ?? '')
    .trim()
    .toUpperCase();
}

/** 无 trip_number 时：同一发站、同一目的地、同一分钟装车视为同一车次 */
export function loadBatchGroupKey(ref: TripFeeLoadBatchRef): string | null {
  const loaded = String(ref.truck_loaded_at ?? '').trim();
  const origin = normalizeTripLegCode(ref.origin_store_code);
  const leg =
    normalizeTripLegCode(ref.leg_destination_code) ||
    normalizeTripLegCode(ref.destination_code);
  if (!loaded || !origin || !leg) return null;
  const ts = Date.parse(loaded);
  if (Number.isNaN(ts)) return null;
  return `load:${origin}:${leg}:${Math.floor(ts / 60_000)}`;
}

export function tripTransportGroupKey(
  tripNumber?: string | null,
  packBarcode?: string | null,
  loadBatch?: TripFeeLoadBatchRef | null,
): string {
  const trip = String(tripNumber ?? '').trim().toUpperCase();
  const pack = String(packBarcode ?? '').trim().toUpperCase();
  if (trip) return `trip:${trip}`;
  const batchKey = loadBatch ? loadBatchGroupKey(loadBatch) : null;
  if (batchKey) return batchKey;
  return `pack:${pack}`;
}

export type TripFeeGroupMeta = {
  tripNumber: string;
  packBarcodes: string[];
  packCount: number;
  fee: number;
  primaryPackBarcode: string;
};

type TripFeePackRow = {
  trip_number?: string | null;
  pack_barcode?: string | null;
  bundle_barcode?: string | null;
  transport_fee?: unknown;
  truck_loaded_at?: string | null;
  origin_store_code?: string | null;
  leg_destination_code?: string | null;
  destination_code?: string | null;
};

export function buildTripFeeGroupMap(packages: TripFeePackRow[]): Map<string, TripFeeGroupMeta> {
  const groups = new Map<string, { tripNumber: string; packs: TripFeePackRow[] }>();
  for (const pkg of packages) {
    const packBarcode = String(pkg.pack_barcode ?? pkg.bundle_barcode ?? '')
      .trim()
      .toUpperCase();
    if (!packBarcode) continue;
    const tripNumber = String(pkg.trip_number ?? '').trim().toUpperCase();
    const key = tripTransportGroupKey(tripNumber, packBarcode, pkg);
    if (!groups.has(key)) {
      groups.set(key, { tripNumber, packs: [] });
    }
    groups.get(key)!.packs.push(pkg);
  }

  const result = new Map<string, TripFeeGroupMeta>();
  for (const [key, { tripNumber, packs }] of groups) {
    packs.sort((a, b) =>
      String(a.pack_barcode ?? a.bundle_barcode ?? '').localeCompare(
        String(b.pack_barcode ?? b.bundle_barcode ?? ''),
      ),
    );
    const packBarcodes = packs.map((p) =>
      String(p.pack_barcode ?? p.bundle_barcode ?? '').trim().toUpperCase(),
    );
    let fee = 0;
    for (const p of packs) {
      fee = Math.max(fee, parseTripTransportFee(p.transport_fee));
    }
    result.set(key, {
      tripNumber,
      packBarcodes,
      packCount: packBarcodes.length,
      fee,
      primaryPackBarcode: packBarcodes[0] ?? '',
    });
  }
  return result;
}

export function isPrimaryTripFeePack(
  packBarcode: string,
  tripNumber: string | null | undefined,
  groupMap: Map<string, TripFeeGroupMeta>,
  loadBatch?: TripFeeLoadBatchRef | null,
): boolean {
  const code = packBarcode.trim().toUpperCase();
  const key = tripTransportGroupKey(tripNumber, code, loadBatch);
  const group = groupMap.get(key);
  if (!group || group.packCount <= 1) return true;
  return group.primaryPackBarcode === code;
}

export function isTripTransportFeePaid(
  packBarcodes: string[],
  paidBarcodes: Set<string>,
): boolean {
  return packBarcodes.some((code) => paidBarcodes.has(code.trim().toUpperCase()));
}
