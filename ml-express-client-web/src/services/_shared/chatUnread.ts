// ⚠️ AUTO-GENERATED from /shared/src — 请勿在此文件直接修改。
// 修改请编辑 /shared/src 下的源文件，并运行 "npm run sync:shared"。

/**
 * 聊天未读计数：把 REST 行聚合成 order_id → 条数。
 * 纯逻辑，无 DOM / React Native / supabase 依赖。
 */

export function unreadCountsFromRows(
  rows: Array<{ order_id?: string | null }> | null | undefined,
): Record<string, number> {
  const counts: Record<string, number> = {};
  (rows || []).forEach((msg) => {
    const id = String(msg?.order_id || '').trim();
    if (!id) return;
    counts[id] = (counts[id] || 0) + 1;
  });
  return counts;
}

export function unreadCountsFingerprint(counts: Record<string, number>): string {
  return Object.keys(counts)
    .sort()
    .map((id) => `${id}:${counts[id] || 0}`)
    .join('|');
}
