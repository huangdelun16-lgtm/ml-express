import type { InventoryStoreSession } from '../services/authService';
import { svc, type ServiceError } from '../errors/serviceError';
import { destinationCodesMatch } from './destinationCode';
import { resolveStoreHubCode } from './storeZone';
import {
  isAdminStore,
  normalizeOwnerKey,
  ownershipKeyFromStoreCode,
  ownershipLabelFromKey,
  resolveOwnerKeyForListItem,
} from './storeOwnership';
import { isPackageBarcode } from './packageNumber';

export type CustomerSignItemRef = {
  barcode: string;
  hub_arrived_at?: string | null;
  customer_signed_at?: string | null;
  final_destination?: string | null;
  destination?: string | null;
  delivery_hub_code?: string | null;
  owner_store_code?: string | null;
};

function ownerKeyRef(item: CustomerSignItemRef) {
  return {
    barcode: item.barcode,
    destination: item.destination ?? undefined,
    owner_store_code: item.owner_store_code ?? undefined,
  };
}

function resolveItemDestinationKey(item: CustomerSignItemRef): string {
  const raw = (item.final_destination || item.destination || '').trim();
  if (!raw) return '';
  return normalizeOwnerKey(raw);
}

function resolveHubKeyForStore(store: InventoryStoreSession): string {
  return normalizeOwnerKey(resolveStoreHubCode(store));
}

function assignedDeliveryHub(item: { delivery_hub_code?: string | null }): string {
  return (item.delivery_hub_code || '').trim();
}

/** 当前登录站是否为该订单的签收站（本段运达站优先；否则看客户地区） */
export function isDestinationHubViewer(
  store: InventoryStoreSession,
  item: Pick<CustomerSignItemRef, 'final_destination' | 'destination' | 'delivery_hub_code'>,
): boolean {
  if (isAdminStore(store)) return true;
  const deliveryHub = assignedDeliveryHub(item);
  if (deliveryHub) return destinationCodesMatch(deliveryHub, resolveStoreHubCode(store));
  const dest = (item.final_destination || item.destination || '').trim();
  if (!dest) return false;
  return destinationCodesMatch(dest, resolveStoreHubCode(store));
}

/** 目的站是否可对当前订单执行客户签收 */
export function canMarkCustomerSigned(
  store: InventoryStoreSession,
  item: CustomerSignItemRef,
): boolean {
  if (isPackageBarcode(item.barcode)) return false;
  if (!item.hub_arrived_at?.trim()) return false;
  if (item.customer_signed_at?.trim()) return false;

  if (isAdminStore(store)) return true;

  const originKey = resolveOwnerKeyForListItem(ownerKeyRef(item));
  const currentKey = ownershipKeyFromStoreCode(store.storeCode);

  // 木姐 MUSE 账号不可签收本站发出订单，须在目的站签收
  if (currentKey === 'MUSE' && originKey === 'MUSE') return false;

  const deliveryHub = assignedDeliveryHub(item);
  if (deliveryHub) return destinationCodesMatch(deliveryHub, resolveStoreHubCode(store));

  const hubKey = resolveHubKeyForStore(store);
  const destKey = resolveItemDestinationKey(item);
  if (destKey && hubKey && destKey !== hubKey) return false;

  return true;
}

export function customerSignDeniedError(
  store: InventoryStoreSession,
  item: CustomerSignItemRef,
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

  const originKey = resolveOwnerKeyForListItem(ownerKeyRef(item));
  const currentKey = ownershipKeyFromStoreCode(store.storeCode);
  if (currentKey === 'MUSE' && originKey === 'MUSE') {
    return svc('signDeniedMuseOrigin');
  }

  const hubKey = resolveHubKeyForStore(store);
  const deliveryHub = assignedDeliveryHub(item);
  if (deliveryHub && !destinationCodesMatch(deliveryHub, resolveStoreHubCode(store))) {
    const deliveryKey = normalizeOwnerKey(deliveryHub) || deliveryHub;
    return svc('signDeniedWrongHub', {
      dest: ownershipLabelFromKey(deliveryKey),
      hub: ownershipLabelFromKey(hubKey),
    });
  }

  const destKey = resolveItemDestinationKey(item);
  if (!deliveryHub && destKey && hubKey && destKey !== hubKey) {
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
  item: CustomerSignItemRef,
): string {
  return customerSignDeniedError(store, item).message;
}
