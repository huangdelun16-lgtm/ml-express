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

function speakMerchantAlert(text: string, lang: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang =
      lang === 'my' ? 'my-MM' : lang === 'en' ? 'en-US' : 'zh-CN';
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    LoggerService.warn('语音播报失败', e);
  }
}

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

  const setIsVoiceEnabled = useCallback((enabled: boolean) => {
    setIsVoiceEnabledState(enabled);
    try {
      localStorage.setItem(VOICE_STORAGE_KEY, enabled ? '1' : '0');
    } catch {
      /* ignore */
    }
    if (enabled) {
      void ensureDesktopNotificationPermission();
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

  const addPendingOrder = useCallback((order: MerchantPendingOrder) => {
    if (!order?.id || order.status !== '待确认') return;
    setPendingOrders((prev) => {
      if (prev.some((o) => o.id === order.id)) return prev;
      return [order, ...prev];
    });
    setShowOrderAlert(true);
    broadcastMerchantOrdersRefresh();
    notifyNewPendingOrder(1);
  }, [notifyNewPendingOrder]);

  const removePendingOrder = useCallback((orderId: string) => {
    setPendingOrders((prev) => {
      const next = prev.filter((o) => o.id !== orderId);
      if (next.length === 0) setShowOrderAlert(false);
      return next;
    });
    broadcastMerchantOrdersRefresh();
  }, []);

  const syncPendingFromServer = useCallback(async () => {
    if (!storeId) {
      setPendingOrders([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('delivery_store_id', storeId)
        .eq('status', '待确认')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const rows = (data || []) as MerchantPendingOrder[];
      setPendingOrders(rows);
      if (rows.length > 0) setShowOrderAlert(true);
      else setShowOrderAlert(false);
    } catch (err) {
      LoggerService.error('同步待确认订单失败', err);
    }
  }, [storeId]);

  useEffect(() => {
    if (!storeId) return undefined;

    syncPendingFromServer();

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
          if (row?.status !== '待确认') {
            removePendingOrder(row.id);
          }
          broadcastMerchantOrdersRefresh();
        },
      )
      .subscribe();

    channelRef.current = channel;

    const pollId = window.setInterval(() => {
      syncPendingFromServer();
    }, 30000);

    return () => {
      window.clearInterval(pollId);
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
    const onVisibility = () => {
      if (!document.hidden) {
        stopPendingOrderTitleFlash();
      } else if (pendingOrders.length > 0) {
        startPendingOrderTitleFlash(pendingOrders.length, language);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [pendingOrders.length, language]);

  useEffect(() => {
    if (!isVoiceEnabled || pendingOrders.length === 0) return;
    const now = Date.now();
    if (now - lastVoiceAtRef.current < 8000) return;
    lastVoiceAtRef.current = now;
    const text =
      language === 'my'
        ? `အော်ဒါအသစ် ${pendingOrders.length} ခု ရှိပါတယ်၊ လက်ခံပေးပါ`
        : language === 'en'
          ? `You have ${pendingOrders.length} new order(s), please accept`
          : `您有 ${pendingOrders.length} 个新订单，请接单`;
    speakMerchantAlert(text, language);
    if (document.hidden) {
      playNewOrderChime();
      showNewOrderDesktopNotification(pendingOrders.length, language, () => {
        setShowOrderAlert(true);
      });
    }
  }, [pendingOrders.length, isVoiceEnabled, language, showOrderAlert]);

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
