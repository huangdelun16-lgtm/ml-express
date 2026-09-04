export type StorePackageMatch = {
  delivery_store_id?: string | null;
  customer_id?: string | null;
  sender_latitude?: number | null;
  sender_longitude?: number | null;
};

/** Packages that belong to a partner store: delivered there, or placed by that store. */
export function packageBelongsToStore(
  pkg: StorePackageMatch,
  storeId: string,
): boolean {
  const id = String(storeId || '').trim();
  if (!id) return false;
  return String(pkg.delivery_store_id || '').trim() === id
    || String(pkg.customer_id || '').trim() === id;
}
