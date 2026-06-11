import { extractDestinationCode } from './inboundBarcode';

/**
 * 包装号主体：PKG + 年份后两位 + 目的地码 + 件数
 * 例：2026 年、YGN、2 件 → PKG26YGN2（末尾再接 0001 流水号）
 */
export function buildPackageNumberBody(
  destination: string,
  itemCount: number,
  at = new Date(),
): string {
  const yearPart = String(at.getFullYear()).slice(-2);
  const dest = extractDestinationCode(destination);
  const count = Math.max(1, itemCount);
  return `PKG${yearPart}${dest}${count}`;
}

export function formatPackageSequence(seq: number): string {
  return String(seq).padStart(4, '0');
}

/** 解析包装号 PKG26YGN20002 → 目的地 YGN、件数 2 等 */
export function packDestinationFromBarcode(barcode: string): string {
  return parsePackageBarcode(barcode)?.destination ?? '';
}

export function parsePackageBarcode(barcode: string): {
  destination: string;
  pieceCount: number;
  sequence: string;
} | null {
  const code = barcode.trim().toUpperCase();
  const match = code.match(/^PKG(\d{2})([A-Z]{3})(\d+)(\d{4})$/);
  if (!match) return null;
  return {
    destination: match[2],
    pieceCount: Number(match[3]) || 0,
    sequence: match[4],
  };
}
