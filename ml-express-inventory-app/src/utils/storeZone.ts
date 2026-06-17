import { PACK_DESTINATION_OPTIONS } from '../constants/destinationOptions';
import type { InventoryStoreSession } from '../services/authService';

/** 从店铺 region / JWT hubCode / store_code 解析本站服务区域码（如 YGN、MDY、MSE） */
export function resolveStoreHubCode(store: InventoryStoreSession): string {
  const fromJwt = store.hubCode?.trim().toUpperCase() ?? '';
  if (fromJwt && (PACK_DESTINATION_OPTIONS as readonly string[]).includes(fromJwt)) {
    return fromJwt;
  }
  const region = store.region?.trim().toUpperCase() ?? '';
  if (region && (PACK_DESTINATION_OPTIONS as readonly string[]).includes(region)) {
    return region;
  }
  const prefix = store.storeCode.replace(/[0-9]/g, '').toUpperCase();
  if (prefix && (PACK_DESTINATION_OPTIONS as readonly string[]).includes(prefix.slice(0, 3))) {
    return prefix.slice(0, 3);
  }
  if (region) return region.slice(0, 3);
  return prefix.slice(0, 3);
}

/** 装车车费路线发站展示（店铺代码字母部分，如 MUSE001 → MUSE） */
export function resolveStoreOriginLabel(store: InventoryStoreSession): string {
  const letters = store.storeCode.replace(/[0-9]/g, '').toUpperCase();
  if (letters) return letters;
  return resolveStoreHubCode(store);
}
