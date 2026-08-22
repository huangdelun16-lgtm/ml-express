import { svc } from '../errors/serviceError';

export function normalizeExpressCode(code: string): string {
  return code.trim().toUpperCase();
}

export function packagingExpressKey(codes: string[]): string {
  return [...new Set(codes.map(normalizeExpressCode).filter(Boolean))].sort().join('|');
}

export function filterItemsByExpressCodes<T extends { input_barcode?: string | null }>(
  items: T[],
  codes: string[],
): T[] {
  const wanted = new Set(codes.map(normalizeExpressCode).filter(Boolean));
  return items.filter((item) => wanted.has(normalizeExpressCode(item.input_barcode ?? '')));
}

export function assertPackagingExpressMatch(submitted: string[], returned: string[]): void {
  const want = packagingExpressKey(submitted);
  const got = packagingExpressKey(returned);
  if (want && want === got) return;
  throw svc('expressMismatch', {
    submitted: submitted.join('、') || '-',
    returned: returned.join('、') || '-',
  });
}
