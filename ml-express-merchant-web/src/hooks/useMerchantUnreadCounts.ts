import { useEffect, useMemo, useState } from 'react';
import { chatService } from '../services/chatService';

const DEFAULT_POLL_MS = 12_000;

/** 订单列表未读：Realtime 不可用时 REST 轮询兜底 */
export function useMerchantUnreadCounts(
  userId: string | null | undefined,
  orderIds: string[],
  intervalMs = DEFAULT_POLL_MS,
): Record<string, number> {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const idsKey = useMemo(
    () =>
      Array.from(new Set(orderIds.filter(Boolean)))
        .sort()
        .join(','),
    [orderIds],
  );

  useEffect(() => {
    if (!userId || !idsKey) {
      setCounts({});
      return undefined;
    }
    const ids = idsKey.split(',');
    let cancelled = false;

    const tick = async () => {
      const next = await chatService.getUnreadCountsByOrder(userId, ids);
      if (!cancelled) setCounts(next);
    };

    void tick();
    const timer = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      void tick();
    }, intervalMs);

    const onVisible = () => {
      if (!document.hidden) void tick();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [userId, idsKey, intervalMs]);

  return counts;
}
