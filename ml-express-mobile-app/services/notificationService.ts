import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
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
          sound: 'default', // 恢复使用默认声音
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
   * 发送通知给特定用户 (通过保存的 Push Token)
   */
  async sendPushNotificationToUser(userId: string, title: string, body: string, data?: any, imageUrl?: string): Promise<boolean> {
    try {
      // 1. 获取用户的推送令牌
      const { data: userData, error } = await supabase
        .from('users')
        .select('push_token')
        .eq('id', userId)
        .single();

      if (error || !userData?.push_token) {
        console.warn(`⚠️ 无法发送推送：找不到用户 ${userId} 的有效令牌`);
        return false;
      }

      // 2. 调用 Expo 推送服务 (通常通过后端转发，这里模拟或直接调用)
      const message: any = {
        to: userData.push_token,
        sound: 'default',
        title: title,
        body: body,
        data: data || {},
      };

      // 🚀 新增：富媒体推送支持 (图片附件)
      if (imageUrl) {
        // 对于 iOS，需要 mutableContent 和 attachments
        message.mutableContent = true;
        message.attachments = [{ url: imageUrl }];
        // 对于 Android，某些厂商支持在 data 中传图片，或者使用 BigPicture 样式
        message.data = { ...message.data, image: imageUrl };
      }

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      console.log('📤 推送发送结果:', result);
      return true;
    } catch (error) {
      console.error('❌ 发送推送通知异常:', error);
      return false;
    }
  },

  /**
   * 保存站内通知到数据库
   */
  async saveInAppNotification(userId: string, title: string, content: string, type: string = 'order', relatedId?: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_notifications')
        .insert([{
          user_id: userId,
          title,
          content,
          type,
          related_id: relatedId,
          is_read: false,
          created_at: new Date().toISOString()
        }]);

      if (error) {
        console.error('❌ 保存站内通知失败:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('❌ 保存站内通知异常:', error);
      return false;
    }
  },

  /**
   * 发送订单送达通知给寄件人
   */
  async notifySenderOnDelivery(packageId: string, customerId: string): Promise<void> {
    const title = '📦 订单已送达';
    const content = `您的订单 ${packageId} 已成功送达收件人手中。感谢使用 ML Express！`;
    
    // 🚀 新增：尝试获取送达照片 URL
    let deliveryPhotoUrl = undefined;
    try {
      const { data: photos } = await supabase
        .from('delivery_photos')
        .select('photo_url')
        .eq('package_id', packageId)
        .order('upload_time', { ascending: false })
        .limit(1);
      
      if (photos && photos.length > 0) {
        deliveryPhotoUrl = photos[0].photo_url;
      }
    } catch (err) {
      console.warn('获取送达照片用于推送失败:', err);
    }

    // 同时发送推送和站内通知
    await Promise.all([
      this.sendPushNotificationToUser(customerId, title, content, { packageId, type: 'delivery_success' }, deliveryPhotoUrl),
      this.saveInAppNotification(customerId, title, content, 'order', packageId)
    ]);
  },

  /**
   * 将 Token 保存到 Supabase
   */
  async savePushTokenToSupabase(token: string, userIdArg?: string, courierIdArg?: string): Promise<boolean> {
    try {
      const userId = userIdArg || await AsyncStorage.getItem('currentUserId');
      const courierId = courierIdArg || await AsyncStorage.getItem('currentCourierId');

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
      const notificationListener = Notifications.addNotificationReceivedListener(async (notification: any) => {
        console.log('🔔 收到前台通知:', notification);
        
        // 🚀 新增：自动语音播报“你有新的订单”
        const title = notification.request.content.title;
        const data = notification.request.content.data;

        if (title?.includes('新包裹') || title?.includes('新订单') || data?.type === 'new_order' || title?.includes('分配')) {
          try {
            // 从存储中获取当前语言设置
            const language = await AsyncStorage.getItem('ml-express-language') || 'zh';
            
            // 🚀 强化语音播报内容
            let speakText = '';
            if (language === 'my') {
              speakText = 'သင့်တွင် မြို့တွင်းပို့ဆောင်ရေး အော်ဒါအသစ်တစ်ခုရှိသည်။ ကျေးဇူးပြု၍ အချိန်မီစစ်ဆေးပါ။';
            } else if (language === 'en') {
              speakText = 'You have a new local delivery order. Please check it in time.';
            } else {
              speakText = '您有新的同城配送订单，请及时查看';
            }
            
            Speech.speak(speakText, {
              language: language === 'my' ? 'my-MM' : language === 'en' ? 'en-US' : 'zh-CN',
              pitch: 1.0,
              rate: 0.9, // 稍微放慢语速，更清晰
            });
          } catch (speechError) {
            console.warn('语音播报失败:', speechError);
          }
        }
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

