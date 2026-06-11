import { extractDestinationCode } from './inboundBarcode';

/** 解析订单最终目的地码（优先云端/入库登记，其次入库条码前缀） */
export function resolveOrderDestinationCode(order: {
  destination_code?: string;
  order_barcode: string;
}): string {
  if (order.destination_code?.trim()) {
    return extractDestinationCode(order.destination_code);
  }
  const fromBarcode = extractDestinationCode(order.order_barcode.slice(0, 6));
  if (fromBarcode && fromBarcode !== 'PKG') return fromBarcode;
  return '';
}
