import type { InventoryStoreSession } from '../services/authService';
import { normalizeDestinationCode } from './destinationCode';
import { resolveStoreHubCode } from './storeZone';

/** 装车车次前缀：与区域短码一致（RUILI→RUI、MUSE→MSE、MDY→MDY） */
export function resolveTripNumberPrefix(store: InventoryStoreSession | null | undefined): string {
  if (!store) return 'PKG';
  const hub = resolveStoreHubCode(store);
  const normalized = normalizeDestinationCode(hub || store.storeCode);
  return normalized || hub.slice(0, 3) || 'PKG';
}

export function formatTripNumber(prefix: string, sequence: number): string {
  const normalized = prefix.trim().toUpperCase().slice(0, 3) || 'PKG';
  return `${normalized}${String(Math.max(1, sequence)).padStart(4, '0')}`;
}

export function isTripNumber(value: string): boolean {
  return /^[A-Z]{3}\d{4}$/.test(value.trim().toUpperCase());
}
