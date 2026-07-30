import type { MerchantReceiptData, MerchantReceiptItem } from './merchantReceiptTemplate';
import { parseDeclaredItemCostMmk } from './parseOrderPackingItems';

export type OrderPrintSource = {
  id: string;
  created_at: string;
  sender_name?: string;
  sender_phone?: string;
  receiver_name?: string;
  receiver_phone?: string;
  receiver_address?: string;
  description?: string;
  price?: string;
  payment_method?: string;
  notes?: string;
  cod_amount?: number;
};

/** 与 parseOrderPackingItems / 商家 Web 端对齐 */
const SELECTED_PRODUCTS_RE =
  /\[(?:已选商品|Selected|Selected Products|ရွေးချယ်ထားသောပစ္စည်း|ရွေးချယ်ထားသောပစ္စည်းများ|ကုန်ပစ္စည်းများ|商品清单): (.*?)\]/;

export function parsePrintableItemsFromDescription(
  description: string,
  productPriceMap?: Record<string, number>,
): MerchantReceiptItem[] {
  const itemsMatch = description.match(SELECTED_PRODUCTS_RE);
  if (!itemsMatch?.[1]) return [];

  return itemsMatch[1].split(', ').map((item) => {
    const match = item.match(/^(.+?)\s*x(\d+)$/i);
    if (!match) {
      return { label: item.trim(), qty: 1, price: undefined };
    }
    const name = match[1].trim();
    const qty = Number(match[2]) || 1;
    const unitPrice = productPriceMap?.[name];
    return {
      label: name,
      qty,
      price: unitPrice ? unitPrice * qty : undefined,
    };
  });
}

export function parseDeliveryFeeMmk(price: string | undefined): number {
  return parseFloat(price?.replace(/[^0-9.]/g, '') || '0');
}

/** 与 App 订单列表 / 商家 Web 展示一致：跑腿费 + 商品代收款(COD) 或 跑腿费 + 商品费 */
export function computeMerchantOrderTotalMmk(
  order: Pick<OrderPrintSource, 'price' | 'description' | 'cod_amount'>,
  productPriceMap?: Record<string, number>,
): number {
  const deliveryFee = parseDeliveryFeeMmk(order.price);
  const codAmount = Number(order.cod_amount || 0);
  if (codAmount > 0) {
    return deliveryFee + codAmount;
  }

  const productItems = parsePrintableItemsFromDescription(order.description || '', productPriceMap);
  const declaredItemCost = parseDeclaredItemCostMmk(order.description);
  const computedItemTotal = productItems.reduce((sum, item) => sum + (item.price || 0), 0);
  const itemTotal =
    declaredItemCost != null && declaredItemCost > 0 ? declaredItemCost : computedItemTotal;
  return deliveryFee + itemTotal;
}

export function orderToMerchantReceipt(
  order: OrderPrintSource,
  productPriceMap?: Record<string, number>,
): MerchantReceiptData {
  const description = order.description || '';
  const productItems = parsePrintableItemsFromDescription(description, productPriceMap);
  const declaredItemCost = parseDeclaredItemCostMmk(description);
  const codAmount = Number(order.cod_amount || 0);
  const deliveryFee = parseDeliveryFeeMmk(order.price);
  const productSum = productItems.reduce((sum, item) => sum + (item.price || 0), 0);

  let items: MerchantReceiptItem[] = [];
  let itemTotal = 0;

  if (codAmount > 0) {
    // COD 单：商品行仅作打包核对（不重复计价），代收款单独一行；合计 = 跑腿费 + COD
    items = productItems.map((item) => ({
      label: item.label,
      qty: item.qty,
      price: undefined,
    }));
    items.push({ label: 'COD Collect', qty: 1, price: codAmount });
    itemTotal = codAmount;
  } else if (productItems.length > 0 && declaredItemCost != null && declaredItemCost > 0 && productSum === 0) {
    items = [{ label: 'Item Cost', qty: 1, price: declaredItemCost }];
    itemTotal = declaredItemCost;
  } else if (productItems.length === 0 && declaredItemCost != null && declaredItemCost > 0) {
    items = [{ label: 'Item Cost', qty: 1, price: declaredItemCost }];
    itemTotal = declaredItemCost;
  } else {
    items = [...productItems];
    itemTotal =
      declaredItemCost != null && declaredItemCost > 0 ? declaredItemCost : productSum;
  }

  return {
    orderId: order.id,
    createdAt: order.created_at,
    senderName: order.sender_name?.trim() || '-',
    senderPhone: order.sender_phone?.trim() || '-',
    receiverName: order.receiver_name?.trim() || '-',
    receiverPhone: order.receiver_phone?.trim() || '-',
    receiverAddress: order.receiver_address?.trim() || '-',
    paymentMethod: order.payment_method || 'cash',
    items,
    itemTotal,
    deliveryFee,
    notes: order.notes?.trim() || undefined,
    isSample: false,
  };
}
