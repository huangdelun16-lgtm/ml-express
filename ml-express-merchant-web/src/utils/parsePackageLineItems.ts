import { buildPackingRows } from './parseOrderPackingItems';

export interface PackageLineItem {
  label: string;
  qty: number;
  price?: number;
}

const ITEM_COST_IN_DESC_RE =
  /\[(?:商品费用 \(仅余额支付\)|Item Cost \(Balance Only\)|ကုန်ပစ္စည်းဖိုး \(လက်ကျန်ငွေဖြင့်သာ\)|余额支付|Balance Payment|လက်ကျန်ငွေဖြင့် ပေးချေခြင်း|平台支付|Platform Payment|ပလက်ဖောင်းမှ ပေးချေခြင်း): (.*?) MMK\]/;

export function parsePackageLineItems(
  description: string | null | undefined,
  productPriceMap: Record<string, number> = {},
): PackageLineItem[] {
  const { rows } = buildPackingRows(description ?? undefined, productPriceMap);
  return rows.map((r) => ({
    label: r.name,
    qty: r.qty,
    price: r.lineTotal,
  }));
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
