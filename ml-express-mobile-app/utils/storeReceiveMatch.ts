export function matchPackagesForStoreReceive<T extends {
  delivery_store_id?: string | null;
  store_receive_code?: string | null;
}>(
  packages: T[],
  storeId: string,
  receiveCode?: string,
): T[] {
  const id = String(storeId || '').trim();
  const code = String(receiveCode || '').trim();
  if (!packages?.length) return [];
  if (!id && !code) return [];
  return packages.filter((pkg) => {
    if (id && String(pkg.delivery_store_id || '').trim() === id) return true;
    if (code && String(pkg.store_receive_code || '').trim() === code) return true;
    return false;
  });
}

export function distanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const R = 6371e3;
  const p1 = (a.latitude * Math.PI) / 180;
  const p2 = (b.latitude * Math.PI) / 180;
  const dp = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dl = ((b.longitude - a.longitude) * Math.PI) / 180;
  const x =
    Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
