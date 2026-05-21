export interface PackageLineItem {
  label: string;
  qty: number;
  price?: number;
}

const ITEMS_IN_DESC_RE =
  /\[(?:已选商品|Selected|Selected Products|ရွေးချယ်ထားသောပစ္စည်းများ|ကုန်ပစ္စည်းများ): (.*?)\]/;

const ITEM_COST_IN_DESC_RE =
  /\[(?:商品费用 \(仅余额支付\)|Item Cost \(Balance Only\)|ကုန်ပစ္စည်းဖိုး \(လက်ကျန်ငွေဖြင့်သာ\)|余额支付|Balance Payment|လက်ကျန်ငွေဖြင့် ပေးချေခြင်း|平台支付|Platform Payment|ပလက်ဖောင်းမှ ပေးချေခြင်း): (.*?) MMK\]/;

export function parsePackageLineItems(
  description: string | null | undefined,
  productPriceMap: Record<string, number> = {},
): PackageLineItem[] {
  if (!description) return [];
  const itemsMatch = description.match(ITEMS_IN_DESC_RE);
  const productItems = itemsMatch ? itemsMatch[1].split(', ') : [];
  return productItems.map((item) => {
    const match = item.match(/^(.+?)\s*x(\d+)$/i);
    if (!match) return { label: item, qty: 1 };
    const name = match[1].trim();
    const qty = Number(match[2]) || 1;
    const unitPrice = productPriceMap[name];
    return {
      label: name,
      qty,
      price: unitPrice ? unitPrice * qty : undefined,
    };
  });
}

export function computePackageOrderTotalMmk(
  pkg: {
    price?: string | null;
    description?: string | null;
  },
  parsedItems: PackageLineItem[],
): number {
  const deliveryFee = parseFloat(pkg.price?.replace(/[^0-9.]/g, '') || '0');
  const itemPayMatch = pkg.description?.match(ITEM_COST_IN_DESC_RE);
  const itemCost = itemPayMatch?.[1]
    ? parseFloat(itemPayMatch[1].replace(/,/g, ''))
    : 0;
  const computedItemTotal = parsedItems.reduce(
    (sum, item) => sum + (item.price || 0),
    0,
  );
  const finalItemTotal = itemCost > 0 ? itemCost : computedItemTotal;
  return deliveryFee + finalItemTotal;
}
