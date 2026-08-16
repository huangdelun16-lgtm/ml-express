/** 用户填写/扫描的快递单号优先作为订单号展示（入库条码是系统生成的） */

export function resolveItemOrderNumber(item: {
  input_barcode?: string | null;
  name?: string | null;
  barcode?: string | null;
  item_name?: string | null;
}): string {
  const express = item.input_barcode?.trim() ?? '';
  if (express) return express;
  const name = (item.name ?? item.item_name)?.trim() ?? '';
  if (name) return name;
  return item.barcode?.trim() ?? '';
}

/** 商品名与订单号/客户名重复时不再单独展示 */
export function resolveItemProductSubtitle(item: {
  name?: string | null;
  item_name?: string | null;
  input_barcode?: string | null;
  customer_name?: string | null;
  recipient_name?: string | null;
}): string | undefined {
  const name = (item.name ?? item.item_name)?.trim() ?? '';
  if (!name) return undefined;
  const orderNo = item.input_barcode?.trim() ?? '';
  const customer = (item.customer_name || item.recipient_name || '').trim();
  if (name === orderNo || name === customer) return undefined;
  return name;
}
