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

export function packagingExpressMismatchMessage(submitted: string[], returned: string[]): string {
  return `提交的快递单与云端保存不一致。提交：${submitted.join('、') || '无'}；保存：${returned.join('、') || '无'}。请重试多个入库。`;
}

export function assertPackagingExpressMatch(submitted: string[], returned: string[]): void {
  const want = packagingExpressKey(submitted);
  const got = packagingExpressKey(returned);
  if (want && want === got) return;
  throw new Error(packagingExpressMismatchMessage(submitted, returned));
}
