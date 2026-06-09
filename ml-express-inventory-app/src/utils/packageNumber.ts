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
