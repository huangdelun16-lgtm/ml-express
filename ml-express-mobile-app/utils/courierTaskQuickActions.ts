import { Linking } from 'react-native';
import type { Package } from '../services/staffApi/types';
import { openMapsToAddress } from './openMapsNavigation';
import {
  isNavigateMerchantFirstPhase,
  normalizePackageStatusZh,
} from './packageStatusNormalize';

export type CourierTaskTargetKind = 'merchant' | 'customer';

export function sanitizeDialNumber(phone?: string | null): string {
  return String(phone || '').trim().replace(/[^\d+]/g, '');
}

export function isMerchantFirstTask(pkg: Pick<Package, 'status'>): boolean {
  return isNavigateMerchantFirstPhase(normalizePackageStatusZh(pkg.status));
}

export function pickCourierTaskPhone(
  pkg: Pick<Package, 'status' | 'sender_phone' | 'receiver_phone'>,
): { phone: string; kind: CourierTaskTargetKind } | null {
  const merchantFirst = isMerchantFirstTask(pkg);
  const sender = sanitizeDialNumber(pkg.sender_phone);
  const receiver = sanitizeDialNumber(pkg.receiver_phone);
  if (merchantFirst) {
    if (sender) return { phone: sender, kind: 'merchant' };
    if (receiver) return { phone: receiver, kind: 'customer' };
    return null;
  }
  if (receiver) return { phone: receiver, kind: 'customer' };
  if (sender) return { phone: sender, kind: 'merchant' };
  return null;
}

export function pickCourierTaskNavigation(
  pkg: Pick<
    Package,
    | 'status'
    | 'sender_address'
    | 'sender_latitude'
    | 'sender_longitude'
    | 'receiver_address'
    | 'receiver_latitude'
    | 'receiver_longitude'
  >,
): {
  address?: string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  kind: CourierTaskTargetKind;
} | null {
  const merchantFirst = isMerchantFirstTask(pkg);
  const senderHasTarget =
    Boolean(String(pkg.sender_address || '').trim()) ||
    (pkg.sender_latitude != null && pkg.sender_longitude != null);
  const receiverHasTarget =
    Boolean(String(pkg.receiver_address || '').trim()) ||
    (pkg.receiver_latitude != null && pkg.receiver_longitude != null);

  if (merchantFirst && senderHasTarget) {
    return {
      address: pkg.sender_address,
      lat: pkg.sender_latitude,
      lng: pkg.sender_longitude,
      kind: 'merchant',
    };
  }
  if (receiverHasTarget) {
    return {
      address: pkg.receiver_address,
      lat: pkg.receiver_latitude,
      lng: pkg.receiver_longitude,
      kind: 'customer',
    };
  }
  if (senderHasTarget) {
    return {
      address: pkg.sender_address,
      lat: pkg.sender_latitude,
      lng: pkg.sender_longitude,
      kind: 'merchant',
    };
  }
  return null;
}

export function dialCourierTaskContact(pkg: Package): CourierTaskTargetKind | null {
  const picked = pickCourierTaskPhone(pkg);
  if (!picked) return null;
  void Linking.openURL(`tel:${picked.phone}`);
  return picked.kind;
}

export function navigateCourierTask(pkg: Package): CourierTaskTargetKind | null {
  const picked = pickCourierTaskNavigation(pkg);
  if (!picked) return null;
  openMapsToAddress(picked.address, picked.lat, picked.lng);
  return picked.kind;
}
