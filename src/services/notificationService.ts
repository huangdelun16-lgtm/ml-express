import { supabase } from './supabase';

/**
 * 核心推送服务 - 用于从管理端向骑手/用户发送通知
 */
export const notificationService = {
  /**
   * 发送推送通知给骑手
   * @param courierName 骑手姓名
   * @param title 通知标题
   * @param body 通知内容
   * @param data 附加数据
   */
  async sendPushNotificationToCourier(courierName: string, title: string, body: string, data?: any): Promise<boolean> {
    try {
      console.log(`📡 准备向骑手 ${courierName} 发送通知:`, { title, body });

      // 1. 获取骑手的推送令牌
      // 注意：有的骑手可能用的是 admin_accounts 登录，有的用的是 couriers 登录
      // 我们同时查两张表
      
      let pushToken = null;

      // 查 couriers 表
      const { data: courierData, error: courierError } = await supabase
        .from('couriers')
        .select('push_token')
        .eq('name', courierName)
        .maybeSingle();

      if (courierData?.push_token) {
        pushToken = courierData.push_token;
      } else {
        // 查 admin_accounts 表
        const { data: adminData, error: adminError } = await supabase
          .from('admin_accounts')
          .select('push_token')
          .eq('employee_name', courierName)
          .maybeSingle();
        
        if (adminData?.push_token) {
          pushToken = adminData.push_token;
        }
      }

      if (!pushToken) {
        console.warn(`⚠️ 无法发送推送：找不到骑手 ${courierName} 的有效推送令牌`);
        return false;
      }

      // 2. 调用 Expo 推送服务
      // 注意：在正式生产环境中，这通常应该通过 Netlify Function 转发以隐藏 Token 或进行限流
      // 这里为了快速实现功能，采用直接调用
      const message = {
        to: pushToken,
        sound: 'default', // 移动端会自动播放默认通知音
        title: title,
        body: body,
        data: {
          ...data,
          type: 'new_order',
          timestamp: new Date().toISOString()
        },
        channelId: 'new-task-channel', // 匹配 Android 渠道
        priority: 'high',
      };

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
      console.log('📤 Expo 推送发送结果:', result);
      
      return response.ok;
    } catch (error) {
      console.error('❌ 发送推送通知失败:', error);
      return false;
    }
  }
};

export default notificationService;
