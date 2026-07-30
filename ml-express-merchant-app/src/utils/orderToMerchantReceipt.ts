import type { MerchantReceiptData, MerchantReceiptItem } from './merchantReceiptTemplate';

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

export function parsePrintableItemsFromDescription(
  description: string,
  productPriceMap?: Record<string, number>,
): MerchantReceiptItem[] {
  const itemsMatch = description.match(
    /\[(?:已选商品|Selected|Selected Products|ရွေးချယ်ထားသောပစ္စည်းများ|ကုန်ပစ္စည်းများ): (.*?)\]/,
  );
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

export function parseItemCostFromDescription(description: string): number {
  const match = description.match(
    /\[(?:商品费用|Item Cost|ကုန်ပစ္စည်းဖိုး|平台支付|Platform Payment|ပလက်ဖောင်းမှ ပေးချေခြင်း|余额支付|Balance Payment|လက်ကျန်ငွေဖြင့် ပေးချေခြင်း)\s*[\(（]?.*?[\)）]?\s*:\s*(.*?)\s*MMK\]/i,
  );
  if (match?.[1]) {
    return parseFloat(match[1].replace(/,/g, ''));
  }
  return 0;
}

export function orderToMerchantReceipt(
  order: OrderPrintSource,
  productPriceMap?: Record<string, number>,
): MerchantReceiptData {
  const description = order.description || '';
  const productItems = parsePrintableItemsFromDescription(description, productPriceMap);
  const itemCost = parseItemCostFromDescription(description);
  const codAmount = Number(order.cod_amount || 0);
  const deliveryFee = parseFloat(order.price?.replace(/[^0-9.]/g, '') || '0');

  let items: MerchantReceiptItem[] = [...productItems];
  const productSum = productItems.reduce((sum, item) => sum + (item.price || 0), 0);

  if (productItems.length > 0 && itemCost > 0 && productSum === 0) {
    items = [{ label: '商品费用', qty: 1, price: itemCost }];
  } else if (productItems.length === 0 && itemCost > 0) {
    items = [{ label: '商品费用', qty: 1, price: itemCost }];
  }

  if (codAmount > 0) {
    items.push({ label: '代收款 COD', qty: 1, price: codAmount });
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
    deliveryFee,
    notes: order.notes?.trim() || undefined,
    isSample: false,
  };
}
