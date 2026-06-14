import type { InventoryStoreSession } from '../services/authService';
import type { InventoryItem, InventoryItemListRow } from '../types/inventory';
import { resolveStoreHubCode } from './storeZone';
import {
  isAdminStore,
  normalizeOwnerKey,
  ownershipKeyFromStoreCode,
  ownershipLabelFromKey,
  resolveOwnerKeyForListItem,
} from './storeOwnership';

type SignableItem = InventoryItem | InventoryItemListRow;

function resolveItemDestinationKey(item: SignableItem): string {
  const raw = (item.final_destination || item.destination || '').trim();
  if (!raw) return '';
  return normalizeOwnerKey(raw);
}

function resolveHubKeyForStore(store: InventoryStoreSession): string {
  return normalizeOwnerKey(resolveStoreHubCode(store));
}

/** 目的站是否可对当前订单执行客户签收 */
export function canMarkCustomerSigned(
  store: InventoryStoreSession,
  item: SignableItem,
): boolean {
  if (item.barcode.trim().toUpperCase().startsWith('PKG')) return false;
  if (!item.hub_arrived_at?.trim()) return false;
  if (item.customer_signed_at?.trim()) return false;

  if (isAdminStore(store)) return true;

  const originKey = resolveOwnerKeyForListItem(item);
  const currentKey = ownershipKeyFromStoreCode(store.storeCode);

  // 木姐 MUSE 账号不可签收本站发出订单，须在目的站签收
  if (currentKey === 'MUSE' && originKey === 'MUSE') return false;

  const hubKey = resolveHubKeyForStore(store);
  const destKey = resolveItemDestinationKey(item);
  if (destKey && hubKey && destKey !== hubKey) return false;

  return true;
}

export function customerSignDeniedMessage(
  store: InventoryStoreSession,
  item: SignableItem,
): string {
  if (item.barcode.trim().toUpperCase().startsWith('PKG')) {
    return '快递包不可标记客户签收，请对具体订单操作。';
  }
  if (!item.hub_arrived_at?.trim()) {
    return '仅「已到站」订单可标记签收。';
  }
  if (item.customer_signed_at?.trim()) {
    return '该订单已签收。';
  }

  const originKey = resolveOwnerKeyForListItem(item);
  const currentKey = ownershipKeyFromStoreCode(store.storeCode);
  if (currentKey === 'MUSE' && originKey === 'MUSE') {
    return '木姐 MUSE 账号不可签收本站发出订单，请在目的站签收。';
  }

  const hubKey = resolveHubKeyForStore(store);
  const destKey = resolveItemDestinationKey(item);
  if (destKey && hubKey && destKey !== hubKey) {
    const destLabel = ownershipLabelFromKey(destKey);
    const hubLabel = ownershipLabelFromKey(hubKey);
    return `该订单目的地为 ${destLabel}，本站为 ${hubLabel}，无法签收。`;
  }

  return '当前账号无法签收该订单。';
}
