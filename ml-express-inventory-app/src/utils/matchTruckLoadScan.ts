import type { PackedShipmentDetail } from '../types/inventory';
import type { PkgTrackingStatus } from '../types/tracking';
import { canSelectPackedShipmentForTruckLoad } from './packDisplayStatus';

function normalizeScanCode(raw: string): string {
  const cleaned = raw.replace(/[\x00-\x1F\x7F]/g, '').trim();
  if (!cleaned) return '';
  return cleaned.toUpperCase();
}

export type TruckLoadScanReject =
  | 'not_found'
  | 'not_inbound'
  | 'not_packed'
  | 'already_loaded'
  | 'already_selected';

export type PendingTruckLoadScan =
  | { kind: 'hit'; pack: PackedShipmentDetail; match: 'pack' | 'order' }
  | { kind: 'miss'; reason: 'already_selected' | 'not_found' };

function codesEqual(a: string | null | undefined, b: string): boolean {
  const left = normalizeScanCode(a ?? '');
  return Boolean(left) && left === b;
}

export function isOrderInboundReady(item: {
  qty_on_hand: number;
  packed_at?: string | null;
  packed_bundle_barcode?: string | null;
  hub_arrived_at?: string | null;
}): boolean {
  if (item.qty_on_hand > 0) return true;
  if (item.packed_at?.trim()) return true;
  if (item.packed_bundle_barcode?.trim()) return true;
  if (item.hub_arrived_at?.trim()) return true;
  return false;
}

export function findPendingPackByScan(
  raw: string,
  packs: PackedShipmentDetail[],
): { pack: PackedShipmentDetail; match: 'pack' | 'order' } | null {
  const code = normalizeScanCode(raw);
  if (!code) return null;
  for (const pack of packs) {
    if (codesEqual(pack.bundle_barcode, code)) {
      return { pack, match: 'pack' };
    }
    const orderHit = pack.items.some(
      (line) => codesEqual(line.item_barcode, code) || codesEqual(line.input_barcode, code),
    );
    if (orderHit) return { pack, match: 'order' };
  }
  return null;
}

export function matchPendingTruckLoadScan(
  raw: string,
  packs: PackedShipmentDetail[],
  selectedIds: Iterable<string>,
): PendingTruckLoadScan {
  const found = findPendingPackByScan(raw, packs);
  if (!found) return { kind: 'miss', reason: 'not_found' };
  const selected = selectedIds instanceof Set ? selectedIds : new Set(selectedIds);
  if (selected.has(found.pack.id)) return { kind: 'miss', reason: 'already_selected' };
  return { kind: 'hit', pack: found.pack, match: found.match };
}

export function classifyUnresolvedTruckLoadScan(input: {
  item: {
    qty_on_hand: number;
    packed_at?: string | null;
    packed_bundle_barcode?: string | null;
    hub_arrived_at?: string | null;
  } | null;
  pack: { loaded: boolean; cloud_status?: PkgTrackingStatus | null } | null;
}): Exclude<TruckLoadScanReject, 'already_selected'> {
  const { item, pack } = input;
  if (pack) {
    if (!canSelectPackedShipmentForTruckLoad(pack)) return 'already_loaded';
    return 'not_found';
  }
  if (!item) return 'not_found';
  if (!isOrderInboundReady(item)) return 'not_inbound';
  return 'not_packed';
}
