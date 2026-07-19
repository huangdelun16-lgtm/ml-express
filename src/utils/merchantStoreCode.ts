/** 与 netlify/functions/utils/merchantApplication.js resolveNextMerchantStoreCode 一致 */
export function resolveNextStoreCodeFromPrefix(
  prefix: string,
  existingCodes: ReadonlyArray<string | null | undefined>,
): string {
  const normalizedPrefix = prefix.trim().toUpperCase();
  const escapedPrefix = normalizedPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const suffixRe = new RegExp(`^${escapedPrefix}(\\d+)$`, 'i');
  let maxSuffix = 0;

  for (const raw of existingCodes) {
    const code = String(raw ?? '').trim().toUpperCase();
    const match = code.match(suffixRe);
    if (match) {
      maxSuffix = Math.max(maxSuffix, Number.parseInt(match[1], 10));
    }
  }

  return `${normalizedPrefix}${String(maxSuffix + 1).padStart(3, '0')}`;
}

export function collectStoreCodesForPrefix(
  stores: readonly { store_code?: string | null }[],
  prefix: string,
): string[] {
  const normalizedPrefix = prefix.trim().toUpperCase();
  return stores
    .map((store) => String(store.store_code ?? '').trim().toUpperCase())
    .filter((code) => code.startsWith(normalizedPrefix));
}

export function resolveNextStoreCodeForPrefix(
  prefix: string,
  stores: readonly { store_code?: string | null }[],
): string {
  return resolveNextStoreCodeFromPrefix(prefix, collectStoreCodesForPrefix(stores, prefix));
}

export function isStoreCodeTaken(
  code: string,
  stores: readonly { store_code?: string | null }[],
): boolean {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return false;
  return stores.some((store) => String(store.store_code ?? '').trim().toUpperCase() === normalized);
}
