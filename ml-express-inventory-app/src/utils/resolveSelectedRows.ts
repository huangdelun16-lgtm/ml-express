/** 搜索只收窄眼前的列表。已勾选的订单还在，下一步要按勾选集合来，不能只看当前搜索结果。 */
export function resolveSelectedRows<T extends { id: string }>(
  visible: readonly T[],
  selectedIds: Iterable<string>,
  remembered: ReadonlyMap<string, T>,
): T[] {
  const byId = new Map(visible.map((row) => [row.id, row]));
  const rows: T[] = [];
  for (const id of selectedIds) {
    const row = byId.get(id) ?? remembered.get(id);
    if (row) rows.push(row);
  }
  return rows;
}
