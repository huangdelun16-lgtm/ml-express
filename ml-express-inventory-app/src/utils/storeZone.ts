import { normalizePackDestination, PACK_DESTINATION_OPTIONS } from '../constants/destinationOptions';
import type { InventoryStoreSession } from '../services/authService';
import { destinationCodesMatch } from './destinationCode';

/** 从店铺 region / JWT hubCode / store_code 解析本站服务区域码（如 YGN、MDY、MSE、RUI） */
export function resolveStoreHubCode(store: InventoryStoreSession): string {
  const fromJwt = normalizePackDestination(store.hubCode ?? '');
  if (fromJwt) return fromJwt;
  const regionNorm = normalizePackDestination(store.region ?? '');
  if (regionNorm) return regionNorm;
  const region = store.region?.trim().toUpperCase() ?? '';
  const prefix = store.storeCode.replace(/[0-9]/g, '').toUpperCase();
  if (prefix && (PACK_DESTINATION_OPTIONS as readonly string[]).includes(prefix.slice(0, 3))) {
    return prefix.slice(0, 3);
  }
  if (region) return normalizePackDestination(region) || region.slice(0, 3);
  return prefix.slice(0, 3);
}

/** 装车车费路线发站展示（店铺代码字母部分，如 MUSE001 → MUSE） */
export function resolveStoreOriginLabel(store: InventoryStoreSession): string {
  const letters = store.storeCode.replace(/[0-9]/g, '').toUpperCase();
  if (letters) return letters;
  return resolveStoreHubCode(store);
}

/** 装车出库可选目的地（排除本站，MDY 不可选 MDY、木姐/MUSE 不可选 MSE 等） */
export function listOutboundDestinationOptions(store: InventoryStoreSession | null | undefined): string[] {
  if (!store) return [...PACK_DESTINATION_OPTIONS];
  const hub = resolveStoreHubCode(store);
  return PACK_DESTINATION_OPTIONS.filter((opt) => !destinationCodesMatch(opt, hub));
}

/** 目的地是否为本站（不可作为装车出库目的地） */
export function isOwnStationOutboundDestination(
  destination: string,
  store: InventoryStoreSession,
): boolean {
  const hub = resolveStoreHubCode(store);
  if (!hub || !destination.trim()) return false;
  return destinationCodesMatch(destination, hub);
}
