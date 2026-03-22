import { supabase } from './supabase';

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
      console.log('📤 准备发送消息:', messageData);
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
        console.error('❌ 发送消息数据库报错:', error);
        throw error;
      }
      console.log('✅ 消息发送成功:', data);
      return { success: true, data };
    } catch (error) {
      console.error('🚨 发送聊天消息异常:', error);
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
      console.error('获取聊天记录失败:', error);
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
      console.error('标记消息已读失败:', error);
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
      console.error('获取未读消息数失败:', error);
      return 0;
    }
  }
};
