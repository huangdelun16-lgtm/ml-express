import { extractDestinationCode } from './inboundBarcode';

/** 发站地区码 → 包装号前缀（3 位，替代原 PKG） */
export function normalizePackageOriginPrefix(origin: string): string {
  const raw = origin.trim().toUpperCase();
  if (!raw) return 'PKG';
  if (raw.startsWith('RUILI') || raw === 'RUI') return 'RUI';
  if (raw.startsWith('MUSE') || raw === 'MSE' || raw === 'MUS') return 'MSE';
  const letters = raw.replace(/[0-9]/g, '');
  if (letters.startsWith('RUILI')) return 'RUI';
  if (letters.startsWith('MUSE')) return 'MSE';
  if (letters.length >= 3) return letters.slice(0, 3);
  return raw.padEnd(3, 'X').slice(0, 3);
}

/**
 * 包装号主体：发站码 + 年份后两位 + 目的地码 + 件数
 * 例：瑞丽发 MDY、2026 年、4 件 → RUI26MDY4（末尾再接 0001 流水号）
 * 旧格式 PKG 仍可读。
 */
export function buildPackageNumberBody(
  destination: string,
  itemCount: number,
  originPrefix = 'PKG',
  at = new Date(),
): string {
  const yearPart = String(at.getFullYear()).slice(-2);
  const dest = extractDestinationCode(destination);
  const count = Math.max(1, itemCount);
  const origin = normalizePackageOriginPrefix(originPrefix);
  return `${origin}${yearPart}${dest}${count}`;
}

export function formatPackageSequence(seq: number): string {
  return String(seq).padStart(4, '0');
}

export function parsePackageBarcode(barcode: string): {
  origin: string;
  destination: string;
  pieceCount: number;
  sequence: string;
} | null {
  const code = barcode.trim().toUpperCase();
  const match = code.match(/^([A-Z]{3})(\d{2})([A-Z]{3})(\d+)(\d{4})$/);
  if (!match) return null;
  return {
    origin: match[1],
    destination: match[3],
    pieceCount: Number(match[4]) || 0,
    sequence: match[5],
  };
}

export function isPackageBarcode(barcode: string): boolean {
  return parsePackageBarcode(barcode) !== null;
}

/** 解析包装号 → 目的地（如 RUI26MDY20002 → MDY） */
export function packDestinationFromBarcode(barcode: string): string {
  return parsePackageBarcode(barcode)?.destination ?? '';
}

/** 解析包装号 → 发站前缀（如 RUI26MDY20002 → RUI） */
export function packOriginFromBarcode(barcode: string): string {
  return parsePackageBarcode(barcode)?.origin ?? '';
}

/** SQL：排除快递包壳商品（任意发站前缀，不限 PKG） */
export const SQL_EXCLUDE_BUNDLE_SHELL_ITEMS = `NOT EXISTS (
  SELECT 1 FROM packed_shipments p
  WHERE UPPER(TRIM(p.bundle_barcode)) = UPPER(TRIM(i.barcode))
)`;
