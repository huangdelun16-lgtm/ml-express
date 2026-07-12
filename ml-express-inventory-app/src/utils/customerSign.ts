import type { InventoryStoreSession } from '../services/authService';
import type { InventoryItem, InventoryItemListRow } from '../types/inventory';
import { svc, type ServiceError } from '../errors/serviceError';
import { resolveStoreHubCode } from './storeZone';
import {
  isAdminStore,
  normalizeOwnerKey,
  ownershipKeyFromStoreCode,
  ownershipLabelFromKey,
  resolveOwnerKeyForListItem,
} from './storeOwnership';
import { isPackageBarcode } from './packageNumber';

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
  if (isPackageBarcode(item.barcode)) return false;
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

export function customerSignDeniedError(
  store: InventoryStoreSession,
  item: SignableItem,
): ServiceError {
  if (isPackageBarcode(item.barcode)) {
    return svc('signDeniedPkg');
  }
  if (!item.hub_arrived_at?.trim()) {
    return svc('signDeniedNotArrived');
  }
  if (item.customer_signed_at?.trim()) {
    return svc('signDeniedAlready');
  }

  const originKey = resolveOwnerKeyForListItem(item);
  const currentKey = ownershipKeyFromStoreCode(store.storeCode);
  if (currentKey === 'MUSE' && originKey === 'MUSE') {
    return svc('signDeniedMuseOrigin');
  }

  const hubKey = resolveHubKeyForStore(store);
  const destKey = resolveItemDestinationKey(item);
  if (destKey && hubKey && destKey !== hubKey) {
    return svc('signDeniedWrongHub', {
      dest: ownershipLabelFromKey(destKey),
      hub: ownershipLabelFromKey(hubKey),
    });
  }

  return svc('signDeniedGeneric');
}

/** @deprecated Use customerSignDeniedError + resolveAppError in UI */
export function customerSignDeniedMessage(
  store: InventoryStoreSession,
  item: SignableItem,
): string {
  return customerSignDeniedError(store, item).message;
}
