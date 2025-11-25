import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// 条件性导入 expo-notifications，避免在 Expo Go 中报错
let Notifications: any = null;
let NotificationsAvailable = false;

// 延迟加载函数，只在需要时导入
function loadNotificationsModule() {
  if (Notifications !== null) {
    return Notifications; // 已经加载过
  }

  // 检查是否在 Expo Go 中运行
  const isExpoGo = __DEV__ && !Constants.expoConfig?.extra?.eas?.projectId;
  
  if (isExpoGo) {
    console.log('⚠️ 在 Expo Go 中运行，通知功能已禁用');
    NotificationsAvailable = false;
    return null;
  }

  // 只在非 Expo Go 环境中尝试导入
  try {
    // 使用动态 require 避免在导入时触发错误
    Notifications = require('expo-notifications');
    NotificationsAvailable = true;
    return Notifications;
  } catch (error) {
    console.warn('⚠️ expo-notifications 导入失败:', error);
    NotificationsAvailable = false;
    return null;
  }
}

// 通知类型定义
export interface NotificationSettings {
  orderUpdates: boolean;
  deliveryReminders: boolean;
  promotionalMessages: boolean;
  systemAnnouncements: boolean;
  pushNotifications: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
}

// 通知数据接口
export interface NotificationData {
  id: string;
  type: 'order_update' | 'delivery_reminder' | 'promotional' | 'system_announcement';
  title: string;
  body: string;
  data?: any;
  scheduledTime?: Date;
}

class NotificationService {
  private static instance: NotificationService;
  private settings: NotificationSettings | null = null;

  private constructor() {
    this.initializeNotifications();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // 初始化通知服务
  private async initializeNotifications() {
    try {
      // 延迟加载通知模块
      const NotificationsModule = loadNotificationsModule();
      if (!NotificationsModule) {
        console.log('⚠️ 通知功能不可用（Expo Go 或未安装 expo-notifications）');
        return;
      }

      // 请求通知权限
      if (!NotificationsModule.requestPermissionsAsync) {
        console.log('⚠️ Notifications API 不可用');
        return;
      }
      const { status } = await NotificationsModule.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('通知权限未授予');
        return;
      }

      // 配置通知行为
      if (!NotificationsModule.setNotificationHandler) {
        return;
      }
      NotificationsModule.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      // 加载设置
      await this.loadSettings();
    } catch (error) {
      console.error('初始化通知服务失败:', error);
    }
  }

  // 加载通知设置
  public async loadSettings(): Promise<NotificationSettings> {
    try {
      const settings = await AsyncStorage.getItem('notificationSettings');
      if (settings) {
        this.settings = JSON.parse(settings);
      } else {
        // 默认设置
        this.settings = {
          orderUpdates: true,
          deliveryReminders: true,
          promotionalMessages: false,
          systemAnnouncements: true,
          pushNotifications: true,
          emailNotifications: false,
          smsNotifications: false,
        };
        await this.saveSettings(this.settings);
      }
      return this.settings;
    } catch (error) {
      console.error('加载通知设置失败:', error);
      return this.getDefaultSettings();
    }
  }

  // 保存通知设置
  public async saveSettings(settings: NotificationSettings): Promise<void> {
    try {
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(settings));
      this.settings = settings;
    } catch (error) {
      console.error('保存通知设置失败:', error);
      throw error;
    }
  }

  // 获取默认设置
  private getDefaultSettings(): NotificationSettings {
    return {
      orderUpdates: true,
      deliveryReminders: true,
      promotionalMessages: false,
      systemAnnouncements: true,
      pushNotifications: true,
      emailNotifications: false,
      smsNotifications: false,
    };
  }

  // 发送订单状态更新通知
  public async sendOrderUpdateNotification(orderData: {
    orderId: string;
    status: string;
    customerName: string;
    customerPhone: string;
  }): Promise<void> {
    if (!this.settings?.orderUpdates || !this.settings?.pushNotifications) {
      return;
    }

    const statusMessages = {
      '待取件': '您的包裹已分配，骑手即将取件',
      '已取件': '您的包裹已被骑手取件，正在配送中',
      '配送中': '您的包裹正在配送中，请保持电话畅通',
      '已送达': '您的包裹已送达，请查收',
      '已取消': '您的订单已取消',
    };

    const message = statusMessages[orderData.status as keyof typeof statusMessages] || '订单状态已更新';

    await this.sendNotification({
      id: `order_${orderData.orderId}_${Date.now()}`,
      type: 'order_update',
      title: '📦 订单状态更新',
      body: `${message} - 订单号: ${orderData.orderId}`,
      data: {
        orderId: orderData.orderId,
        status: orderData.status,
        customerName: orderData.customerName,
        customerPhone: orderData.customerPhone,
      },
    });
  }

  // 发送配送提醒通知
  public async sendDeliveryReminderNotification(deliveryData: {
    orderId: string;
    estimatedTime: string;
    courierName: string;
    courierPhone: string;
  }): Promise<void> {
    if (!this.settings?.deliveryReminders || !this.settings?.pushNotifications) {
      return;
    }

    await this.sendNotification({
      id: `delivery_${deliveryData.orderId}_${Date.now()}`,
      type: 'delivery_reminder',
      title: '🚚 配送提醒',
      body: `您的包裹预计${deliveryData.estimatedTime}送达，骑手: ${deliveryData.courierName}`,
      data: {
        orderId: deliveryData.orderId,
        estimatedTime: deliveryData.estimatedTime,
        courierName: deliveryData.courierName,
        courierPhone: deliveryData.courierPhone,
      },
    });
  }

  // 发送促销消息通知
  public async sendPromotionalNotification(promoData: {
    title: string;
    message: string;
    promoCode?: string;
    expiryDate?: string;
  }): Promise<void> {
    if (!this.settings?.promotionalMessages || !this.settings?.pushNotifications) {
      return;
    }

    await this.sendNotification({
      id: `promo_${Date.now()}`,
      type: 'promotional',
      title: `🎯 ${promoData.title}`,
      body: promoData.message,
      data: {
        promoCode: promoData.promoCode,
        expiryDate: promoData.expiryDate,
      },
    });
  }

  // 发送系统公告通知
  public async sendSystemAnnouncementNotification(announcementData: {
    title: string;
    message: string;
    priority: 'low' | 'medium' | 'high';
  }): Promise<void> {
    if (!this.settings?.systemAnnouncements || !this.settings?.pushNotifications) {
      return;
    }

    const priorityEmoji = {
      low: 'ℹ️',
      medium: '⚠️',
      high: '🚨',
    };

    await this.sendNotification({
      id: `system_${Date.now()}`,
      type: 'system_announcement',
      title: `${priorityEmoji[announcementData.priority]} ${announcementData.title}`,
      body: announcementData.message,
      data: {
        priority: announcementData.priority,
      },
    });
  }

  // 发送通知的核心方法
  private async sendNotification(notificationData: NotificationData): Promise<void> {
    try {
      const NotificationsModule = loadNotificationsModule();
      if (!NotificationsModule) {
        console.log('⚠️ 通知功能不可用，跳过发送');
        return;
      }
      if (!this.settings?.pushNotifications) {
        return;
      }

      const notificationContent = {
        title: notificationData.title,
        body: notificationData.body,
        data: notificationData.data,
        sound: 'default',
        priority: NotificationsModule.AndroidNotificationPriority.HIGH,
        vibrate: [0, 250, 250, 250],
      };

      if (notificationData.scheduledTime) {
        // 定时通知
        await NotificationsModule.scheduleNotificationAsync({
          content: notificationContent,
          trigger: {
            date: notificationData.scheduledTime,
          },
        });
      } else {
        // 立即通知
        await NotificationsModule.scheduleNotificationAsync({
          content: notificationContent,
          trigger: null,
        });
      }

      console.log('通知发送成功:', notificationData.title);
    } catch (error) {
      console.error('发送通知失败:', error);
    }
  }

  // 取消通知
  public async cancelNotification(notificationId: string): Promise<void> {
    try {
      const NotificationsModule = loadNotificationsModule();
      if (!NotificationsModule) return;
      await NotificationsModule.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('取消通知失败:', error);
    }
  }

  // 取消所有通知
  public async cancelAllNotifications(): Promise<void> {
    try {
      const NotificationsModule = loadNotificationsModule();
      if (!NotificationsModule) return;
      await NotificationsModule.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('取消所有通知失败:', error);
    }
  }

  // 获取待发送的通知列表
  public async getScheduledNotifications(): Promise<any[]> {
    try {
      const NotificationsModule = loadNotificationsModule();
      if (!NotificationsModule) return [];
      return await NotificationsModule.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('获取待发送通知失败:', error);
      return [];
    }
  }

  // 检查通知权限
  public async checkPermissions(): Promise<boolean> {
    try {
      const NotificationsModule = loadNotificationsModule();
      if (!NotificationsModule) return false;
      const { status } = await NotificationsModule.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('检查通知权限失败:', error);
      return false;
    }
  }

  // 请求通知权限
  public async requestPermissions(): Promise<boolean> {
    try {
      const NotificationsModule = loadNotificationsModule();
      if (!NotificationsModule) return false;
      const { status } = await NotificationsModule.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('请求通知权限失败:', error);
      return false;
    }
  }

  // 获取Expo推送令牌
  public async getExpoPushToken(): Promise<string | null> {
    try {
      const NotificationsModule = loadNotificationsModule();
      if (!NotificationsModule) return null;
      if (Platform.OS === 'android') {
        await NotificationsModule.setNotificationChannelAsync('default', {
          name: 'default',
          importance: NotificationsModule.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      const token = await NotificationsModule.getExpoPushTokenAsync();
      return token.data;
    } catch (error) {
      console.error('获取Expo推送令牌失败:', error);
      return null;
    }
  }

  // 处理通知点击事件
  public setupNotificationHandlers() {
    const NotificationsModule = loadNotificationsModule();
    if (!NotificationsModule) return;
    // 处理前台通知点击
    NotificationsModule.addNotificationReceivedListener(notification => {
      console.log('收到前台通知:', notification);
    });

    // 处理通知点击
    NotificationsModule.addNotificationResponseReceivedListener(response => {
      console.log('通知被点击:', response);
      const data = response.notification.request.content.data;
      
      // 根据通知类型处理点击事件
      if (data?.orderId) {
        // 跳转到订单详情页面
        // 这里需要根据具体的导航结构来实现
        console.log('跳转到订单详情:', data.orderId);
      }
    });
  }
}

export default NotificationService;
