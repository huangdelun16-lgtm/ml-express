import type { InventoryItem, PackedShipmentDetail, PackedShipmentItem } from '../types/inventory';
import { parsePackagingStockInLineBarcode } from './inboundBarcode';
import { isPackageBarcode } from './packageNumber';

/** 多个入库写入快递包 note 时的固定前缀（中/英/缅） */
const PACKAGING_STOCK_IN_NOTE_MARKERS = [
  '多个入库',
  'Multiple stock in',
  'အစုလိုက်စာရင်းသွင်း',
] as const;

/** 多个入库 RPC 写入入库流水的「打包入」标记（与普通打包「打包入 PKG」区分） */
export const PACKAGING_STOCK_IN_INBOUND_MARKER = ' · 打包入 ';

export type PackItemSequence = { total: number; index: number };

export function isPackagingStockInPack(pack: { note?: string }): boolean {
  const note = pack.note?.trim() ?? '';
  return PACKAGING_STOCK_IN_NOTE_MARKERS.some((marker) => note.includes(marker));
}

export function isPackagingStockInInboundNote(note: string | undefined): boolean {
  return Boolean(note?.includes(PACKAGING_STOCK_IN_INBOUND_MARKER));
}

function siblingOrdersInBundle(
  bundleCode: string,
  allItems: InventoryItem[],
): InventoryItem[] {
  const code = bundleCode.trim().toUpperCase();
  if (!code) return [];
  return allItems
    .filter((row) => {
      const rowBundle = row.packed_bundle_barcode?.trim().toUpperCase() || '';
      const rowCode = row.barcode.trim().toUpperCase();
      return rowBundle === code && rowCode !== code && !isPackageBarcode(rowCode);
    })
    .sort((a, b) => {
      const pa = parsePackagingStockInLineBarcode(a.barcode);
      const pb = parsePackagingStockInLineBarcode(b.barcode);
      if (pa && pb && pa.base === pb.base) return pa.index - pb.index;
      return a.barcode.localeCompare(b.barcode);
    });
}

function syntheticPackFromBundledItems(
  item: Pick<InventoryItem, 'id' | 'barcode' | 'packed_bundle_barcode'>,
  allItems: InventoryItem[],
): PackedShipmentDetail | null {
  const bundleCode = item.packed_bundle_barcode?.trim().toUpperCase() || '';
  if (!bundleCode) return null;

  const siblings = siblingOrdersInBundle(bundleCode, allItems);
  if (siblings.length <= 1) return null;

  const bundleItem = allItems.find((row) => row.barcode.trim().toUpperCase() === bundleCode);
  const lines: PackedShipmentItem[] = siblings.map((row) => ({
    id: '',
    pack_id: '',
    item_id: row.id,
    item_barcode: row.barcode,
    input_barcode: row.input_barcode ?? '',
    item_name: row.name,
    destination: row.final_destination ?? '',
    customer_name: row.recipient_name ?? '',
    qty: 1,
  }));

  return {
    id: '',
    bundle_item_id: bundleItem?.id ?? '',
    bundle_barcode: bundleCode,
    bundle_name: bundleItem?.name ?? bundleCode,
    operator: '',
    note: '',
    owner_store_code: bundleItem?.owner_store_code ?? siblings[0]?.owner_store_code ?? '',
    created_at: bundleItem?.created_at ?? '',
    spec: bundleItem?.spec ?? '',
    unit: bundleItem?.unit ?? '',
    weight: bundleItem?.weight ?? '',
    items: lines,
    bundle_qty_on_hand: 0,
    loaded: false,
  };
}

/** 从缓存快递包或同包订单行解析父包（目的站 RLS 未同步时仍可合成包内序号） */
export function findParentPackForItem(
  item: Pick<InventoryItem, 'id' | 'barcode' | 'packed_bundle_barcode'>,
  packs: PackedShipmentDetail[],
  allItems: InventoryItem[] = [],
): PackedShipmentDetail | null {
  const itemCode = item.barcode.trim().toUpperCase();

  const fromLines = packs.find((pack) =>
    pack.items.some(
      (line) =>
        line.item_id === item.id ||
        line.item_barcode.trim().toUpperCase() === itemCode,
    ),
  );
  if (fromLines) return fromLines;

  const bundleCode = item.packed_bundle_barcode?.trim().toUpperCase() || '';
  if (bundleCode) {
    const fromBarcode = packs.find((p) => p.bundle_barcode.trim().toUpperCase() === bundleCode);
    if (fromBarcode) return fromBarcode;
  }

  return syntheticPackFromBundledItems(item, allItems);
}

/** 解析订单在快递包内的序号（1-based）；单件包返回 null */
export function resolvePackItemSequence(
  itemId: string,
  itemBarcode: string,
  pack: Pick<PackedShipmentDetail, 'items'>,
): PackItemSequence | null {
  const total = pack.items.length;
  if (total <= 1) return null;

  const code = itemBarcode.trim().toUpperCase();
  const idx = pack.items.findIndex(
    (line) =>
      line.item_id === itemId ||
      line.item_barcode.trim().toUpperCase() === code,
  );
  if (idx < 0) return null;
  return { total, index: idx + 1 };
}

export function formatPackItemLabel(seq: PackItemSequence): string {
  return `${seq.total}-${seq.index}`;
}

export function resolvePackagingStockInItemLabel(
  itemId: string,
  itemBarcode: string,
  pack: PackedShipmentDetail | null | undefined,
  inboundMovementNote?: string,
): string | undefined {
  const fromBarcode = parsePackagingStockInLineBarcode(itemBarcode);
  if (fromBarcode) return formatPackItemLabel(fromBarcode);

  if (!pack) return undefined;
  const isPackaging =
    isPackagingStockInPack(pack) ||
    (pack.items.length > 1 && isPackagingStockInInboundNote(inboundMovementNote));
  if (!isPackaging) return undefined;
  const seq = resolvePackItemSequence(itemId, itemBarcode, pack);
  return seq ? formatPackItemLabel(seq) : undefined;
}
