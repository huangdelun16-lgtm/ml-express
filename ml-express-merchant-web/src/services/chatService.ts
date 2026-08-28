import { supabase } from './supabase';
import LoggerService from './LoggerService';
import { unreadCountsFromRows } from './_shared/chatUnread';

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

export type ChatSubscription = {
  unsubscribe: () => void;
};

const DEFAULT_POLL_MS = 8000;
const UNREAD_IN_CHUNK = 80;

function isLikelyNetworkError(err: unknown): boolean {
  if (err == null) return false;
  const e = err as { message?: string; name?: string; details?: string };
  const text = [e.message, e.details, e.name, typeof err === 'string' ? err : '']
    .filter(Boolean)
    .join(' ');
  if (!text) return false;
  return (
    text.includes('Failed to fetch') ||
    text.includes('NetworkError') ||
    text.includes('Network request failed')
  );
}

async function fetchOrderMessages(orderId: string): Promise<ChatMessage[]> {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []) as ChatMessage[];
  } catch (error) {
    if (isLikelyNetworkError(error)) {
      LoggerService.debug('获取聊天记录：网络暂不可用', error);
    } else {
      LoggerService.error('获取聊天记录失败', error);
    }
    return [];
  }
}

export const chatService = {
  async sendMessage(
    messageData: Omit<ChatMessage, 'id' | 'created_at' | 'is_read'>,
  ): Promise<{ success: boolean; data?: ChatMessage; error?: unknown }> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert([
          {
            ...messageData,
            is_read: false,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();
      if (error) throw error;
      return { success: true, data: data as ChatMessage };
    } catch (error) {
      LoggerService.error('发送聊天消息失败', error);
      return { success: false, error };
    }
  },

  getOrderMessages: fetchOrderMessages,

  subscribeToMessages(
    orderId: string,
    onMessage: (message: ChatMessage) => void,
    options?: { pollIntervalMs?: number },
  ): ChatSubscription {
    const seenIds = new Set<string>();
    let cancelled = false;
    let timer: number | null = null;
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
      ingest(await fetchOrderMessages(orderId), emitNew);
    };

    void poll(false).then(() => {
      if (cancelled) return;
      timer = window.setInterval(() => {
        void poll(true);
      }, pollIntervalMs);
    });

    const channel = supabase
      .channel(`merchant-web-chat-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          const msg = payload.new as ChatMessage;
          if (!msg?.id || seenIds.has(msg.id)) return;
          seenIds.add(msg.id);
          onMessage(msg);
        },
      )
      .subscribe();

    return {
      unsubscribe() {
        cancelled = true;
        if (timer) window.clearInterval(timer);
        supabase.removeChannel(channel);
      },
    };
  },

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
      if (!isLikelyNetworkError(error)) {
        LoggerService.error('标记消息已读失败', error);
      }
      return false;
    }
  },

  async getUnreadCountsByOrder(
    userId: string,
    orderIds: string[],
  ): Promise<Record<string, number>> {
    if (!userId || !orderIds.length) return {};
    const counts: Record<string, number> = {};
    try {
      for (let i = 0; i < orderIds.length; i += UNREAD_IN_CHUNK) {
        const slice = orderIds.slice(i, i + UNREAD_IN_CHUNK);
        const { data, error } = await supabase
          .from('chat_messages')
          .select('order_id, is_read')
          .in('order_id', slice)
          .eq('is_read', false)
          .neq('sender_id', userId);
        if (error) throw error;
        Object.assign(counts, unreadCountsFromRows(data));
      }
      return counts;
    } catch (error) {
      if (!isLikelyNetworkError(error)) {
        LoggerService.error('批量未读失败', error);
      }
      return counts;
    }
  },
};
