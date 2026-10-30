/** 打包列表搜索：包装号、包裹名、打包人，以及包内订单号和客户名。 */

export type PackSearchLine = {
  item_barcode?: string | null;
  input_barcode?: string | null;
  item_name?: string | null;
  customer_name?: string | null;
};

export type PackSearchFields = {
  bundle_barcode?: string | null;
  bundle_name?: string | null;
  operator?: string | null;
  note?: string | null;
  items?: PackSearchLine[] | null;
};

export function packMatchesKeyword(pack: PackSearchFields, keyword?: string): boolean {
  const q = keyword?.trim().toLowerCase() ?? '';
  if (!q) return true;
  const parts = [pack.bundle_barcode, pack.bundle_name, pack.operator, pack.note];
  for (const line of pack.items ?? []) {
    parts.push(line.item_barcode, line.input_barcode, line.item_name, line.customer_name);
  }
  const haystack = parts
    .map((value) => String(value ?? '').trim().toLowerCase())
    .filter(Boolean)
    .join(' ');
  if (haystack.includes(q)) return true;
  const tokens = q.split(/\s+/).filter(Boolean);
  return tokens.length > 0 && tokens.every((token) => haystack.includes(token));
}
