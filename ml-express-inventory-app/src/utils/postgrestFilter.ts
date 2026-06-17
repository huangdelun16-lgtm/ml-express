/**
 * PostgREST `.or()` / filter 字符串中的值若含逗号、括号等需双引号包裹并转义。
 * 优先使用 Supabase `.eq()` / `.in()`（由客户端编码）；本工具用于必须手写 filter 的场景。
 */
export function escapePostgrestFilterValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^[A-Za-z0-9_*]+$/.test(trimmed)) return trimmed;
  return `"${trimmed.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

export function buildOrEqFilter(
  pairs: ReadonlyArray<{ column: string; value: string }>,
): string {
  return pairs
    .filter((p) => p.value.trim())
    .map(({ column, value }) => `${column}.eq.${escapePostgrestFilterValue(value)}`)
    .join(',');
}
