/**
 * 商家端「商品总营收」：仅计 商品费 + 商品代收款（含描述中的付给商家/商品余额、cod_amount 等）；
 * 绝不把 package.price / 描述中的「跑腿费（仅现金）」等跑腿金额计入本字段。
 *
 * 与 Admin `getItemBalanceProductFeeFromDescription` / 付给商家 标签口径对齐。
 */

const ITEM_COST_BALANCE_ONLY_RE =
  /\[(?:商品费用 \(仅余额支付\)|商品费用（仅余额支付）|Item Cost \(Balance Only\)|ကုန်ပစ္စည်းဖိုး \(လက်ကျန်ငွေဖြင့်သာ\)): (.*?) MMK\]/;

const PAY_TO_MERCHANT_RE =
  /\[(?:付给商家|Pay to Merchant|ဆိုင်သို့ ပေးချေရန်|骑手代付|Courier Advance Pay|ကောင်ရီယာမှ ကြိုတင်ပေးချေခြင်း): (.*?) MMK\]/;

/** 平台/余额/付给 整段（可能含 跑腿+商品 合并；仅作兜底并在能解析跑腿时相减） */
const PLATFORM_BALANCE_BLOB_RE =
  /\[(?:平台支付|Platform Payment|ပလက်ဖောင်းမှ ပေးချေခြင်း|余额支付|Balance Payment|လက်ကျန်ငွေဖြင့် ပေးချေခြင်း): (.*?) MMK\]/;

/** 描述中单独标出的「跑腿费（仅现金）」等，从合并支付里扣减用 */
const DELIVERY_CASH_TAG_RE =
  /\[(?:跑腿费[（(]仅现金[)）]|Delivery fee \(Cash only\)|ပို့ဆောင်ခ[（(]ငွေသားသာ[)）]|跑腿费[（(]现金[)）])\s*:\s*(.*?) MMK\]/i;

function parseMmk(m: RegExpMatchArray | null, group = 1): number {
  if (!m?.[group]) return 0;
  const n = parseFloat(String(m[group]).replace(/,/g, "").trim());
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function getItemCostBalanceMmk(
  description: string | null | undefined,
): number {
  if (!description) return 0;
  return parseMmk(description.match(ITEM_COST_BALANCE_ONLY_RE));
}

export function getPayToMerchantMmk(
  description: string | null | undefined,
): number {
  if (!description) return 0;
  return parseMmk(description.match(PAY_TO_MERCHANT_RE));
}

function getPlatformBalanceGrossMmk(
  description: string | null | undefined,
): number {
  if (!description) return 0;
  return parseMmk(description.match(PLATFORM_BALANCE_BLOB_RE));
}

function getDeliveryFeeTagMmkInDescription(
  description: string | null | undefined,
): number {
  if (!description) return 0;
  return parseMmk(description.match(DELIVERY_CASH_TAG_RE));
}

/**
 * 单笔已送达：商品费/代收款合计（MMK），不含 price 存储的跑腿费。
 */
export function getProductFeeMmkForPackage(row: {
  description?: string | null;
  cod_amount?: number | null;
}): number {
  const d = row.description || "";
  const itemBalance = getItemCostBalanceMmk(d);
  const payToMerch = getPayToMerchantMmk(d);
  const explicitGoodsLine = itemBalance > 0 ? itemBalance : payToMerch;
  const cod = Math.max(0, Number(row.cod_amount) || 0);

  if (explicitGoodsLine > 0) {
    return explicitGoodsLine + cod;
  }
  if (cod > 0) {
    return cod;
  }

  const platGross = getPlatformBalanceGrossMmk(d);
  if (platGross > 0) {
    const delTag = getDeliveryFeeTagMmkInDescription(d);
    return Math.max(0, platGross - delTag);
  }

  return 0;
}

/**
 * 单笔：仅计「商品费用」MMK（不含跑腿、不含在描述中与「付给商家/商品费」分行并列的代收款 cod）；
 * 有 [商品费]/[付给商家] 时只取该标签金额；无分栏时仅有 cod 则计为货款。
 */
export function getProductItemFeeMmkForPackage(row: {
  description?: string | null;
  cod_amount?: number | null;
}): number {
  const d = row.description || "";
  const itemBalance = getItemCostBalanceMmk(d);
  const payToMerch = getPayToMerchantMmk(d);
  const explicitGoodsLine = itemBalance > 0 ? itemBalance : payToMerch;
  const cod = Math.max(0, Number(row.cod_amount) || 0);

  if (explicitGoodsLine > 0) {
    return explicitGoodsLine;
  }
  if (cod > 0) {
    return cod;
  }
  const platGross = getPlatformBalanceGrossMmk(d);
  if (platGross > 0) {
    const delTag = getDeliveryFeeTagMmkInDescription(d);
    return Math.max(0, platGross - delTag);
  }
  return 0;
}
