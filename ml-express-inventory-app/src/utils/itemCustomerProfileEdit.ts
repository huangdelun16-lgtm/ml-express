import type { InventoryStoreSession } from '../services/authService';
import type { InventoryItem } from '../types/inventory';
import type { PkgTrackingStatus } from '../types/tracking';
import { resolveItemDestinationCode } from './itemDestination';
import {
  canEditOwnedRecord,
  isAdminStore,
  ownershipKeyFromStoreCode,
  resolveOwnerKeyForListItem,
} from './storeOwnership';

export type ItemCustomerProfileEditRef = {
  owner_store_code?: string;
  barcode: string;
  destination?: string;
  final_destination?: string;
  hub_arrived_at?: string | null;
  hub_arrived?: boolean;
  customer_signed_at?: string | null;
  customer_signed?: boolean;
  packed_bundle_barcode?: string | null;
  parent_pack_barcode?: string | null;
};

const DESTINATION_PACK_LOCKED_STATUSES: PkgTrackingStatus[] = [
  'hub_received',
  'completed',
  'split_at_hub',
];

/** 客户信息是否已锁定（目的站已签收快递包或客户已签收） */
export function isItemCustomerProfileLocked(item: ItemCustomerProfileEditRef): boolean {
  if (item.customer_signed_at?.trim() || item.customer_signed) return true;
  if (item.hub_arrived_at?.trim() || item.hub_arrived) return true;
  return false;
}

/** 云端：目的地区域账号是否已对所属快递包执行到站签收 */
export async function isDestinationPackSignedForOrder(item: InventoryItem): Promise<boolean> {
  const orderDest = resolveItemDestinationCode(item);
  if (!orderDest) return false;

  const { isSupabaseConfigured } = await import('../services/supabase');
  if (!isSupabaseConfigured()) return false;

  try {
    const { getOrderTrackingByBarcode, getPkgTrackingDetail } = await import(
      '../services/trackingService'
    );
    const order = await getOrderTrackingByBarcode(item.barcode);
    const packBarcode =
      order?.pack_barcode?.trim() ||
      item.packed_bundle_barcode?.trim() ||
      '';
    if (!packBarcode) return false;

    const pkg = await getPkgTrackingDetail(packBarcode);
    if (!pkg?.status || !DESTINATION_PACK_LOCKED_STATUSES.includes(pkg.status)) return false;

    const receivedCode = pkg.hub_received_by_store_code?.trim();
    if (!receivedCode) return false;

    return ownershipKeyFromStoreCode(receivedCode) === orderDest;
  } catch {
    return false;
  }
}

export async function isItemCustomerProfileLockedAsync(item: InventoryItem): Promise<boolean> {
  if (isItemCustomerProfileLocked(item)) return true;
  return isDestinationPackSignedForOrder(item);
}

/**
 * 是否可编辑订单客户资料：
 * - 目的站签收快递包前：入库区域或最终目的地区域账号可改
 * - 签收后锁定（Admin 除外）
 */
export function canEditItemCustomerProfile(
  store: InventoryStoreSession,
  item: ItemCustomerProfileEditRef,
  hubCode?: string,
): boolean {
  if (isItemCustomerProfileLocked(item)) return false;
  if (isAdminStore(store)) return true;
  if (canEditOwnedRecord(store, resolveOwnerKeyForListItem(item))) return true;

  const hub = hubCode?.trim().toUpperCase();
  const destKey = resolveItemDestinationCode(item);
  if (hub && destKey && destKey === hub) return true;

  return false;
}

export async function canEditItemCustomerProfileAsync(
  store: InventoryStoreSession,
  item: InventoryItem,
  hubCode?: string,
): Promise<boolean> {
  if (await isItemCustomerProfileLockedAsync(item)) return false;
  return canEditItemCustomerProfile(store, item, hubCode);
}
