/** 订单数据变更后通知各页面刷新列表/统计 */
export const MERCHANT_ORDERS_REFRESH = 'merchant-orders-refresh';

let refreshDebounceTimer: ReturnType<typeof setTimeout> | null = null;

/** 合并短时间内的多次刷新，减轻订单列表卡顿 */
export function broadcastMerchantOrdersRefresh(): void {
  if (refreshDebounceTimer) clearTimeout(refreshDebounceTimer);
  refreshDebounceTimer = setTimeout(() => {
    refreshDebounceTimer = null;
    window.dispatchEvent(new CustomEvent(MERCHANT_ORDERS_REFRESH));
  }, 400);
}
