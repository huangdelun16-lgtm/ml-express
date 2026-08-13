/**
 * 骑手端扫码载荷分类与匹配（取件 / 送达主路径）
 */

export type ScanCodeKind = 'package' | 'transfer' | 'store' | 'unknown';

export function normalizeScanPayload(raw: string): string {
  return String(raw || '').trim();
}

export function classifyScanCode(raw: string): ScanCodeKind {
  const code = normalizeScanPayload(raw);
  if (!code) return 'unknown';
  if (code.startsWith('STORE_')) return 'store';
  if (/^TC[A-Z0-9]+$/i.test(code) || code.startsWith('TC')) return 'transfer';
  // 常见包裹号 / 寄件码
  if (/^(PKG|ML|ORD|COU)/i.test(code) || code.length >= 4) return 'package';
  return 'unknown';
}

export function parseStoreReceiveCode(raw: string): { storeId: string; storeCode: string } | null {
  const code = normalizeScanPayload(raw);
  if (!code.startsWith('STORE_')) return null;
  const parts = code.split('_');
  if (parts.length < 2 || !parts[1]) return null;
  return {
    storeId: parts[1],
    storeCode: parts.length >= 3 ? parts.slice(2).join('_') : '',
  };
}

/** 扫码内容是否对应当前包裹（编号 / 寄件码 / 中转码） */
export function scanMatchesPackage(
  data: string,
  pkg: {
    id?: string;
    sender_code?: string | null;
    transfer_code?: string | null;
    store_receive_code?: string | null;
  } | null | undefined,
): boolean {
  if (!pkg) return false;
  const code = normalizeScanPayload(data);
  if (!code) return false;
  if (pkg.id && code === String(pkg.id).trim()) return true;
  if (pkg.sender_code && code === String(pkg.sender_code).trim()) return true;
  if (pkg.transfer_code && code === String(pkg.transfer_code).trim()) return true;
  if (pkg.store_receive_code && code === String(pkg.store_receive_code).trim()) return true;
  return false;
}

export function isDeliveryStoreScan(data: string): boolean {
  return classifyScanCode(data) === 'store';
}
