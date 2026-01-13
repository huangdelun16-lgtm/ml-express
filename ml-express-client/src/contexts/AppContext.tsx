import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import LoggerService from '../services/LoggerService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
import * as Speech from 'expo-speech';
import { Vibration } from 'react-native';

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

  // 从本地存储加载语言设置
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLang = await AsyncStorage.getItem('ml-express-language');
        if (savedLang && (savedLang === 'zh' || savedLang === 'en' || savedLang === 'my')) {
          setLanguageState(savedLang as Language);
        }
      } catch (error) {
        LoggerService.error('加载语言设置失败:', error);
      }
    };
    loadLanguage();
  }, []);

  // 🚀 全局订单监听逻辑
  useEffect(() => {
    const setupOrderListener = async () => {
      try {
        const currentUserStr = await AsyncStorage.getItem('currentUser');
        if (!currentUserStr) return;
        
        const user = JSON.parse(currentUserStr);
        if (user.user_type === 'partner' && user.id) {
          console.log('✅ 检测到商家账号，建立全局订单监听:', user.id);
          
          // 如果已有监听，先清理
          if (subscriptionRef.current) {
            console.log('清理旧监听');
            supabase.removeChannel(subscriptionRef.current);
          }

          const subscription = supabase
            .channel(`global-merchant-orders-${user.id}`)
            .on('postgres_changes', { 
              event: 'INSERT', 
              schema: 'public', 
              table: 'packages',
              // 🚀 核心修复：确保 filter 字段名与数据库完全一致
              // 注意：Supabase 的 filter 只支持简单的字段比较
              filter: `delivery_store_id=eq.${user.id}` 
            }, payload => {
              const newOrder = payload.new;
              console.log('🔔 全局监听到新订单消息:', { id: newOrder.id, status: newOrder.status, store_id: newOrder.delivery_store_id });
              
              if (newOrder.status === '待确认') {
                setNewOrderData(newOrder);
                setShowOrderAlert(true);
                
                // 🚀 核心优化：震动 + 循环语音直到接单
                Vibration.vibrate([0, 500, 200, 500], false);
                
                // 语音播报
                const speakText = language === 'my' 
                  ? 'သင့်မှာ အော်ဒါအသစ်ရှိပါတယ်၊ ကျေးဇူးပြု၍ လက်ခံပေးပါ' 
                  : language === 'en' 
                  ? 'You have a new order, please accept' 
                  : '你有新的订单，请接单';
                
                Speech.speak(speakText, { 
                  language: language === 'my' ? 'my-MM' : language === 'en' ? 'en-US' : 'zh-CN',
                  rate: 0.9
                });
              }
            })
            .subscribe((status) => {
              console.log('📡 Supabase 监听订阅状态:', status);
            });
          
          subscriptionRef.current = subscription;
        }
      } catch (error) {
        console.warn('建立订单监听失败:', error);
      }
    };

    setupOrderListener();

    // 🚀 新增：轮询补丁（每30秒检查一次，防止错过Realtime消息）
    const pollMissingOrders = setInterval(async () => {
      try {
        const currentUserStr = await AsyncStorage.getItem('currentUser');
        if (!currentUserStr) return;
        const user = JSON.parse(currentUserStr);
        
        if (user.user_type === 'partner' && user.id && !showOrderAlert) {
          const { data: missingOrders } = await supabase
            .from('packages')
            .select('*')
            .eq('delivery_store_id', user.id)
            .eq('status', '待确认')
            .limit(1);
          
          if (missingOrders && missingOrders.length > 0) {
            console.log('🔍 轮询补丁发现未处理订单:', missingOrders[0].id);
            setNewOrderData(missingOrders[0]);
            setShowOrderAlert(true);
            
            Vibration.vibrate([0, 500, 200, 500], false);
            
            const speakText = language === 'my' 
              ? 'သင့်မှာ အော်ဒါအသစ်ရှိပါတယ်၊ ကျေးဇူးပြု၍ လက်ခံပေးပါ' 
              : language === 'en' 
              ? 'You have a new order, please accept' 
              : '你有新的订单，请接单';
            
            Speech.speak(speakText, { 
              language: language === 'my' ? 'my-MM' : language === 'en' ? 'en-US' : 'zh-CN',
              rate: 0.9
            });
          }
        }
      } catch (err) {
        console.warn('轮询补丁执行失败:', err);
      }
    }, 30000);

    return () => {
      console.log('清理监听和轮询');
      clearInterval(pollMissingOrders);
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [language]); // 当语言改变时，重新订阅以确保语音正确 (实际上主要是需要 user 状态)

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
