/**
 * 商家端商品营收口径（与 App 一致）：仅计商品费/代收款，不含跑腿 price。
 */
const ITEM_COST_BALANCE_ONLY_RE =
  /\[(?:商品费用 \(仅余额支付\)|商品费用（仅余额支付）|Item Cost \(Balance Only\)|ကုန်ပစ္စည်းဖိုး \(လက်ကျန်ငွေဖြင့်သာ\)): (.*?) MMK\]/;

const PAY_TO_MERCHANT_RE =
  /\[(?:付给商家|Pay to Merchant|ဆိုင်သို့ ပေးချေရန်|骑手代付|Courier Advance Pay|ကောင်ရီယာမှ ကြိုတင်ပေးချေခြင်း): (.*?) MMK\]/;

const PLATFORM_BALANCE_BLOB_RE =
  /\[(?:平台支付|Platform Payment|ပလက်ဖောင်းမှ ပေးချေခြင်း|余额支付|Balance Payment|လက်ကျန်ငွေဖြင့် ပေးချေခြင်း): (.*?) MMK\]/;

const DELIVERY_CASH_TAG_RE =
  /\[(?:跑腿费[（(]仅现金[)）]|Delivery fee \(Cash only\)|ပို့ဆောင်ခ[（(]ငွေသားသာ[)）]|跑腿费[（(]现金[)）])\s*:\s*(.*?) MMK\]/i;

function parseMmk(m: RegExpMatchArray | null, group = 1): number {
  if (!m?.[group]) return 0;
  const n = parseFloat(String(m[group]).replace(/,/g, '').trim());
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function getItemCostBalanceMmk(description: string | null | undefined): number {
  if (!description) return 0;
  return parseMmk(description.match(ITEM_COST_BALANCE_ONLY_RE));
}

function getPayToMerchantMmk(description: string | null | undefined): number {
  if (!description) return 0;
  return parseMmk(description.match(PAY_TO_MERCHANT_RE));
}

function getPlatformBalanceGrossMmk(description: string | null | undefined): number {
  if (!description) return 0;
  return parseMmk(description.match(PLATFORM_BALANCE_BLOB_RE));
}

function getDeliveryFeeTagMmkInDescription(description: string | null | undefined): number {
  if (!description) return 0;
  return parseMmk(description.match(DELIVERY_CASH_TAG_RE));
}

export function getProductItemFeeMmkForPackage(row: {
  description?: string | null;
  cod_amount?: number | null;
}): number {
  const d = row.description || '';
  const itemBalance = getItemCostBalanceMmk(d);
  const payToMerch = getPayToMerchantMmk(d);
  const explicitGoodsLine = itemBalance > 0 ? itemBalance : payToMerch;
  const cod = Math.max(0, Number(row.cod_amount) || 0);

  if (explicitGoodsLine > 0) return explicitGoodsLine;
  if (cod > 0) return cod;
  const platGross = getPlatformBalanceGrossMmk(d);
  if (platGross > 0) {
    const delTag = getDeliveryFeeTagMmkInDescription(d);
    return Math.max(0, platGross - delTag);
  }
  return 0;
}
