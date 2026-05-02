/**
 * 待办计数（底栏 / 仪表盘）与数据库对齐：
 * 处理完充值、待分配、配送警报、待审商品后应立刻调用，避免仅依赖 Realtime 延迟。
 */
export const ADMIN_TODOS_REFRESH_EVENT = 'ml-admin-todos-refresh';

export function notifyAdminTodosRefresh(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ADMIN_TODOS_REFRESH_EVENT));
}
