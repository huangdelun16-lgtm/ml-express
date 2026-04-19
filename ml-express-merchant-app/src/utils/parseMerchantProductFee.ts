/**
 * 从订单 description 中解析「商品费用」声明金额（与商家 Web parseOrderPackingItems 一致，并含现金支付标签）。
 * 不包含「跑腿费」——price 字段不在此解析。
 */
const DECLARED_PRODUCT_FEE_RE =
  /\[(?:商品费用 \(仅余额支付\)|Item Cost \(Balance Only\)|ကုန်ပစ္စည်းဖိုး \(လက်ကျန်ငွေဖြင့်သာ\)|余额支付|Balance Payment|လက်ကျန်ငွေဖြင့် ပေးချေခြင်း|平台支付|Platform Payment|ပလက်ဖောင်းမှ ပေးချေခြင်း|现金支付|Cash Payment|ငွေသားဖြင့် ပေးချေခြင်း): (.*?) MMK\]/;

export function parseDeclaredProductFeeMmk(
  description: string | undefined | null,
): number | null {
  if (!description) return null;
  const m = description.match(DECLARED_PRODUCT_FEE_RE);
  if (!m?.[1]) return null;
  const n = parseFloat(m[1].replace(/,/g, "").trim());
  if (Number.isNaN(n) || n <= 0) return null;
  return n;
}

/**
 * 单笔已送达订单的商品费：优先描述中的声明金额，否则代收金额（与商城/商家下单习惯一致）。
 */
export function getProductFeeMmkForPackage(row: {
  description?: string | null;
  cod_amount?: number | null;
}): number {
  const fromDesc = parseDeclaredProductFeeMmk(row.description);
  if (fromDesc != null && fromDesc > 0) return fromDesc;
  const cod = Number(row.cod_amount);
  if (!Number.isNaN(cod) && cod > 0) return cod;
  return 0;
}
