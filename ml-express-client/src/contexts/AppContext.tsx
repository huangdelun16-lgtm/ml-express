import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import LoggerService from '../services/LoggerService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
import * as Speech from 'expo-speech';
import { Vibration, Platform, Alert } from 'react-native';
import * as KeepAwake from 'expo-keep-awake';

type Language = 'zh' | 'en' | 'my';
interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  // 🚀 新增：全屏订单提醒控制
  showOrderAlert: boolean;
  setShowOrderAlert: (show: boolean) => void;
  pendingOrders: any[];
  setPendingOrders: (orders: any[]) => void;
  addPendingOrder: (order: any) => void;
  removePendingOrder: (orderId: string) => void;
  refreshPendingOrders: () => void;
  refreshSession: () => Promise<void>;
  isDarkMode: boolean;
  setIsDarkMode: (isDark: boolean) => void;
}
const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [language, setLanguageState] = useState<Language>('zh');
  const [isDarkMode, setIsDarkModeState] = useState(false);
  const [showOrderAlert, setShowOrderAlert] = useState(false);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const subscriptionRef = useRef<any>(null);
  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null); // 🚀 新增：报警循环引用
  const [userType, setUserType] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null); // 🚀 新增：用户ID状态
  const [sessionId, setSessionId] = useState<string | null>(null); // 🚀 新增：本地会话ID状态
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 🚀 新增：添加待处理订单
  const addPendingOrder = (order: any) => {
    setPendingOrders(prev => {
      // 防止重复添加
      if (prev.some(o => o.id === order.id)) return prev;
      return [order, ...prev]; // 新订单排在最前面
    });
    setShowOrderAlert(true);
  };

  // 🚀 新增：移除待处理订单
  const removePendingOrder = (orderId: string) => {
    setPendingOrders(prev => {
      const filtered = prev.filter(o => o.id !== orderId);
      if (filtered.length === 0) {
        setShowOrderAlert(false);
      }
      return filtered;
    });
  };

  // 🚀 核心优化：报警循环 (每 15 秒响一次)
  useEffect(() => {
    if (showOrderAlert && pendingOrders.length > 0) {
      const playAlarm = () => {
        // 1. 震动 (设置了重复，但为了保险每 15 秒重新触发一次)
        Vibration.cancel();
        Vibration.vibrate([0, 1000, 500, 1000], true);

        // 2. 语音播报
        const speakText = language === 'my' 
          ? `သင့်မှာ အော်ဒါအသစ် ${pendingOrders.length} ခုရှိပါတယ်၊ ကျေးဇူးပြု၍ လက်ခံပေးပါ` 
          : language === 'en' 
          ? `You have ${pendingOrders.length} new orders, please accept` 
          : `你有 ${pendingOrders.length} 个新订单，请接单`;
        
        Speech.stop();
        Speech.speak(speakText, { 
          language: language === 'my' ? 'my-MM' : language === 'en' ? 'en-US' : 'zh-CN',
          rate: 0.9,
          pitch: 1.0
        });

        // 3. 🚀 暗屏补偿：发送本地通知 (确保在锁屏时也能看到并听到)
        try {
          const ns = require('../services/notificationService').default.getInstance();
          ns.sendSystemAnnouncementNotification({
            title: language === 'zh' ? '📦 新订单提醒' : 'New Order',
            message: `${language === 'zh' ? '你有新订单等待处理' : 'You have new orders pending'}`,
            priority: 'high'
          });
        } catch (e) {
          console.warn('发送本地通知失败:', e);
        }
      };

      // 立即响一次
      playAlarm();

      // 每 15 秒循环一次
      alarmIntervalRef.current = setInterval(playAlarm, 15000);
    } else {
      // 关闭报警
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
        alarmIntervalRef.current = null;
      }
      Vibration.cancel();
      Speech.stop();
    }

    return () => {
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
      }
    };
  }, [showOrderAlert, language, pendingOrders.length]);

  // 🚀 核心优化：商家账号自动开启“保持屏幕常亮”
  useEffect(() => {
    if (userType === 'merchant') {
      console.log('商家账号登录，激活屏幕常亮');
      KeepAwake.activateKeepAwakeAsync();
      return () => {
        console.log('停用屏幕常亮');
        KeepAwake.deactivateKeepAwake();
      };
    }
  }, [userType]);

  // 从本地存储加载语言设置和用户信息
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

  // 🚀 全局订单监听逻辑
  const setupOrderListener = async () => {
    try {
      // 1. 清理旧的资源
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }

      // 2. 加载当前用户信息
      const currentUserStr = await AsyncStorage.getItem('currentUser');
      if (!currentUserStr) {
        setUserId(null);
        setUserType(null);
        return;
      }
      
      const user = JSON.parse(currentUserStr);
      let finalUserType = user.user_type || 'customer';
      if (finalUserType === 'merchants' || finalUserType === 'partner') finalUserType = 'merchant';
      
      setUserType(finalUserType);
      setUserId(user.id);

      // 3. 多设备登录检查逻辑
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
            console.log(`🛑 [AppContext] 会话不匹配! DB: ${data.current_session_id}, Local: ${localSessionId}`);
            
            if (sessionTimerRef.current) {
              clearInterval(sessionTimerRef.current);
            }
            
            Alert.alert(
              '登录状态异常',
              '您的账号已在其他设备登录，当前设备已被强制下线。',
              [{ 
                text: '确定', 
                onPress: async () => {
                  await AsyncStorage.multiRemove([
                    'currentUser', 'userId', 'userEmail', 'userName', 
                    'userPhone', 'userType', 'currentStoreCode', 'currentSessionId'
                  ]);
                  const Updates = require('expo-updates');
                  Updates.reloadAsync();
                } 
              }],
              { cancelable: false }
            );
          }
        } catch (e) {
          console.warn('检查会话失败:', e);
        }
      };

      // 每 30 秒检查一次会话
      sessionTimerRef.current = setInterval(checkSession, 30000);
      // 延迟 5 秒执行第一次检查，避免登录时的竞态条件
      setTimeout(checkSession, 5000);

      // 4. 商家订单监听
      if (finalUserType === 'merchant' && user.id) {
        const subscription = supabase
          .channel(`global-merchant-orders-${user.id}`)
          .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'packages',
            filter: `delivery_store_id=eq.${user.id}` 
          }, payload => {
            const newOrder = payload.new;
            if (newOrder.status === '待确认') {
              addPendingOrder(newOrder);
            }
          })
          .subscribe();
        
        subscriptionRef.current = subscription;
      }
    } catch (error) {
      console.warn('建立订单监听失败:', error);
    }
  };

  // 🚀 新增：手动刷新会话和监听
  const refreshSession = async () => {
    await setupOrderListener();
  };

  useEffect(() => {
    loadInitialData();
    setupOrderListener();
    
    // 🚀 增加轮询补丁频率，针对手机休眠时的补偿
    const pollMissingOrders = setInterval(async () => {
      try {
        const currentUserStr = await AsyncStorage.getItem('currentUser');
        if (!currentUserStr) return;
        const user = JSON.parse(currentUserStr);
        
        if (user.user_type === 'merchant' && user.id) {
          const { data: missingOrders, error } = await supabase
            .from('packages')
            .select('*')
            .eq('delivery_store_id', user.id)
            .eq('status', '待确认')
            .order('created_at', { ascending: false });
          
          if (!error && missingOrders && missingOrders.length > 0) {
            missingOrders.forEach(order => addPendingOrder(order));
          }
        }
      } catch (err) {
        // 静默处理轮询错误
      }
    }, 15000);

    return () => {
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
      clearInterval(pollMissingOrders);
      Vibration.cancel();
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [language, showOrderAlert]);

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
    <AppContext.Provider value={{ 
      language, 
      setLanguage, 
      showOrderAlert, 
      setShowOrderAlert, 
      pendingOrders, 
      setPendingOrders, 
      addPendingOrder, 
      removePendingOrder,
      refreshPendingOrders: () => loadInitialData(),
      refreshSession,
      isDarkMode,
      setIsDarkMode
    }}>
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
