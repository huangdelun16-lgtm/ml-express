import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { fetchPendingMerchantApplicationCount } from '../services/merchantApplicationService';
import { useAdminSessionReady } from '../hooks/useAdminSessionReady';
import { ADMIN_TODOS_REFRESH_EVENT } from '../utils/adminTodoBridge';
import { isBrowserRealtimeAvailable } from '../utils/supabaseBrowserUrl';

export type AdminTodoCounts = {
  pendingRecharge: number;
  pendingAssignment: number;
  pendingProductReview: number;
  pendingDeliveryAlerts: number;
  pendingMerchantApplications: number;
};

const emptyCounts: AdminTodoCounts = {
  pendingRecharge: 0,
  pendingAssignment: 0,
  pendingProductReview: 0,
  pendingDeliveryAlerts: 0,
  pendingMerchantApplications: 0,
};

export async function fetchAdminTodoCounts(): Promise<AdminTodoCounts> {
  const [rechargeRes, alertsRes, assignRes, productsRes, pendingMerchantApplications] = await Promise.all([
    supabase.from('recharge_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('delivery_alerts').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase
      .from('packages')
      .select('*', { count: 'exact', head: true })
      .eq('courier', '待分配')
      .in('status', ['待取件', '待收款']),
    supabase
      .from('products')
      .select('id, listing_status, pending_update', { count: 'exact', head: false })
      .or('listing_status.eq.pending,pending_update.not.is.null'),
    fetchPendingMerchantApplicationCount(),
  ]);

  const pendingProductRows = productsRes.data ?? [];
  const pendingProductReview = pendingProductRows.filter(
    (row) =>
      (row.listing_status ?? '').trim() === 'pending' ||
      (row.pending_update != null &&
        typeof row.pending_update === 'object' &&
        Object.keys(row.pending_update as object).some((k) => k !== 'submitted_at')),
  ).length;

  return {
    pendingRecharge: rechargeRes.count ?? 0,
    pendingDeliveryAlerts: alertsRes.count ?? 0,
    pendingAssignment: assignRes.count ?? 0,
    pendingProductReview,
    pendingMerchantApplications,
  };
}

type AdminTodoContextValue = {
  counts: AdminTodoCounts;
  refresh: () => Promise<void>;
  lastUpdatedAt: number | null;
};

const AdminTodoContext = createContext<AdminTodoContextValue | null>(null);

export const AdminTodoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const sessionReady = useAdminSessionReady();
  const { pathname } = useLocation();
  const [counts, setCounts] = useState<AdminTodoCounts>(emptyCounts);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchAdminTodoCounts();
      setCounts(next);
      setLastUpdatedAt(Date.now());
    } catch (e) {
      console.error('AdminTodoContext refresh failed:', e);
    }
  }, []);

  useEffect(() => {
    if (sessionReady) return;
    setCounts(emptyCounts);
    setLastUpdatedAt(null);
  }, [sessionReady]);

  /** 会话就绪或路由切换时拉一次，避免跨页处理完后计数仍旧 */
  useEffect(() => {
    if (!sessionReady) return;
    void refresh();
  }, [sessionReady, pathname, refresh]);

  /** 其它 Tab 处理完业务后广播，或本页 mutation 后手动触发 */
  useEffect(() => {
    if (!sessionReady) return;
    const onBroadcast = () => void refresh();
    window.addEventListener(ADMIN_TODOS_REFRESH_EVENT, onBroadcast);
    return () => window.removeEventListener(ADMIN_TODOS_REFRESH_EVENT, onBroadcast);
  }, [sessionReady, refresh]);

  /** 从后台切回浏览器页签时补拉（Realtime 偶发滞后） */
  useEffect(() => {
    if (!sessionReady) return;
    let t: number;
    const onVis = () => {
      if (document.visibilityState !== 'visible') return;
      window.clearTimeout(t);
      t = window.setTimeout(() => void refresh(), 150);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.clearTimeout(t);
    };
  }, [sessionReady, refresh]);

  useEffect(() => {
    if (!sessionReady) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    if (isBrowserRealtimeAvailable()) {
      channel = supabase
        .channel('admin-dashboard-todos')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'recharge_requests' }, () => {
          void refresh();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_alerts' }, () => {
          void refresh();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'packages' }, () => {
          void refresh();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
          void refresh();
        })
        .subscribe();
    }

    const fallbackTimer = window.setInterval(() => {
      void refresh();
    }, isBrowserRealtimeAvailable() ? 45000 : 20000);

    return () => {
      window.clearInterval(fallbackTimer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [sessionReady, refresh]);

  return (
    <AdminTodoContext.Provider value={{ counts, refresh, lastUpdatedAt }}>
      {children}
    </AdminTodoContext.Provider>
  );
};

export function useAdminTodo(): AdminTodoContextValue {
  const ctx = useContext(AdminTodoContext);
  if (!ctx) {
    throw new Error('useAdminTodo must be used within AdminTodoProvider');
  }
  return ctx;
}
