import type { InventoryStoreSession } from '../services/authService';
import type { InventoryItemListRow } from '../types/inventory';
import { extractDestinationCode } from './inboundBarcode';
import { isCustomerSignedItem } from './itemFieldFormat';
import { resolveItemDestinationCode } from './itemDestination';
import { packDestinationFromBarcode } from './packageNumber';
import {
  isAdminStore,
  ownershipKeyFromStoreCode,
} from './storeOwnership';

type CloudItemRef = {
  owner_store_code: string;
  final_destination: string;
  hub_arrived_at?: string | null;
  customer_signed_at?: string | null;
  hub_transit_released_at?: string | null;
  hub_transit_shipped_at?: string | null;
  packed_bundle_barcode?: string | null;
};

export type PackVisibilityRef = {
  bundle_barcode: string;
  owner_store_code?: string;
  truck_leg_destination?: string;
};

type CloudPackRef = PackVisibilityRef;

/** 目的站（非中转）：到站包裹内只写入本站最终目的地订单 */
const DESTINATION_ONLY_HUBS = new Set(['YGN', 'TGI']);

function isInboundPackBarcode(barcode: string): boolean {
  return barcode.trim().toUpperCase().startsWith('PKG');
}

/** 是否为本站账号自己入库登记（发站视角：可见自己装车出库的全部目的地订单） */
function isLocalInboundItem(
  itemOwnerCode: string,
  store: InventoryStoreSession,
): boolean {
  const code = itemOwnerCode.trim().toUpperCase();
  const storeCode = store.storeCode.trim().toUpperCase();
  if (!code) return false;
  if (code === storeCode) return true;
  return ownershipKeyFromStoreCode(code) === ownershipKeyFromStoreCode(store.storeCode);
}

/**
 * 到站收货写入本地时：是否应持久化该订单行
 * - 发站入库订单：全部写入
 * - 本站最终目的地：写入
 * - 经本站中转（MDY 等）：写入
 * - 目的站（YGN 等）不写入其它地区订单
 */
export function shouldPersistInboundOrderAtHub(
  orderDest: string,
  store: InventoryStoreSession,
  hubCode: string,
  originOwnerCode: string,
): boolean {
  if (isAdminStore(store)) return true;

  const hub = hubCode.trim().toUpperCase();
  if (!hub) return isLocalInboundItem(originOwnerCode, store);

  if (isLocalInboundItem(originOwnerCode, store)) return true;

  const destKey = extractDestinationCode(orderDest);
  if (!destKey) return false;
  if (destKey === hub) return true;
  if (DESTINATION_ONLY_HUBS.has(hub)) return false;
  return destKey !== hub;
}

/**
 * 快递明细列表可见性
 *
 * - 发站账号（原始入库）：可见本店登记的全部订单（含 MDY、YGN 等各目的地）
 * - 中转站：仅本站最终目的地订单 + 经本站中转的订单（待释放/待转出/已中转）
 * - 最终目的站：仅最终目的地为本站的订单，不显示其它地区订单（含其它站已签收）
 */
export function isVisibleInExpressDetailsList(
  item: InventoryItemListRow,
  store: InventoryStoreSession,
  hubCode: string,
): boolean {
  if (isAdminStore(store)) return true;

  const hub = hubCode.trim().toUpperCase();
  if (!hub) {
    return isLocalInboundItem(item.owner_store_code ?? '', store);
  }

  const destKey = resolveItemDestinationCode(item);
  const localInbound = isLocalInboundItem(item.owner_store_code ?? '', store);
  const isFinalDestHere = Boolean(destKey && destKey === hub);
  const isTransitElsewhere = Boolean(destKey && destKey !== hub);

  if (localInbound) return true;

  if (isCustomerSignedItem(item)) {
    return isFinalDestHere;
  }

  if (item.hub_arrived) {
    return isFinalDestHere;
  }

  if (item.hub_transit_released || item.hub_transit_shipped) {
    return isTransitElsewhere && !DESTINATION_ONLY_HUBS.has(hub);
  }

  const inboundPack = item.parent_pack_barcode?.trim() ?? '';
  if (isInboundPackBarcode(inboundPack) && !item.hub_transit_shipped) {
    if (isTransitElsewhere && !DESTINATION_ONLY_HUBS.has(hub)) return true;
    if (isFinalDestHere) return true;
  }

  return false;
}

/** 云端拉取时：仅合并本区域账号应看到的订单 */
export function shouldMergeCloudItemToLocal(
  row: CloudItemRef,
  store: InventoryStoreSession,
  hubCode: string,
): boolean {
  if (isAdminStore(store)) return true;

  const hub = hubCode.trim().toUpperCase();
  if (!hub) return isLocalInboundItem(row.owner_store_code ?? '', store);

  const destKey = extractDestinationCode(row.final_destination ?? '');
  const localInbound = isLocalInboundItem(row.owner_store_code ?? '', store);
  const isFinalDestHere = Boolean(destKey && destKey === hub);
  const isTransitElsewhere = Boolean(destKey && destKey !== hub);

  if (localInbound) return true;

  if (row.customer_signed_at?.trim()) {
    return isFinalDestHere;
  }

  if (row.hub_arrived_at?.trim()) {
    return isFinalDestHere;
  }

  if (row.hub_transit_released_at?.trim() || row.hub_transit_shipped_at?.trim()) {
    return isTransitElsewhere && !DESTINATION_ONLY_HUBS.has(hub);
  }

  const inboundPack = row.packed_bundle_barcode?.trim() ?? '';
  const inInboundPack =
    isInboundPackBarcode(inboundPack) && !row.hub_transit_shipped_at?.trim();

  if (inInboundPack) {
    if (isTransitElsewhere && !DESTINATION_ONLY_HUBS.has(hub)) return true;
    if (isFinalDestHere) return true;
  }

  return false;
}

/** 快递包是否由本站持有（到站收货后 owner 为本站，发站出库仍为发站 owner） */
function isPackHeldAtThisStation(
  pack: PackVisibilityRef,
  store: InventoryStoreSession,
): boolean {
  const owner = pack.owner_store_code?.trim().toUpperCase() ?? '';
  if (!owner) return false;
  const storeCode = store.storeCode.trim().toUpperCase();
  if (owner === storeCode) return true;
  return ownershipKeyFromStoreCode(owner) === ownershipKeyFromStoreCode(store.storeCode);
}

/**
 * 「打包」列表可见性
 *
 * - 发站（MUSE）：可见本店登记/装车的全部快递包（MDY、YGN 等）
 * - 中转站（MDY）：本站目的地包裹 + 经本站中转的 inbound 包裹
 * - 目的站（YGN）：仅本站目的地且已到站持有的包裹，不显示发往 MDY 等其它地区的包
 */
export function isVisibleInPackedList(
  pack: PackVisibilityRef,
  store: InventoryStoreSession,
  hubCode: string,
): boolean {
  if (isAdminStore(store)) return true;

  const hub = hubCode.trim().toUpperCase();
  if (!hub) return isLocalInboundItem(pack.owner_store_code ?? '', store);

  const packDest = packDestinationFromBarcode(pack.bundle_barcode);
  const legDest = pack.truck_leg_destination?.trim().toUpperCase() || '';
  const localOwned = isLocalInboundItem(pack.owner_store_code ?? '', store);
  const heldHere = isPackHeldAtThisStation(pack, store);

  if (localOwned) return true;

  if (packDest === hub && heldHere) return true;

  if (DESTINATION_ONLY_HUBS.has(hub)) return false;

  if (legDest === hub && packDest && packDest !== hub) return true;
  if (heldHere && packDest && packDest !== hub) return true;

  return false;
}

/** 云端拉取时：仅合并本区域应看到的快递包 */
export function shouldMergeCloudPackToLocal(
  row: CloudPackRef,
  store: InventoryStoreSession,
  hubCode: string,
): boolean {
  return isVisibleInPackedList(row, store, hubCode);
}
