import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🚩 核心修复：更严格的环境检测
// SDK 53+ 在 Android Expo Go 中完全禁用了远程推送
const isExpoGoAndroid = Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// 动态获取 Notifications 模块，防止在不支持的环境下初始化
let Notifications: any = null;
if (!isExpoGoAndroid) {
  try {
    Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (e) {
    console.warn('❌ 无法加载 expo-notifications:', e);
  }
}

export const notificationService = {
  /**
   * 注册推送通知并获取 Token
   */
  async registerForPushNotificationsAsync(): Promise<string | null> {
    if (isExpoGoAndroid || !Notifications) {
      console.warn('⚠️ 当前环境 (Expo Go Android) 不支持推送注册，已跳过。');
      return null;
    }

    let token = null;

    if (!Device.isDevice) {
      console.log('⚠️ 推送通知仅支持真机');
      return null;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('❌ 用户拒绝了推送通知权限');
        return null;
      }

      // 获取 Expo Push Token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: '9831d961-9124-46ed-8581-bf406616439f',
      });
      token = tokenData.data;
      console.log('✅ 获取到推送令牌:', token);

      // 配置 Android 通知渠道
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('new-task-channel', {
          name: '新任务提醒',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'new-task.wav',
          enableVibrate: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });
      }

      return token;
    } catch (error) {
      console.error('❌ 注册推送通知失败:', error);
      return null;
    }
  },

  /**
   * 将 Token 保存到 Supabase
   */
  async savePushTokenToSupabase(token: string): Promise<boolean> {
    try {
      const userId = await AsyncStorage.getItem('currentUserId');
      const courierId = await AsyncStorage.getItem('currentCourierId');

      if (!userId && !courierId) {
        console.warn('⚠️ 未找到当前登录用户 ID，无法保存推送令牌');
        return false;
      }

      let success = false;

      // 1. 更新管理/员工表
      if (userId) {
        console.log(`📤 正在更新 admin_accounts 中的推送令牌...`);
        const { error } = await supabase
          .from('admin_accounts')
          .update({ push_token: token })
          .eq('id', userId);
        
        if (!error) success = true;
      }

      // 2. 如果是骑手，也要更新 couriers 表
      if (courierId) {
        console.log(`📤 正在更新 couriers 中的推送令牌...`);
        const { error } = await supabase
          .from('couriers')
          .update({ push_token: token })
          .eq('id', courierId);
        
        if (!error) success = true;
      }

      if (success) {
        console.log('✅ 推送令牌已成功同步到数据库');
      } else {
        console.error('❌ 保存推送令牌到数据库失败');
      }

      return success;
    } catch (error) {
      console.error('❌ 保存推送令牌异常:', error);
      return false;
    }
  },

  /**
   * 初始化通知监听器
   */
  initNotificationListeners() {
    if (isExpoGoAndroid || !Notifications) return () => {};

    try {
      // 监听通知进入前台
      const notificationListener = Notifications.addNotificationReceivedListener((notification: any) => {
        console.log('🔔 收到前台通知:', notification);
      });

      // 监听用户点击通知
      const responseListener = Notifications.addNotificationResponseReceivedListener((response: any) => {
        console.log('🖱️ 用户点击了通知:', response);
      });

      return () => {
        if (notificationListener) Notifications.removeNotificationSubscription(notificationListener);
        if (responseListener) Notifications.removeNotificationSubscription(responseListener);
      };
    } catch (e) {
      console.warn('Failed to init notification listeners:', e);
      return () => {};
    }
  }
};

