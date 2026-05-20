/** 订单数据变更后通知各页面刷新列表/统计 */
export const MERCHANT_ORDERS_REFRESH = 'merchant-orders-refresh';

export function broadcastMerchantOrdersRefresh(): void {
  window.dispatchEvent(new CustomEvent(MERCHANT_ORDERS_REFRESH));
}
