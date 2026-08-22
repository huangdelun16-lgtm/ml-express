import { supabase } from './supabase';
import LoggerService from './LoggerService';
import { unreadCountsFromRows, type ChatMessage } from './chatMerge';

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

export type { ChatMessage };

export type ChatSubscription = {
  unsubscribe: () => void;
};

const DEFAULT_POLL_MS = 5000;

async function fetchOrderMessages(orderId: string): Promise<ChatMessage[]> {
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

  getOrderMessages: fetchOrderMessages,

  /**
   * 订阅订单的新消息。
   * Realtime WS 在缅甸不可达（Netlify /__sb 无法升级 WebSocket），因此同时用 REST 轮询兜底。
   */
  subscribeToMessages(
    orderId: string,
    onMessage: (message: ChatMessage) => void,
    options?: { pollIntervalMs?: number },
  ): ChatSubscription {
    const seenIds = new Set<string>();
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    const pollIntervalMs = options?.pollIntervalMs ?? DEFAULT_POLL_MS;

    const ingest = (msgs: ChatMessage[], emitNew: boolean) => {
      for (const msg of msgs) {
        if (!msg?.id || seenIds.has(msg.id)) continue;
        seenIds.add(msg.id);
        if (emitNew) onMessage(msg);
      }
    };

    const poll = async (emitNew: boolean) => {
      if (cancelled) return;
      const msgs = await fetchOrderMessages(orderId);
      ingest(msgs, emitNew);
    };

    void poll(false).then(() => {
      if (cancelled) return;
      timer = setInterval(() => {
        void poll(true);
      }, pollIntervalMs);
    });

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
          const msg = payload.new as ChatMessage;
          if (!msg?.id || seenIds.has(msg.id)) return;
          seenIds.add(msg.id);
          onMessage(msg);
        }
      )
      .subscribe();

    return {
      unsubscribe() {
        cancelled = true;
        if (timer) clearInterval(timer);
        channel.unsubscribe();
      },
    };
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
  },

  async getUnreadCountForOrder(orderId: string, userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('order_id', orderId)
        .neq('sender_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      if (isLikelyNetworkError(error)) {
        LoggerService.debug('获取订单未读：网络暂不可用，返回 0', error);
      } else {
        LoggerService.error('获取订单未读失败:', error);
      }
      return 0;
    }
  },

  async getUnreadCountsByOrder(userId: string, orderIds: string[]): Promise<Record<string, number>> {
    if (!orderIds.length) return {};
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('order_id, is_read')
        .in('order_id', orderIds)
        .eq('is_read', false)
        .neq('sender_id', userId);

      if (error) throw error;
      return unreadCountsFromRows(data);
    } catch (error) {
      if (isLikelyNetworkError(error)) {
        LoggerService.debug('批量未读：网络暂不可用', error);
      } else {
        LoggerService.error('批量未读失败:', error);
      }
      return {};
    }
  },
};

export { mergeIncomingMessages } from './chatMerge';
