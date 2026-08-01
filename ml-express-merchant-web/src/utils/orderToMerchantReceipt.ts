import type { MerchantReceiptItem } from './merchantReceiptTemplate';
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

const SELECTED_PRODUCTS_RE =
  /\[(?:已选商品|Selected|Selected Products|ရွေးချယ်ထားသောပစ္စည်း|ရွေးချယ်ထားသောပစ္စည်းများ|ကုန်ပစ္စည်းများ|商品清单): (.*?)\]/;

export function parsePrintableItemsFromDescription(
  description: string,
  productPriceMap?: Record<string, number>,
): MerchantReceiptItem[] {
  const itemsMatch = description.match(SELECTED_PRODUCTS_RE);
  if (!itemsMatch?.[1]) return [];

  return itemsMatch[1]
    .split(', ')
    .flatMap((item): MerchantReceiptItem[] => {
      const match = item.match(/^(.+?)\s*x(\d+)$/i);
      if (!match) {
        const name = item.trim();
        if (!name) return [];
        const unitPrice = productPriceMap?.[name];
        return [{ label: name, qty: 1, unitPrice, price: unitPrice }];
      }
      const name = match[1].trim();
      if (!name) return [];
      const qty = Number(match[2]) || 1;
      const unitPrice = productPriceMap?.[name];
      return [
        {
          label: name,
          qty,
          unitPrice,
          price: unitPrice != null ? unitPrice * qty : undefined,
        },
      ];
    });
}

export function parseDeliveryFeeMmk(price: string | undefined): number {
  return parseFloat(price?.replace(/[^0-9.]/g, '') || '0');
}

export function orderToMerchantReceipt(
  order: OrderPrintSource,
  productPriceMap?: Record<string, number>,
) {
  const description = order.description || '';
  const productItems = parsePrintableItemsFromDescription(description, productPriceMap);
  const declaredItemCost = parseDeclaredItemCostMmk(description);
  const codAmount = Number(order.cod_amount || 0);
  const deliveryFee = parseDeliveryFeeMmk(order.price);
  const productSum = productItems.reduce((sum, item) => sum + (item.price || 0), 0);

  let items: MerchantReceiptItem[] = [];
  let itemTotal = 0;

  if (codAmount > 0) {
    items = productItems.map((item) => ({
      label: item.label,
      qty: item.qty,
      unitPrice: item.unitPrice,
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
    itemTotal = declaredItemCost != null && declaredItemCost > 0 ? declaredItemCost : productSum;
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
