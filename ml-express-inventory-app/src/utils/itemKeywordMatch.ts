/** 快递查询 / 明细列表共用的关键词匹配（仅本地已拉缓存，不改 RPC） */

export type ItemKeywordFields = {
  barcode?: string | null;
  input_barcode?: string | null;
  name?: string | null;
  spec?: string | null;
  unit?: string | null;
  weight?: string | null;
  note?: string | null;
  recipient_name?: string | null;
  customer_name?: string | null;
  final_destination?: string | null;
  destination?: string | null;
  parent_pack_barcode?: string | null;
  packed_bundle_barcode?: string | null;
  owner_store_code?: string | null;
  customer_sign_phone?: string | null;
  pack_item_label?: string | null;
};

export function itemKeywordHaystack(item: ItemKeywordFields): string {
  return [
    item.barcode,
    item.input_barcode,
    item.name,
    item.spec,
    item.unit,
    item.weight,
    item.note,
    item.recipient_name,
    item.customer_name,
    item.final_destination,
    item.destination,
    item.parent_pack_barcode,
    item.packed_bundle_barcode,
    item.owner_store_code,
    item.customer_sign_phone,
    item.pack_item_label,
  ]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

/** 任意单词命中即可；多词时每个词都要出现在包裹字段里 */
export function itemMatchesKeyword(item: ItemKeywordFields, keyword?: string): boolean {
  const q = keyword?.trim().toLowerCase() ?? '';
  if (!q) return true;
  const haystack = itemKeywordHaystack(item);
  if (haystack.includes(q)) return true;
  const tokens = q.split(/\s+/).filter(Boolean);
  return tokens.length > 0 && tokens.every((token) => haystack.includes(token));
}
