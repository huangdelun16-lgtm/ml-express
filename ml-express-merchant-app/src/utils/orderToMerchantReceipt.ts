import type { MerchantReceiptData, MerchantReceiptItem } from './merchantReceiptTemplate';
import {
  buildPackingRows,
  stripAutoTagsFromOrderDescription,
} from './parseOrderPackingItems';

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
  return buildPackingRows(description, productPriceMap || {}).rows.map((row) => ({
    label: row.name,
    qty: row.qty,
    unitPrice: row.unitPrice,
    price: row.lineTotal,
  }));
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

  const packing = buildPackingRows(order.description || '', productPriceMap || {});
  const computedItemTotal = packing.rows.reduce((sum, row) => sum + (row.lineTotal || 0), 0);
  const itemTotal =
    packing.declaredItemTotal != null && packing.declaredItemTotal > 0
      ? packing.declaredItemTotal
      : computedItemTotal;
  return deliveryFee + itemTotal;
}

export function orderToMerchantReceipt(
  order: OrderPrintSource,
  productPriceMap?: Record<string, number>,
): MerchantReceiptData {
  const description = order.description || '';
  const packing = buildPackingRows(description, productPriceMap || {});
  const productItems = packing.rows.map((row) => ({
    label: row.name,
    qty: row.qty,
    unitPrice: row.unitPrice,
    price: row.lineTotal,
  }));
  const declaredItemCost = packing.declaredItemTotal;
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
  } else if (productItems.length === 0 && declaredItemCost != null && declaredItemCost > 0) {
    items = [{ label: 'Item Cost', qty: 1, price: declaredItemCost }];
    itemTotal = declaredItemCost;
  } else {
    items = [...productItems];
    itemTotal = declaredItemCost != null && declaredItemCost > 0 ? declaredItemCost : productSum;
  }

  const customerNote =
    order.notes?.trim() || stripAutoTagsFromOrderDescription(description) || undefined;

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
    notes: customerNote,
    isSample: false,
  };
}
