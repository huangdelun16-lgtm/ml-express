import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { supabase } from '../services/supabase';
import LoggerService from '../services/LoggerService';
import { broadcastMerchantOrdersRefresh } from '../utils/merchantOrderEvents';
import {
  ensureDesktopNotificationPermission,
  focusMerchantWindow,
  playNewOrderChime,
  showNewOrderDesktopNotification,
  speakMerchantNewOrderAlert,
  startPendingOrderTitleFlash,
  stopPendingOrderTitleFlash,
} from '../utils/merchantOrderDesktopAlert';
import { useLanguage } from './LanguageContext';

export type MerchantPendingOrder = Record<string, unknown> & {
  id: string;
  status?: string;
  delivery_store_id?: string;
};

type MerchantOrderContextValue = {
  pendingOrders: MerchantPendingOrder[];
  pendingCount: number;
  showOrderAlert: boolean;
  setShowOrderAlert: (show: boolean) => void;
  addPendingOrder: (order: MerchantPendingOrder) => void;
  removePendingOrder: (orderId: string) => void;
  refreshPendingOrders: () => Promise<void>;
  isVoiceEnabled: boolean;
  setIsVoiceEnabled: (enabled: boolean) => void;
};

const MerchantOrderContext = createContext<MerchantOrderContextValue | undefined>(
  undefined,
);

const VOICE_STORAGE_KEY = 'ml-merchant-voice-alert';
const PENDING_POLL_MS = 10_000;
const PENDING_SELECT =
  'id,status,delivery_store_id,sender_name,receiver_name,receiver_address,receiver_phone,description,price,created_at,create_time,payment_method,cod_amount';

export function MerchantOrderProvider({
  storeId,
  children,
}: {
  storeId: string | null | undefined;
  children: ReactNode;
}) {
  const { language } = useLanguage();
  const [pendingOrders, setPendingOrders] = useState<MerchantPendingOrder[]>([]);
  const [showOrderAlert, setShowOrderAlert] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabledState] = useState(() => {
    try {
      return localStorage.getItem(VOICE_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastVoiceAtRef = useRef(0);
  const knownPendingIdsRef = useRef<Set<string>>(new Set());
  const pendingSyncReadyRef = useRef(false);

  const setIsVoiceEnabled = useCallback((enabled: boolean) => {
    setIsVoiceEnabledState(enabled);
    try {
      localStorage.setItem(VOICE_STORAGE_KEY, enabled ? '1' : '0');
    } catch {
      /* ignore */
    }
    if (enabled) {
      void ensureDesktopNotificationPermission();
      playNewOrderChime();
    }
  }, []);

  const notifyNewPendingOrder = useCallback(
    (count: number) => {
      if (count <= 0) return;
      focusMerchantWindow();
      playNewOrderChime();
      showNewOrderDesktopNotification(count, language, () => {
        setShowOrderAlert(true);
      });
      if (document.hidden) {
        startPendingOrderTitleFlash(count, language);
      }
    },
    [language],
  );

  const addPendingOrder = useCallback(
    (order: MerchantPendingOrder, options?: { silent?: boolean }) => {
      if (!order?.id || order.status !== '待确认') return false;
      let added = false;
      setPendingOrders((prev) => {
        if (prev.some((o) => o.id === order.id)) return prev;
        added = true;
        knownPendingIdsRef.current.add(order.id);
        return [order, ...prev];
      });
      if (added) {
        setShowOrderAlert(true);
        broadcastMerchantOrdersRefresh();
        if (!options?.silent) {
          notifyNewPendingOrder(1);
        }
      }
      return added;
    },
    [notifyNewPendingOrder],
  );

  const removePendingOrder = useCallback((orderId: string) => {
    knownPendingIdsRef.current.delete(orderId);
    setPendingOrders((prev) => {
      const next = prev.filter((o) => o.id !== orderId);
      if (next.length === 0) setShowOrderAlert(false);
      return next;
    });
    broadcastMerchantOrdersRefresh();
  }, []);

  const applyPendingRows = useCallback(
    (rows: MerchantPendingOrder[]) => {
      const nextIds = new Set(rows.map((r) => r.id));
      let newCount = 0;
      if (pendingSyncReadyRef.current) {
        nextIds.forEach((id) => {
          if (!knownPendingIdsRef.current.has(id)) newCount += 1;
        });
      }
      knownPendingIdsRef.current = nextIds;
      pendingSyncReadyRef.current = true;
      setPendingOrders(rows);
      if (rows.length > 0) setShowOrderAlert(true);
      else setShowOrderAlert(false);
      if (newCount > 0) {
        notifyNewPendingOrder(newCount);
        broadcastMerchantOrdersRefresh();
      }
    },
    [notifyNewPendingOrder],
  );

  const syncPendingFromServer = useCallback(async () => {
    if (!storeId) {
      knownPendingIdsRef.current = new Set();
      pendingSyncReadyRef.current = false;
      setPendingOrders([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('packages')
        .select(PENDING_SELECT)
        .eq('delivery_store_id', storeId)
        .eq('status', '待确认')
        .order('created_at', { ascending: false });

      if (error) throw error;
      applyPendingRows((data || []) as MerchantPendingOrder[]);
    } catch (err) {
      LoggerService.error('同步待确认订单失败', err);
    }
  }, [storeId, applyPendingRows]);

  useEffect(() => {
    if (!storeId) return undefined;

    pendingSyncReadyRef.current = false;
    knownPendingIdsRef.current = new Set();
    void ensureDesktopNotificationPermission();
    void syncPendingFromServer();

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`merchant-web-orders-${storeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'packages',
          filter: `delivery_store_id=eq.${storeId}`,
        },
        (payload) => {
          const row = payload.new as MerchantPendingOrder;
          if (row?.status === '待确认') addPendingOrder(row);
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'packages',
          filter: `delivery_store_id=eq.${storeId}`,
        },
        (payload) => {
          const row = payload.new as MerchantPendingOrder;
          const old = payload.old as MerchantPendingOrder | undefined;
          if (row?.status === '待确认') {
            if (old?.status !== '待确认') {
              addPendingOrder(row);
            }
          } else if (row?.id) {
            removePendingOrder(row.id);
          }
          broadcastMerchantOrdersRefresh();
        },
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          LoggerService.debug('商家订单实时通道已连接', storeId);
        } else if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          LoggerService.warn('商家订单实时通道异常，改为轮询补偿', status, err);
          void syncPendingFromServer();
        }
      });

    channelRef.current = channel;

    const pollId = window.setInterval(() => {
      void syncPendingFromServer();
    }, PENDING_POLL_MS);

    const onVisible = () => {
      if (!document.hidden) {
        stopPendingOrderTitleFlash();
        void syncPendingFromServer();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearInterval(pollId);
      document.removeEventListener('visibilitychange', onVisible);
      pendingSyncReadyRef.current = false;
      knownPendingIdsRef.current = new Set();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [storeId, addPendingOrder, removePendingOrder, syncPendingFromServer]);

  useEffect(() => {
    if (pendingOrders.length === 0) {
      stopPendingOrderTitleFlash();
      return;
    }
    if (document.hidden) {
      startPendingOrderTitleFlash(pendingOrders.length, language);
    } else {
      stopPendingOrderTitleFlash();
    }
  }, [pendingOrders.length, language]);

  useEffect(() => {
    if (!isVoiceEnabled || pendingOrders.length === 0) return;
    const now = Date.now();
    if (now - lastVoiceAtRef.current < 8000) return;
    lastVoiceAtRef.current = now;
    speakMerchantNewOrderAlert(pendingOrders.length, language);
  }, [pendingOrders.length, isVoiceEnabled, language]);

  const value: MerchantOrderContextValue = {
    pendingOrders,
    pendingCount: pendingOrders.length,
    showOrderAlert,
    setShowOrderAlert,
    addPendingOrder,
    removePendingOrder,
    refreshPendingOrders: syncPendingFromServer,
    isVoiceEnabled,
    setIsVoiceEnabled,
  };

  return (
    <MerchantOrderContext.Provider value={value}>
      {children}
    </MerchantOrderContext.Provider>
  );
}

export function useMerchantOrders(): MerchantOrderContextValue {
  const ctx = useContext(MerchantOrderContext);
  if (!ctx) {
    throw new Error('useMerchantOrders must be used within MerchantOrderProvider');
  }
  return ctx;
}

/** 布局外或未挂载 Provider 时安全读取 */
export function useMerchantOrdersOptional(): MerchantOrderContextValue | null {
  return useContext(MerchantOrderContext) ?? null;
}
