export type StoreLicenseLookup = {
  id?: string | null;
  store_code?: string | null;
  phone?: string | null;
  store_name?: string | null;
};

export type ApplicationLicenseMatch = {
  created_store_id?: string | null;
  provisioned_store_code?: string | null;
  phone?: string | null;
  store_name?: string | null;
  status?: string | null;
  created_at?: string | null;
  license_document_urls?: unknown;
};

function digits(value: string | null | undefined): string {
  return String(value || '').replace(/\D/g, '');
}

export function uniqueLicenseDocumentUrls(urls: unknown): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const list = Array.isArray(urls) ? urls : [];
  for (const raw of list) {
    const url = String(raw || '').trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

export function applicationMatchesStore(
  app: ApplicationLicenseMatch,
  store: StoreLicenseLookup,
): boolean {
  const storeId = String(store.id || '').trim();
  if (storeId && String(app.created_store_id || '').trim() === storeId) return true;

  const storeCode = String(store.store_code || '').trim().toUpperCase();
  if (storeCode && String(app.provisioned_store_code || '').trim().toUpperCase() === storeCode) {
    return true;
  }

  const storePhone = digits(store.phone);
  const storeName = String(store.store_name || '').trim().toLowerCase();
  const appPhone = digits(app.phone);
  const appName = String(app.store_name || '').trim().toLowerCase();
  return Boolean(storePhone && storeName && storePhone === appPhone && storeName === appName);
}

export function pickLicenseUrlsForStore(
  apps: ApplicationLicenseMatch[],
  store: StoreLicenseLookup,
): string[] {
  const matched = (apps || []).filter((app) => applicationMatchesStore(app, store));
  if (!matched.length) return [];

  const ranked = [...matched].sort((a, b) => {
    const aApproved = a.status === 'approved' ? 1 : 0;
    const bApproved = b.status === 'approved' ? 1 : 0;
    if (aApproved !== bApproved) return bApproved - aApproved;
    return String(b.created_at || '').localeCompare(String(a.created_at || ''));
  });

  for (const app of ranked) {
    const urls = uniqueLicenseDocumentUrls(app.license_document_urls);
    if (urls.length) return urls;
  }
  return [];
}
