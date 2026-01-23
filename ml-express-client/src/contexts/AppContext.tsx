import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import LoggerService from '../services/LoggerService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
import * as Speech from 'expo-speech';
import { Vibration, Platform } from 'react-native';
import * as KeepAwake from 'expo-keep-awake';

type Language = 'zh' | 'en' | 'my';
interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  // 🚀 新增：全屏订单提醒控制
  showOrderAlert: boolean;
  setShowOrderAlert: (show: boolean) => void;
  newOrderData: any;
  setNewOrderData: (data: any) => void;
}
const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [language, setLanguageState] = useState<Language>('zh');
  const [showOrderAlert, setShowOrderAlert] = useState(false);
  const [newOrderData, setNewOrderData] = useState<any>(null);
  const subscriptionRef = useRef<any>(null);
  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null); // 🚀 新增：报警循环引用
  const [userType, setUserType] = useState<string | null>(null);

  // 🚀 核心优化：报警循环 (每 15 秒响一次)
  useEffect(() => {
    if (showOrderAlert && newOrderData) {
      const playAlarm = () => {
        // 1. 震动 (设置了重复，但为了保险每 15 秒重新触发一次)
        Vibration.cancel();
        Vibration.vibrate([0, 1000, 500, 1000], true);

        // 2. 语音播报
        const speakText = language === 'my' 
          ? 'သင့်မှာ အော်ဒါအသစ်ရှိပါတယ်၊ ကျေးဇူးပြု၍ လက်ခံပေးပါ' 
          : language === 'en' 
          ? 'You have a new order, please accept' 
          : '你有新的订单，请接单';
        
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
            message: `${language === 'zh' ? '订单号' : 'Order ID'}: ${newOrderData.id}`,
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
  }, [showOrderAlert, language, newOrderData]);

  // 🚀 核心优化：商家账号自动开启“保持屏幕常亮”
  // 修复：使用 useEffect 调用 API，而不是在渲染逻辑中条件性使用 Hook
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
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const savedLang = await AsyncStorage.getItem('ml-express-language');
        if (savedLang && (savedLang === 'zh' || savedLang === 'en' || savedLang === 'my')) {
          setLanguageState(savedLang as Language);
        }

        const currentUserStr = await AsyncStorage.getItem('currentUser');
        if (currentUserStr) {
          const user = JSON.parse(currentUserStr);
          setUserType(user.user_type || 'customer');
        }
      } catch (error) {
        LoggerService.error('加载初始设置失败:', error);
      }
    };
    loadInitialData();
  }, []);

  // 🚀 全局订单监听逻辑
  useEffect(() => {
    const setupOrderListener = async () => {
      try {
        const currentUserStr = await AsyncStorage.getItem('currentUser');
        if (!currentUserStr) return;
        
        const user = JSON.parse(currentUserStr);
        setUserType(user.user_type || 'customer'); // 同步更新 userType 状态

        if (user.user_type === 'merchant' && user.id) {
          console.log('✅ 检测到商家账号，建立全局订单监听:', user.id);
          
          // 如果已有监听，先清理
          if (subscriptionRef.current) {
            console.log('清理旧监听');
            supabase.removeChannel(subscriptionRef.current);
          }

          // 🚀 增强版订阅设置：开启 ack 以提高稳定性
          const subscription = supabase
            .channel(`global-merchant-orders-${user.id}`, {
              config: {
                presence: { key: user.id },
              }
            })
            .on('postgres_changes', { 
              event: 'INSERT', 
              schema: 'public', 
              table: 'packages',
              filter: `delivery_store_id=eq.${user.id}` 
            }, payload => {
              const newOrder = payload.new;
              console.log('🔔 全局监听到新订单消息:', { id: newOrder.id, status: newOrder.status });
              
              if (newOrder.status === '待确认') {
                setNewOrderData(newOrder);
                setShowOrderAlert(true);
                // 🚀 报警逻辑已移至独立的 useEffect 循环处理
              }
            })
            .subscribe((status) => {
              console.log('📡 Supabase 监听订阅状态:', status);
              // 如果订阅断开，尝试重新建立连接
              if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                setTimeout(setupOrderListener, 5000);
              }
            });
          
          subscriptionRef.current = subscription;
        }
      } catch (error) {
        console.warn('建立订单监听失败:', error);
      }
    };

    setupOrderListener();

    // 🚀 增加轮询补丁频率，针对手机休眠时的补偿
    const pollMissingOrders = setInterval(async () => {
      try {
        const currentUserStr = await AsyncStorage.getItem('currentUser');
        if (!currentUserStr) return;
        const user = JSON.parse(currentUserStr);
        
        if (user.user_type === 'merchant' && user.id && !showOrderAlert) {
          const { data: missingOrders, error } = await supabase
            .from('packages')
            .select('*')
            .eq('delivery_store_id', user.id)
            .eq('status', '待确认')
            .order('created_at', { ascending: false })
            .limit(1);
          
          if (!error && missingOrders && missingOrders.length > 0) {
            console.log('🔍 轮询发现未提醒订单:', missingOrders[0].id);
            setNewOrderData(missingOrders[0]);
            setShowOrderAlert(true);
            // 🚀 报警逻辑已移至独立的 useEffect 循环处理
          }
        }
      } catch (err) {
        // 静默处理轮询错误
      }
    }, 15000); // 缩短到 15 秒轮询一次

    return () => {
      console.log('清理监听和轮询');
      clearInterval(pollMissingOrders);
      Vibration.cancel();
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [language, showOrderAlert]); // 增加 showOrderAlert 依赖，当弹窗消失后立刻恢复监听状态环境

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    try {
      await AsyncStorage.setItem('ml-express-language', lang);
    } catch (error) {
      LoggerService.error('保存语言设置失败:', error);
    }
  };

  return (
    <AppContext.Provider value={{ 
      language, 
      setLanguage,
      showOrderAlert,
      setShowOrderAlert,
      newOrderData,
      setNewOrderData
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
