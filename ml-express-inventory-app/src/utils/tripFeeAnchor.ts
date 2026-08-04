const tripFeeAnchorByGroup = new Map<string, string>();

function code(value: string): string {
  return value.trim().toUpperCase();
}

/**
 * 本 App 会话：同一车次内最先打开的 PKG 负责展示「支付车费」按钮。
 * 单包车次（group 以 pack: 开头）始终返回当前包。
 */
export function claimTripFeeAnchorIfUnset(tripGroupKey: string, openedPackBarcode: string): string {
  const group = tripGroupKey.trim();
  const pack = code(openedPackBarcode);
  if (!group || group.startsWith('pack:')) return pack;
  const existing = tripFeeAnchorByGroup.get(group);
  if (existing) return existing;
  tripFeeAnchorByGroup.set(group, pack);
  return pack;
}

export function getTripFeeAnchorPack(tripGroupKey: string): string | null {
  const group = tripGroupKey.trim();
  if (!group || group.startsWith('pack:')) return null;
  return tripFeeAnchorByGroup.get(group) ?? null;
}

export function clearTripFeeAnchorCache(): void {
  tripFeeAnchorByGroup.clear();
}
