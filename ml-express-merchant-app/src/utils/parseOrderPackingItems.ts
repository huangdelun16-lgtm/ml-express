/**
 * 解析订单 description 中与客户端 HomePage 一致的商品片段（已选商品 / Selected 等），
 * 供商家端「订单打包」弹窗展示明细；金额优先采用描述中的「余额支付」等标签，其次为店铺商品价格表推算。
 * 与 ml-express-merchant-web/src/utils/parseOrderPackingItems.ts 保持一致。
 */

/** 与 handlePrintReceipt / 客户端拼接格式对齐 */
const SELECTED_PRODUCTS_RE =
  /\[(?:已选商品|Selected|Selected Products|ရွေးချယ်ထားသောပစ္စည်း|ရွေးချယ်ထားသောပစ္စည်းများ|ကုန်ပစ္စည်းများ|商品清单): (.*?)\]/;

const ITEM_COST_MMk_RE =
  /\[(?:商品费用 \(仅余额支付\)|Item Cost \(Balance Only\)|ကုန်ပစ္စည်းဖိုး \(လက်ကျန်ငွေဖြင့်သာ\)|余额支付|Balance Payment|လက်ကျန်ငွေဖြင့် ပေးချေခြင်း|平台支付|Platform Payment|ပလက်ဖောင်းမှ ပေးချေခြင်း): (.*?) MMK\]/;

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
    const m = segment.match(/^(.+?)\s*x(\d+)$/i);
    if (!m) {
      const unit = nameToPrice[segment];
      return {
        name: segment,
        qty: 1,
        unitPrice: unit,
        lineTotal: unit != null ? unit : undefined,
      };
    }
    const name = m[1].trim();
    const qty = Number(m[2]) || 1;
    const unit = nameToPrice[name];
    return {
      name,
      qty,
      unitPrice: unit,
      lineTotal: unit != null ? unit * qty : undefined,
    };
  });

  const declaredItemTotal = parseDeclaredItemCostMmk(description);
  const computedSum = rows.reduce((s, r) => s + (r.lineTotal ?? 0), 0);
  const summaryTotal =
    declaredItemTotal != null
      ? declaredItemTotal
      : computedSum > 0
        ? computedSum
        : null;

  return { rows, declaredItemTotal, summaryTotal };
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
  return {
    rows,
    declaredItemTotal,
    summaryTotal,
    customerNote,
    lineCount: rows.length,
  };
}
