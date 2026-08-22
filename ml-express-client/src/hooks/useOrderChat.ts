import { useCallback, useEffect, useRef, useState } from 'react';
import { Vibration } from 'react-native';
import {
  chatService,
  mergeIncomingMessages,
  type ChatMessage,
} from '../services/chatService';
import { feedbackService } from '../services/FeedbackService';

type UseOrderChatOptions = {
  orderId?: string | null;
  userId?: string | null;
  senderType?: ChatMessage['sender_type'];
  enabled?: boolean;
  sendFailedText?: string;
};

export function useOrderChat({
  orderId,
  userId,
  senderType = 'customer',
  enabled = true,
  sendFailedText,
}: UseOrderChatOptions) {
  const [showChatModal, setShowChatModal] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const showChatModalRef = useRef(false);
  const userIdRef = useRef(userId);

  showChatModalRef.current = showChatModal;
  userIdRef.current = userId;

  const ingest = useCallback((msg: ChatMessage) => {
    setMessages((prev) => {
      const exists = prev.some((m) => m.id === msg.id);
      const next = mergeIncomingMessages(prev, [msg]);
      if (!exists && next !== prev && !showChatModalRef.current && msg.sender_id !== userIdRef.current) {
        setTimeout(() => {
          setUnreadCount((n) => n + 1);
          Vibration.vibrate(100);
        }, 0);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!enabled || !orderId) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    void chatService.getOrderMessages(orderId).then((msgs) => {
      if (!cancelled) setMessages(msgs);
    });

    const sub = chatService.subscribeToMessages(orderId, ingest, { pollIntervalMs: 5000 });
    return () => {
      cancelled = true;
      sub.unsubscribe();
    };
  }, [enabled, orderId, ingest]);

  useEffect(() => {
    if (!enabled || !orderId || !userId) return;
    let cancelled = false;
    const tick = async () => {
      const count = await chatService.getUnreadCountForOrder(orderId, userId);
      if (!cancelled && !showChatModalRef.current) setUnreadCount(count);
    };
    void tick();
    const timer = setInterval(tick, 12000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [enabled, orderId, userId]);

  const openChat = useCallback(() => {
    if (!orderId) return;
    setShowChatModal(true);
    setUnreadCount(0);
    void chatService.getOrderMessages(orderId).then((msgs) => {
      setMessages((prev) => mergeIncomingMessages(prev, msgs));
    });
    if (userId) void chatService.markAsRead(orderId, userId);
  }, [orderId, userId]);

  const closeChat = useCallback(() => {
    setShowChatModal(false);
  }, []);

  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || !userId || !orderId || sending) return;

    const messageText = inputText.trim();
    const optimisticMsg: ChatMessage = {
      id: 'temp-' + Date.now(),
      order_id: orderId,
      sender_id: userId,
      sender_type: senderType,
      message: messageText,
      created_at: new Date().toISOString(),
      is_read: false,
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText('');
    setSending(true);

    const result = await chatService.sendMessage({
      order_id: orderId,
      sender_id: userId,
      sender_type: senderType,
      message: messageText,
    });

    setSending(false);
    if (result.success && result.data) {
      const saved = result.data;
      setMessages((prev) => mergeIncomingMessages(
        prev.map((m) => (m.id === optimisticMsg.id ? saved : m)),
        [saved],
      ));
      return;
    }

    setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
    setInputText(messageText);
    feedbackService.error(sendFailedText || 'Failed to send message');
  }, [inputText, userId, orderId, sending, senderType, sendFailedText]);

  return {
    showChatModal,
    openChat,
    closeChat,
    messages,
    inputText,
    setInputText,
    sending,
    sendMessage,
    unreadCount,
  };
}
