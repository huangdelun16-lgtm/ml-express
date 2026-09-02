/**
 * 解析订单 description 中与客户端 HomePage 一致的商品片段（已选商品 / Selected 等），
 * 供商家端「订单打包」弹窗展示明细；金额优先采用描述中的「余额支付」等标签，其次为店铺商品价格表推算。
 * 与 ml-express-merchant-web/src/utils/parseOrderPackingItems.ts 保持一致。
 */

import { normalizeProductVariants } from "./productVariants";

/** 与 handlePrintReceipt / 客户端拼接格式对齐 */
const SELECTED_PRODUCTS_RE =
  /\[(?:已选商品|Selected|Selected Products|ရွေးချယ်ထားသောပစ္စည်း|ရွေးချယ်ထားသောပစ္စည်းများ|ကုန်ပစ္စည်းများ|商品清单): (.*?)\]/;

const ITEM_COST_MMk_RE =
  /\[(?:商品费用[（(]\s*仅余额支付\s*[）)]|商品费用 \(仅余额支付\)|Item Cost \(Balance Only\)|ကုန်ပစ္စည်းဖိုး[（(]\s*လက်ကျန်ငွေဖြင့်သာ\s*[）)]|ကုန်ပစ္စည်းဖိုး \(လက်ကျန်ငွေဖြင့်သာ\)|余额支付|Balance Payment|လက်ကျန်ငွေဖြင့် ပေးချေခြင်း|平台支付|Platform Payment|ပလက်ဖောင်းမှ ပေးချေခြင်း): (.*?) MMK\]/;

export interface PackingDisplayRow {
  name: string;
  qty: number;
  unitPrice?: number;
  lineTotal?: number;
}

export function parseDeclaredItemCostMmk(
  description: string | undefined,
): number | null {
  if (!description) return null;
  const m = description.match(ITEM_COST_MMk_RE);
  if (!m?.[1]) return null;
  const n = parseFloat(m[1].replace(/,/g, "").trim());
  if (Number.isNaN(n) || n <= 0) return null;
  return n;
}

export function parseSelectedProductSegments(
  description: string | undefined,
): string[] {
  const m = description?.match(SELECTED_PRODUCTS_RE);
  if (!m?.[1]) return [];
  return m[1]
    .split(", ")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 店铺商品 → 名称/规格多维价格表（供订单描述行匹配） */
export function buildProductNamePriceMap(
  products: Array<{ name: string; price: number; variants?: unknown }>,
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const p of products) {
    const baseName = p.name.trim();
    if (!baseName) continue;
    map[baseName] = p.price;
    for (const v of normalizeProductVariants(p.variants)) {
      map[`${baseName} (${v.name})`] = v.price;
      map[v.name] = v.price;
    }
  }
  return map;
}

/** 解析单行：支持「商品名 x1 (规格) x1」等客户端拼接格式 */
export function parseProductOrderSegment(segment: string): {
  displayName: string;
  qty: number;
  lookupKeys: string[];
} {
  const trimmed = segment.trim();
  const qtyTail = trimmed.match(/\s+x(\d+)$/i);
  const qty = qtyTail ? Number(qtyTail[1]) || 1 : 1;
  let namePart = qtyTail
    ? trimmed.slice(0, -qtyTail[0].length).trim()
    : trimmed;

  const variantInParens = namePart.match(/^(.+?)\s+\(([^)]+)\)$/);
  let baseName = variantInParens ? variantInParens[1].trim() : namePart;
  const variantLabel = variantInParens?.[2]?.trim();

  const baseWithoutInlineQty = baseName.replace(/\s+x(\d+)$/i, "").trim();
  if (baseWithoutInlineQty) baseName = baseWithoutInlineQty;

  const lookupKeys = [
    namePart,
    variantLabel ? `${baseName} (${variantLabel})` : baseName,
    baseName,
    variantLabel,
  ].filter((k, i, arr): k is string => !!k && arr.indexOf(k) === i);

  return { displayName: namePart, qty, lookupKeys };
}

function resolveUnitPrice(
  lookupKeys: string[],
  nameToPrice: Record<string, number>,
): number | undefined {
  for (const key of lookupKeys) {
    const price = nameToPrice[key];
    if (price != null && Number.isFinite(price) && price > 0) return price;
  }
  return undefined;
}

/** 描述中有商品总金额但单价未匹配时，按数量分摊到各行 */
function fillRowPricesFromDeclaredTotal(
  rows: PackingDisplayRow[],
  declaredItemTotal: number,
): PackingDisplayRow[] {
  if (rows.length === 0 || declaredItemTotal <= 0) return rows;

  const pricedSum = rows.reduce((s, r) => s + (r.lineTotal ?? 0), 0);
  const unpriced = rows.filter((r) => r.lineTotal == null || r.unitPrice == null);
  if (unpriced.length === 0) return rows;

  const remainder = Math.max(0, declaredItemTotal - pricedSum);
  const amountToSpread = remainder > 0 ? remainder : declaredItemTotal;
  const spreadQty = unpriced.reduce((s, r) => s + r.qty, 0) || rows.length;

  return rows.map((row) => {
    if (row.lineTotal != null && row.unitPrice != null) return row;
    const needsFill = row.lineTotal == null || row.unitPrice == null;
    if (!needsFill) return row;
    const lineTotal =
      spreadQty > 0
        ? (amountToSpread * row.qty) / spreadQty
        : amountToSpread / rows.length;
    const unitPrice = lineTotal / Math.max(1, row.qty);
    return { ...row, unitPrice, lineTotal };
  });
}

export function buildPackingRows(
  description: string | undefined,
  nameToPrice: Record<string, number>,
): {
  rows: PackingDisplayRow[];
  declaredItemTotal: number | null;
  summaryTotal: number | null;
} {
  const segments = parseSelectedProductSegments(description);
  const rows: PackingDisplayRow[] = segments.map((segment) => {
    const { displayName, qty, lookupKeys } = parseProductOrderSegment(segment);
    const unit = resolveUnitPrice(lookupKeys, nameToPrice);
    return {
      name: displayName,
      qty,
      unitPrice: unit,
      lineTotal: unit != null ? unit * qty : undefined,
    };
  });

  const declaredItemTotal = parseDeclaredItemCostMmk(description);
  const pricedRows =
    declaredItemTotal != null
      ? fillRowPricesFromDeclaredTotal(rows, declaredItemTotal)
      : rows;

  const computedSum = pricedRows.reduce((s, r) => s + (r.lineTotal ?? 0), 0);
  const summaryTotal =
    declaredItemTotal != null
      ? declaredItemTotal
      : computedSum > 0
        ? computedSum
        : null;

  return { rows: pricedRows, declaredItemTotal, summaryTotal };
}

/** 去掉系统自动拼接的标签，剩余作为客户备注展示 */
export function stripAutoTagsFromOrderDescription(
  description: string | undefined,
): string {
  if (!description) return "";
  let s = description;
  s = s.replace(SELECTED_PRODUCTS_RE, " ");
  s = s.replace(ITEM_COST_MMk_RE, " ");
  s = s.replace(
    /\[付给商家:.*?\]|\[Pay to Merchant:.*?\]|\[ဆိုင်သို့ ပေးချေရန်:.*?\]|\[骑手代付:.*?\]|\[Courier Advance Pay:.*?\]|\[ကောင်ရီယာမှ ကြိုတင်ပေးချေခြင်း:.*?\]/g,
    " ",
  );
  return s.replace(/\s+/g, " ").trim();
}

export function getPackingModalModel(
  description: string | undefined,
  nameToPrice: Record<string, number>,
) {
  const { rows, declaredItemTotal, summaryTotal } = buildPackingRows(
    description,
    nameToPrice,
  );
  const customerNote = stripAutoTagsFromOrderDescription(description);
  const totalQty = rows.reduce((sum, r) => sum + r.qty, 0);
  const computedLineSum = rows.reduce((sum, r) => sum + (r.lineTotal ?? 0), 0);
  return {
    rows,
    declaredItemTotal,
    summaryTotal,
    totalQty,
    computedLineSum: computedLineSum > 0 ? computedLineSum : null,
    customerNote,
    lineCount: rows.length,
  };
}
