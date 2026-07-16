/** 将稳定业务键映射为 UUID，供 PostgreSQL operation_id 幂等锁使用。 */
export function inventoryOperationId(kind: string, businessKey: string): string {
  const input = `${kind.trim().toLowerCase()}:${businessKey.trim().toUpperCase()}`;
  let a = 0x811c9dc5;
  let b = 0x9e3779b9;
  let c = 0x85ebca6b;
  let d = 0xc2b2ae35;
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    a = Math.imul(a ^ code, 0x01000193);
    b = Math.imul(b ^ code, 0x27d4eb2d);
    c = Math.imul(c ^ code, 0x165667b1);
    d = Math.imul(d ^ code, 0x9e3779b1);
  }
  const hex = [a, b, c, d]
    .map((value) => (value >>> 0).toString(16).padStart(8, '0'))
    .join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function canReleaseTransitManually(input: {
  packageStatus: string;
  hasTransitOrders: boolean;
  hasUnreleasedTransitOrders: boolean;
}): boolean {
  return (
    (input.packageStatus === 'hub_received' || input.packageStatus === 'completed') &&
    input.hasTransitOrders &&
    input.hasUnreleasedTransitOrders
  );
}
