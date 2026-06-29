import { PACK_DESTINATION_OPTIONS } from '../constants/destinationOptions';
import type { InventoryStoreSession } from '../services/authService';
import { extractDestinationCode } from './inboundBarcode';
import { packDestinationFromBarcode } from './packageNumber';

/** 木姐区域：店铺 MUSE* 与入库条码前缀 MSE/MUS 视为同一归属 */
/** 瑞丽区域：店铺 RUILI* 与入库条码前缀 RUI 视为同一归属 */
export function normalizeOwnerKey(key: string): string {
  const code = key.trim().toUpperCase();
  if (!code) return '';
  if (code.startsWith('ADMIN')) return 'ADMIN';
  if (code.startsWith('MUSE') || code === 'MSE' || code === 'MUS') return 'MUSE';
  if (code.startsWith('RUILI') || code === 'RUI') return 'RUILI';
  const letters = code.replace(/[0-9]/g, '');
  const token = letters.length >= 3 ? letters.slice(0, 3) : code.slice(0, 3);
  if (token === 'MSE' || token === 'MUS') return 'MUSE';
  if (token === 'RUI') return 'RUILI';
  return token;
}

/** 从店铺代码解析归属键：MUSE001→MUSE，YGN002→YGN，ADMIN001→ADMIN */
export function ownershipKeyFromStoreCode(storeCode: string): string {
  return normalizeOwnerKey(storeCode);
}

export function ownershipLabelFromKey(key: string): string {
  const k = normalizeOwnerKey(key);
  if (k === 'MUSE') return '木姐 MUSE';
  if (k === 'RUILI') return '瑞丽 RUILI';
  if (k === 'ADMIN') return 'Admin';
  return k;
}

export function ownershipLabelFromStoreCode(storeCode: string): string {
  return ownershipLabelFromKey(ownershipKeyFromStoreCode(storeCode));
}

export function isAdminStore(store: InventoryStoreSession): boolean {
  return ownershipKeyFromStoreCode(store.storeCode) === 'ADMIN';
}

/** 从商品条码 / 目的地推断归属区域（用于历史数据） */
export function inferOwnerKeyFromItem(item: {
  barcode: string;
  destination?: string;
}): string {
  const barcode = item.barcode.trim().toUpperCase();
  if (barcode.startsWith('PKG')) {
    const dest = packDestinationFromBarcode(barcode);
    if (dest) return normalizeOwnerKey(dest);
  }

  const prefix3 = barcode.slice(0, 3);
  if ((PACK_DESTINATION_OPTIONS as readonly string[]).includes(prefix3)) {
    return normalizeOwnerKey(prefix3);
  }
  if (prefix3 === 'MSE' || prefix3 === 'MUS') return 'MUSE';
  if (prefix3 === 'RUI') return 'RUILI';
  if (/^[A-Z]{3}$/.test(prefix3)) return normalizeOwnerKey(prefix3);

  if (item.destination?.trim()) {
    return normalizeOwnerKey(extractDestinationCode(item.destination));
  }
  return '';
}

/** 列表/弹窗用：解析订单归属区域键 */
export function resolveOwnerKeyForListItem(item: {
  owner_store_code?: string;
  barcode: string;
  destination?: string;
}): string {
  if (item.owner_store_code?.trim()) {
    return ownershipKeyFromStoreCode(item.owner_store_code);
  }
  return inferOwnerKeyFromItem(item);
}

export function toComparableOwnerKey(ownerRef: string | null | undefined): string {
  const raw = ownerRef?.trim();
  if (!raw) return '';
  if (/^\d/.test(raw) || raw.length > 5) {
    return ownershipKeyFromStoreCode(raw);
  }
  return normalizeOwnerKey(raw);
}

/**
 * 当前店铺是否可编辑该归属订单/包裹。
 * Admin 可编辑全部；其它站仅可编辑同区域归属数据。
 */
export function canEditOwnedRecord(
  current: InventoryStoreSession,
  ownerRef: string | null | undefined,
): boolean {
  if (isAdminStore(current)) return true;
  const ownerKey = toComparableOwnerKey(ownerRef);
  const currentKey = ownershipKeyFromStoreCode(current.storeCode);
  if (!ownerKey) return false;
  return currentKey === ownerKey;
}

export function editDeniedMessage(ownerRef: string | null | undefined): string {
  const ownerKey = toComparableOwnerKey(ownerRef);
  if (!ownerKey) {
    return '无法识别该订单入库站点，仅 Admin 账号可编辑。';
  }
  const label = ownershipLabelFromKey(ownerKey);
  return `该订单由「${label}」区域入库登记，仅 ${label} 账号与 Admin 账号可编辑内容。`;
}

type PackContentItemRef = {
  owner_store_code?: string;
  barcode: string;
  destination?: string;
};

/** 包裹内任一订单非本站入库时，规格/重量仅发站可改 */
export function isPackContentLockedForStore(
  store: InventoryStoreSession,
  items: PackContentItemRef[],
): boolean {
  if (isAdminStore(store)) return false;
  return items.some(
    (item) => !canEditOwnedRecord(store, resolveOwnerKeyForListItem(item)),
  );
}

export function packContentLockHint(
  store: InventoryStoreSession,
  items: PackContentItemRef[],
): string | undefined {
  if (isAdminStore(store)) return undefined;
  const locked = items.find(
    (item) => !canEditOwnedRecord(store, resolveOwnerKeyForListItem(item)),
  );
  if (!locked) return undefined;
  const ownerKey = resolveOwnerKeyForListItem(locked);
  const label = ownershipLabelFromKey(ownerKey);
  return `规格与重量沿用「${label}」入库登记，仅该区域账号可修改。`;
}
