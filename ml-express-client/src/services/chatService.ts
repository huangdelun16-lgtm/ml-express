import { supabase } from './supabase';
import LoggerService from './LoggerService';

/** 断网/代理不可达等场景下 Supabase 会抛网络类错误，不应按 ERROR 打日志以免触发 RN LogBox 红屏 */
function isLikelyNetworkError(err: unknown): boolean {
  if (err == null) return false;
  const e = err as { message?: string; name?: string; details?: string };
  const text = [e.message, e.details, e.name, typeof err === 'string' ? err : ''].filter(Boolean).join(' ');
  if (!text) return false;
  return (
    text.includes('Network request failed') ||
    text.includes('Failed to fetch') ||
    text.includes('The Internet connection appears to be offline')
  );
}

export interface ChatMessage {
  id: string;
  order_id: string;
  sender_id: string;
  sender_type: 'customer' | 'rider' | 'merchant' | 'admin';
  message: string;
  image_url?: string;
  is_read: boolean;
  created_at: string;
}

export const chatService = {
  /**
   * 发送消息
   */
  async sendMessage(messageData: Omit<ChatMessage, 'id' | 'created_at' | 'is_read'>): Promise<{ success: boolean; data?: ChatMessage; error?: any }> {
    try {
      LoggerService.debug('📤 准备发送消息:', messageData);
      const { data, error } = await supabase
        .from('chat_messages')
        .insert([
          {
            ...messageData,
            is_read: false,
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (error) {
        LoggerService.error('❌ 发送消息数据库报错:', error);
        throw error;
      }
      LoggerService.debug('✅ 消息发送成功:', data);
      return { success: true, data };
    } catch (error) {
      LoggerService.error('🚨 发送聊天消息异常:', error);
      return { success: false, error };
    }
  },

  /**
   * 获取订单的消息记录
   */
  async getOrderMessages(orderId: string): Promise<ChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      if (isLikelyNetworkError(error)) {
        LoggerService.debug('获取聊天记录：网络暂不可用', error);
      } else {
        LoggerService.error('获取聊天记录失败:', error);
      }
      return [];
    }
  },

  /**
   * 订阅订单的新消息
   */
  subscribeToMessages(orderId: string, onMessage: (message: ChatMessage) => void) {
    const channel = supabase
      .channel(`chat-order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `order_id=eq.${orderId}`
        },
        (payload) => {
          onMessage(payload.new as ChatMessage);
        }
      )
      .subscribe();

    return channel;
  },

  /**
   * 标记消息为已读
   */
  async markAsRead(orderId: string, receiverId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('order_id', orderId)
        .neq('sender_id', receiverId)
        .eq('is_read', false);

      if (error) throw error;
      return true;
    } catch (error) {
      if (isLikelyNetworkError(error)) {
        LoggerService.debug('标记消息已读：网络暂不可用', error);
      } else {
        LoggerService.error('标记消息已读失败:', error);
      }
      return false;
    }
  },

  /**
   * 获取未读消息数
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .neq('sender_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      if (isLikelyNetworkError(error)) {
        LoggerService.debug('获取未读消息数：网络暂不可用，返回 0', error);
      } else {
        LoggerService.error('获取未读消息数失败:', error);
      }
      return 0;
    }
  }
};
