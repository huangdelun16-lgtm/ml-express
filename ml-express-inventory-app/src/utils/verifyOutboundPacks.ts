import type { InventoryStoreSession } from '../services/authService';
import type { PackedShipmentDetail } from '../types/inventory';

/** 装车列表只保留能在云端落库（或补写成功）的包，丢掉仅存在于内存缓存的幽灵 PKG */
export async function verifyOutboundPacksForLoad(
  packs: PackedShipmentDetail[],
  store: InventoryStoreSession,
  register: (pack: PackedShipmentDetail, store: InventoryStoreSession) => Promise<boolean>,
): Promise<PackedShipmentDetail[]> {
  const rows = await Promise.all(
    packs.map(async (pack) => {
      try {
        return (await register(pack, store)) ? pack : null;
      } catch {
        return null;
      }
    }),
  );
  return rows.filter((pack): pack is PackedShipmentDetail => pack != null);
}
