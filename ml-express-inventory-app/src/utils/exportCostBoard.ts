import { parsePackagingStockInLineBarcode } from './inboundBarcode';
import { parseWeightKg } from './itemFieldFormat';
import type { InventoryItemListRow } from '../types/inventory';

export type ExportCostSingleRow = {
  id: string;
  barcode: string;
  customer: string;
  destination: string;
  weightKg: number;
  tripNumber: string;
};

export type ExportCostPackageRow = {
  base: string;
  customer: string;
  destination: string;
  pieceCount: number;
  declaredTotal: number;
  weightKg: number;
  tripNumber: string;
};

export type ExportCostBoard = {
  singles: ExportCostSingleRow[];
  packages: ExportCostPackageRow[];
};

function customerOf(item: InventoryItemListRow): string {
  return item.customer_name?.trim() || item.recipient_name?.trim() || '';
}

function destinationOf(item: InventoryItemListRow): string {
  return item.final_destination?.trim() || item.destination?.trim() || '';
}

export type ExportCostBoardOptions = {
  /** 整包总重量，按包装号。有值时优先于各件重量相加。 */
  packageWeightKg?: ReadonlyMap<string, number>;
  /** 装车后的车次，键是包装号、订单条码或 id:订单id */
  tripByBarcode?: ReadonlyMap<string, string>;
};

/** 还没签收的入库。装过车的也留在名单里。 */
export function isPendingExportItem(item: InventoryItemListRow): boolean {
  if (!item.stocked_in) return false;
  if (item.customer_signed) return false;
  return true;
}

export function exportCostLineTotal(unitPriceCny: number, weightKg: number): number {
  if (!(unitPriceCny > 0) || !(weightKg > 0)) return 0;
  return Math.round(unitPriceCny * weightKg * 100) / 100;
}

export function exportCostOptionsFromPacks(
  packs: Array<{
    loaded: boolean;
    bundle_barcode: string;
    weight?: string;
    trip_number?: string;
    items: Array<{ item_id?: string; item_barcode?: string }>;
  }>,
  trips: Array<{ barcode: string; trip: string; weightKg?: number }> = [],
): ExportCostBoardOptions {
  const packageWeightKg = new Map<string, number>();
  const tripByBarcode = new Map<string, string>();
  for (const trip of trips) {
    const code = trip.barcode.trim().toUpperCase();
    const number = trip.trip.trim().toUpperCase();
    if (!code || !number) continue;
    tripByBarcode.set(code, number);
    if ((trip.weightKg ?? 0) > 0 && !packageWeightKg.has(code)) {
      packageWeightKg.set(code, trip.weightKg ?? 0);
    }
  }
  for (const pack of packs) {
    const code = pack.bundle_barcode.trim().toUpperCase();
    if (!code) continue;
    const kg = parseWeightKg(pack.weight || '');
    if (kg > 0) packageWeightKg.set(code, kg);
    const trip = (pack.trip_number || tripByBarcode.get(code) || '').trim().toUpperCase();
    if (!trip) continue;
    tripByBarcode.set(code, trip);
    for (const line of pack.items) {
      if (line.item_id) tripByBarcode.set(`id:${line.item_id}`, trip);
      const lineCode = line.item_barcode?.trim().toUpperCase();
      if (lineCode) tripByBarcode.set(lineCode, trip);
    }
  }
  return { packageWeightKg, tripByBarcode };
}

function lookupTrip(keys: Array<string | undefined>, trips: ReadonlyMap<string, string> | undefined): string {
  if (!trips) return '';
  for (const key of keys) {
    const code = key?.trim().toUpperCase();
    if (!code) continue;
    const trip = trips.get(code);
    if (trip) return trip;
  }
  return '';
}

function weightOf(item: InventoryItemListRow): number {
  const kg = parseWeightKg(item.weight || '');
  return kg > 0 ? kg : 0;
}

export function buildExportCostBoard(
  items: InventoryItemListRow[],
  options: ExportCostBoardOptions = {},
): ExportCostBoard {
  const pending = items.filter((item) => isPendingExportItem(item));
  const bases = new Set<string>();
  for (const item of pending) {
    const parsed = parsePackagingStockInLineBarcode(item.barcode);
    if (parsed) bases.add(parsed.base.trim().toUpperCase());
  }

  const singles: ExportCostSingleRow[] = [];
  const groups = new Map<string, InventoryItemListRow[]>();

  for (const item of pending) {
    const parsed = parsePackagingStockInLineBarcode(item.barcode);
    if (parsed) {
      const key = parsed.base.trim().toUpperCase();
      const list = groups.get(key) ?? [];
      list.push(item);
      groups.set(key, list);
      continue;
    }
    const code = item.barcode.trim().toUpperCase();
    if (code && bases.has(code)) continue;
    singles.push({
      id: item.id,
      barcode: item.input_barcode?.trim() || item.barcode,
      customer: customerOf(item),
      destination: destinationOf(item),
      weightKg: weightOf(item),
      tripNumber: lookupTrip(
        [item.barcode, item.packed_bundle_barcode, item.parent_pack_barcode, `id:${item.id}`],
        options.tripByBarcode,
      ),
    });
  }

  const packages: ExportCostPackageRow[] = [];
  for (const [base, rows] of groups) {
    const parsed = parsePackagingStockInLineBarcode(rows[0]?.barcode || '');
    const pieceWeight = rows.reduce((sum, row) => sum + weightOf(row), 0);
    const packWeight = options.packageWeightKg?.get(base) ?? 0;
    const weightKg = packWeight > 0 ? packWeight : pieceWeight;
    packages.push({
      base: parsed?.base || base,
      customer: rows.map(customerOf).find(Boolean) || '',
      destination: rows.map(destinationOf).find(Boolean) || '',
      pieceCount: rows.length,
      declaredTotal: parsed?.total || rows.length,
      weightKg,
      tripNumber: lookupTrip(
        [base, parsed?.base, ...rows.flatMap((row) => [row.barcode, row.packed_bundle_barcode, `id:${row.id}`])],
        options.tripByBarcode,
      ),
    });
  }

  singles.sort((a, b) => a.barcode.localeCompare(b.barcode));
  packages.sort((a, b) => a.base.localeCompare(b.base));
  return { singles, packages };
}
