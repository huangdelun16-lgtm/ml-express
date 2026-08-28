import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import LoggerService from '../services/LoggerService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
import * as Speech from 'expo-speech';
import { Vibration, Platform, Alert, AppState, DeviceEventEmitter, type AppStateStatus } from 'react-native';
import * as KeepAwake from 'expo-keep-awake';
import {
  fingerprintMerchantInProgressOrders,
  MERCHANT_IN_PROGRESS_STATUSES,
} from '../services/_shared/merchantInProgressOrders';

type Language = 'zh' | 'en' | 'my';
interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  showOrderAlert: boolean;
  setShowOrderAlert: (show: boolean) => void;
  pendingOrders: any[];
  setPendingOrders: (orders: any[]) => void;
  addPendingOrder: (order: any) => void;
  removePendingOrder: (orderId: string) => void;
  refreshPendingOrders: () => Promise<void>;
  refreshSession: () => Promise<void>;
  dismissOrderAlert: () => void;
  isDarkMode: boolean;
  setIsDarkMode: (isDark: boolean) => void;
  isGuest: boolean;
  setIsGuest: (isGuest: boolean) => void;
  enableRealtimeAfterSplash: () => Promise<void>;
}
const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

function stopOrderAlarm(alarmRef: React.MutableRefObject<NodeJS.Timeout | null>) {
  if (alarmRef.current) {
    clearInterval(alarmRef.current);
    alarmRef.current = null;
  }
  Vibration.cancel();
  Speech.stop();
}

const IN_PROGRESS_POLL_FG_MS = 12_000;
const IN_PROGRESS_POLL_BG_MS = 30_000;

export function AppProvider({ children }: AppProviderProps) {
  const [language, setLanguageState] = useState<Language>('zh');
  const [isDarkMode, setIsDarkModeState] = useState(false);
  const [showOrderAlert, setShowOrderAlert] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const subscriptionRef = useRef<any>(null);
  const splashCompleteRef = useRef(false);
  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingIdsRef = useRef<Set<string>>(new Set());
  const inProgressReadyRef = useRef(false);
  const inProgressFingerprintRef = useRef('');
  const [userType, setUserType] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const syncPendingIds = useCallback((orders: any[]) => {
    pendingIdsRef.current = new Set(orders.map((order) => order.id));
  }, []);

  const addPendingOrder = useCallback((order: any) => {
    if (!order?.id) return;
    setPendingOrders((prev) => {
      if (prev.some((item) => item.id === order.id)) return prev;
      const next = [order, ...prev];
      syncPendingIds(next);
      return next;
    });
    setShowOrderAlert(true);
  }, [syncPendingIds]);

  const removePendingOrder = useCallback((orderId: string) => {
    setPendingOrders((prev) => {
      const filtered = prev.filter((item) => item.id !== orderId);
      syncPendingIds(filtered);
      if (filtered.length === 0) {
        setShowOrderAlert(false);
        stopOrderAlarm(alarmIntervalRef);
      }
      return filtered;
    });
  }, [syncPendingIds]);

  const dismissOrderAlert = useCallback(() => {
    setShowOrderAlert(false);
    stopOrderAlarm(alarmIntervalRef);
  }, []);

  const fetchPendingOrdersFromServer = useCallback(async () => {
    try {
      const currentUserStr = await AsyncStorage.getItem('currentUser');
      if (!currentUserStr) return;

      const user = JSON.parse(currentUserStr);
      let finalUserType = user.user_type || 'customer';
      if (finalUserType === 'merchants' || finalUserType === 'partner') finalUserType = 'merchant';
      if (finalUserType !== 'merchant' || !user.id) return;

      const { data: missingOrders, error } = await supabase
        .from('packages')
        .select('*')
        .eq('delivery_store_id', user.id)
        .eq('status', '待确认')
        .order('created_at', { ascending: false });

      if (error || !missingOrders) return;

      setPendingOrders((prev) => {
        const map = new Map<string, any>();
        for (const order of missingOrders) map.set(order.id, order);
        for (const order of prev) {
          if (!map.has(order.id) && order.status === '待确认') {
            map.set(order.id, order);
          }
        }
        const next = [...map.values()].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        syncPendingIds(next);
        if (next.length > 0) {
          setShowOrderAlert(true);
        } else {
          setShowOrderAlert(false);
          stopOrderAlarm(alarmIntervalRef);
        }
        return next;
      });
    } catch (error) {
      LoggerService.error('刷新待确认订单失败:', error);
    }
  }, [syncPendingIds]);

  const syncInProgressFromServer = useCallback(async () => {
    try {
      const currentUserStr = await AsyncStorage.getItem('currentUser');
      if (!currentUserStr) {
        inProgressReadyRef.current = false;
        inProgressFingerprintRef.current = '';
        return;
      }

      const user = JSON.parse(currentUserStr);
      let finalUserType = user.user_type || 'customer';
      if (finalUserType === 'merchants' || finalUserType === 'partner') {
        finalUserType = 'merchant';
      }
      if (finalUserType !== 'merchant' || !user.id) return;

      const { data, error } = await supabase
        .from('packages')
        .select('id,status,courier')
        .eq('delivery_store_id', user.id)
        .in('status', [...MERCHANT_IN_PROGRESS_STATUSES])
        .order('created_at', { ascending: false })
        .limit(200);

      if (error || !data) return;

      const nextFp = fingerprintMerchantInProgressOrders(data);
      if (!inProgressReadyRef.current) {
        inProgressReadyRef.current = true;
        inProgressFingerprintRef.current = nextFp;
        return;
      }
      if (nextFp === inProgressFingerprintRef.current) return;
      inProgressFingerprintRef.current = nextFp;
      DeviceEventEmitter.emit('order_status_updated');
    } catch (error) {
      LoggerService.error('刷新进行中订单失败:', error);
    }
  }, []);

  useEffect(() => {
    if (showOrderAlert && pendingOrders.length > 0) {
      const playAlarm = () => {
        Vibration.cancel();
        Vibration.vibrate([0, 1000, 500, 1000], true);

        const speakText =
          language === 'my'
            ? `သင့်မှာ အော်ဒါအသစ် ${pendingOrders.length} ခုရှိပါတယ်၊ ကျေးဇူးပြု၍ လက်ခံပေးပါ`
            : language === 'en'
              ? `You have ${pendingOrders.length} new orders, please accept`
              : `你有 ${pendingOrders.length} 个新订单，请接单`;

        Speech.stop();
        Speech.speak(speakText, {
          language: language === 'my' ? 'my-MM' : language === 'en' ? 'en-US' : 'zh-CN',
          rate: 0.9,
          pitch: 1.0,
        });

        try {
          const ns = require('../services/notificationService').default.getInstance();
          ns.sendSystemAnnouncementNotification({
            title: language === 'zh' ? '📦 新订单提醒' : 'New Order',
            message: `${language === 'zh' ? '你有新订单等待处理' : 'You have new orders pending'}`,
            priority: 'high',
          });
        } catch (e) {
          console.warn('发送本地通知失败:', e);
        }
      };

      playAlarm();
      stopOrderAlarm(alarmIntervalRef);
      alarmIntervalRef.current = setInterval(playAlarm, 15000);
    } else {
      stopOrderAlarm(alarmIntervalRef);
    }

    return () => {
      stopOrderAlarm(alarmIntervalRef);
    };
  }, [showOrderAlert, language, pendingOrders.length]);

  useEffect(() => {
    if (userType === 'merchant') {
      KeepAwake.activateKeepAwakeAsync();
      return () => {
        KeepAwake.deactivateKeepAwake();
      };
    }
  }, [userType]);

  const loadInitialData = async () => {
    try {
      const savedLang = await AsyncStorage.getItem('ml-express-language');
      if (savedLang && (savedLang === 'zh' || savedLang === 'en' || savedLang === 'my')) {
        setLanguageState(savedLang as Language);
      }

      const savedDarkMode = await AsyncStorage.getItem('ml-express-dark-mode');
      if (savedDarkMode) {
        setIsDarkModeState(savedDarkMode === 'true');
      }

      const currentUserStr = await AsyncStorage.getItem('currentUser');
      const savedSessionId = await AsyncStorage.getItem('currentSessionId');

      if (currentUserStr) {
        const user = JSON.parse(currentUserStr);
        let finalUserType = user.user_type || 'customer';
        if (finalUserType === 'merchants' || finalUserType === 'partner') finalUserType = 'merchant';
        setUserType(finalUserType);
        setUserId(user.id);
        setSessionId(savedSessionId);
      }
    } catch (error) {
      LoggerService.error('加载初始设置失败:', error);
    }
  };

  const setupOrderListener = async () => {
    try {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }

      const currentUserStr = await AsyncStorage.getItem('currentUser');
      if (!currentUserStr) {
        setUserId(null);
        setUserType(null);
        inProgressReadyRef.current = false;
        inProgressFingerprintRef.current = '';
        return;
      }

      const user = JSON.parse(currentUserStr);
      let finalUserType = user.user_type || 'customer';
      if (finalUserType === 'merchants' || finalUserType === 'partner') finalUserType = 'merchant';

      setUserType(finalUserType);
      setUserId(user.id);

      const checkSession = async () => {
        try {
          const localSessionId = await AsyncStorage.getItem('currentSessionId');
          if (!user.id || !localSessionId) return;

          const table = finalUserType === 'merchant' ? 'delivery_stores' : 'users';
          const { data, error } = await supabase
            .from(table)
            .select('current_session_id')
            .eq('id', user.id)
            .single();

          if (!error && data && data.current_session_id && data.current_session_id !== localSessionId) {
            if (sessionTimerRef.current) {
              clearInterval(sessionTimerRef.current);
            }

            Alert.alert(
              '登录状态异常',
              '您的账号已在其他设备登录，当前设备已被强制下线。',
              [
                {
                  text: '确定',
                  onPress: async () => {
                    await AsyncStorage.multiRemove([
                      'currentUser',
                      'userId',
                      'userEmail',
                      'userName',
                      'userPhone',
                      'userType',
                      'currentStoreCode',
                      'currentSessionId',
                    ]);
                    const Updates = require('expo-updates');
                    Updates.reloadAsync();
                  },
                },
              ],
              { cancelable: false },
            );
          }
        } catch (e) {
          console.warn('检查会话失败:', e);
        }
      };

      if (!splashCompleteRef.current) {
        return;
      }

      sessionTimerRef.current = setInterval(checkSession, 30000);
      setTimeout(checkSession, 5000);

      if (finalUserType === 'merchant' && user.id) {
        const subscription = supabase
          .channel(`global-merchant-orders-${user.id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'packages',
              filter: `delivery_store_id=eq.${user.id}`,
            },
            (payload) => {
              const newOrder = payload.new;
              if (newOrder.status === '待确认') {
                addPendingOrder(newOrder);
              }
            },
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'packages',
              filter: `delivery_store_id=eq.${user.id}`,
            },
            (payload) => {
              const updated = payload.new;
              if (updated?.id && updated.status !== '待确认') {
                removePendingOrder(updated.id);
              }
            },
          )
          .subscribe();

        subscriptionRef.current = subscription;
      }

      await fetchPendingOrdersFromServer();
      await syncInProgressFromServer();
    } catch (error) {
      console.warn('建立订单监听失败:', error);
    }
  };

  const startOrderPoll = (ms: number) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    pollIntervalRef.current = setInterval(() => {
      void fetchPendingOrdersFromServer();
      void syncInProgressFromServer();
    }, ms);
  };

  const refreshSession = async () => {
    splashCompleteRef.current = true;
    await setupOrderListener();
    startOrderPoll(IN_PROGRESS_POLL_FG_MS);
  };

  const enableRealtimeAfterSplash = async () => {
    splashCompleteRef.current = true;
    await setupOrderListener();
    startOrderPoll(IN_PROGRESS_POLL_FG_MS);
  };

  useEffect(() => {
    void loadInitialData();
    // Splash/Welcome: welcome_screens REST only. Realtime + pending poll start
    // after WelcomeScreen or Login (interactive session).

    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        stopOrderAlarm(alarmIntervalRef);
        if (!splashCompleteRef.current) return;
        void fetchPendingOrdersFromServer();
        void syncInProgressFromServer();
        void setupOrderListener();
        startOrderPoll(IN_PROGRESS_POLL_FG_MS);
        return;
      }
      if (
        (nextState === 'background' || nextState === 'inactive') &&
        splashCompleteRef.current
      ) {
        startOrderPoll(IN_PROGRESS_POLL_BG_MS);
      }
    };

    const appStateSub = AppState.addEventListener('change', handleAppState);

    return () => {
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      stopOrderAlarm(alarmIntervalRef);
      appStateSub.remove();
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [addPendingOrder, fetchPendingOrdersFromServer, removePendingOrder, syncInProgressFromServer]);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    try {
      await AsyncStorage.setItem('ml-express-language', lang);
    } catch (error) {
      LoggerService.error('保存语言设置失败:', error);
    }
  };

  const setIsDarkMode = async (isDark: boolean) => {
    setIsDarkModeState(isDark);
    try {
      await AsyncStorage.setItem('ml-express-dark-mode', isDark.toString());
    } catch (error) {
      LoggerService.error('保存主题设置失败:', error);
    }
  };

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        showOrderAlert,
        setShowOrderAlert,
        pendingOrders,
        setPendingOrders,
        addPendingOrder,
        removePendingOrder,
        refreshPendingOrders: fetchPendingOrdersFromServer,
        refreshSession,
        dismissOrderAlert,
        isDarkMode,
        setIsDarkMode,
        isGuest,
        setIsGuest,
        enableRealtimeAfterSplash,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
