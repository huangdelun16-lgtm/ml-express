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

export type TripWorkStatus = 'in_transit' | 'arrived' | 'signed';

export function tripWorkStatus(statuses: Array<string | null | undefined>): TripWorkStatus {
  const values = statuses.map((status) => String(status ?? '').trim());
  if (values.some((status) => status === 'completed' || status === 'split_at_hub')) return 'signed';
  if (values.includes('hub_received')) return 'arrived';
  return 'in_transit';
}

export type OriginFeeTrip = {
  key: string;
  tripNumber: string;
  destination: string;
  packCount: number;
  primaryPackBarcode: string;
  status: TripWorkStatus;
  urgent: boolean;
  fee: number;
};

/** 发站自己的车次。没填车费的都列出来；已到站或已签收的标成紧急。 */
export function listOriginFeeTrips(
  packs: Array<
    TripFeePackRow & {
      status?: string | null;
    }
  >,
): OriginFeeTrip[] {
  const buckets = new Map<string, TripFeePackRow[]>();
  for (const pack of packs) {
    const barcode = String(pack.pack_barcode ?? pack.bundle_barcode ?? '').trim().toUpperCase();
    if (!barcode) continue;
    const key = tripTransportGroupKey(pack.trip_number, barcode, pack);
    const list = buckets.get(key) ?? [];
    list.push(pack);
    buckets.set(key, list);
  }
  const rows: OriginFeeTrip[] = [];
  for (const [key, group] of buckets) {
    const fee = group.reduce((max, pack) => Math.max(max, parseTripTransportFee(pack.transport_fee)), 0);
    if (fee > 0) continue;
    const status = tripWorkStatus(group.map((pack) => pack.status));
    const codes = group
      .map((pack) => String(pack.pack_barcode ?? pack.bundle_barcode ?? '').trim().toUpperCase())
      .filter(Boolean)
      .sort();
    const destination = String(
      group.find((pack) => pack.leg_destination_code || pack.destination_code)?.leg_destination_code
        || group.find((pack) => pack.destination_code)?.destination_code
        || '',
    ).trim().toUpperCase();
    rows.push({
      key,
      tripNumber: String(group.find((pack) => pack.trip_number)?.trip_number ?? '').trim().toUpperCase(),
      destination,
      packCount: codes.length,
      primaryPackBarcode: codes[0] ?? '',
      status,
      urgent: status === 'arrived' || status === 'signed',
      fee: 0,
    });
  }
  const rank: Record<TripWorkStatus, number> = { signed: 0, arrived: 1, in_transit: 2 };
  rows.sort((a, b) => rank[a.status] - rank[b.status] || a.tripNumber.localeCompare(b.tripNumber));
  return rows;
}

export function countUrgentFillFeeTrips(trips: Array<{ urgent: boolean }>): number {
  return trips.filter((trip) => trip.urgent).length;
}

export function isTripTransportFeePaid(
  packBarcodes: string[],
  paidBarcodes: Set<string>,
): boolean {
  return packBarcodes.some((code) => paidBarcodes.has(code.trim().toUpperCase()));
}
