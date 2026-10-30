import type { InventoryStoreSession } from '../services/authService';
import type { InventoryItem } from '../types/inventory';
import { resolveItemDestinationCode } from './itemDestination';
import {
  canEditOwnedRecord,
  isAdminStore,
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

/** 客户已签收后不可再改。已到站、尚未签收的仍可改重量和报价。 */
export function isItemCustomerProfileLocked(item: ItemCustomerProfileEditRef): boolean {
  return Boolean(item.customer_signed_at?.trim() || item.customer_signed);
}

export async function isItemCustomerProfileLockedAsync(item: InventoryItem): Promise<boolean> {
  return isItemCustomerProfileLocked(item);
}

/**
 * 是否可编辑订单：客户签收前，入库区域或最终目的地区域账号可改。
 * 已签收后锁定（Admin 除外）。已到站但未签收仍可改重量和报价。
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
