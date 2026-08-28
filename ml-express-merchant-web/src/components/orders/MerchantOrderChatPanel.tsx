import React, { useEffect, useRef, useState } from 'react';
import { chatService, type ChatMessage } from '../../services/chatService';
import { dialCourierByAssignment } from '../../utils/courierPhone';
import { isCourierUnassigned } from '../../services/_shared/dialPhone';
import type { MerchantLanguage } from '../../constants/merchantOrderStatus';
import LoggerService from '../../services/LoggerService';

type Props = {
  orderId: string;
  userId?: string | null;
  courierName?: string | null;
  language: MerchantLanguage;
};

const copy = {
  zh: {
    title: '联系骑手',
    placeholder: '输入消息…',
    send: '发送',
    call: '拨打骑手电话',
    unassigned: '尚未分配骑手',
    noPhone: '未找到骑手电话',
    empty: '暂无消息，骑手回复后会显示在这里',
    failed: '发送失败',
  },
  en: {
    title: 'Courier chat',
    placeholder: 'Type a message…',
    send: 'Send',
    call: 'Call courier',
    unassigned: 'No courier assigned yet',
    noPhone: 'Courier phone not found',
    empty: 'No messages yet',
    failed: 'Failed to send',
  },
  my: {
    title: 'ပို့ဆောင်သူနှင့် စကားပြော',
    placeholder: 'စာရိုက်ပါ…',
    send: 'ပို့ရန်',
    call: 'ပို့ဆောင်သူကို ခေါ်ဆိုရန်',
    unassigned: 'ပို့ဆောင်သူ မသတ်မှတ်ရသေးပါ',
    noPhone: 'ဖုန်းနံပါတ် မတွေ့ပါ',
    empty: 'မက်ဆေ့ချ် မရှိသေးပါ',
    failed: 'ပို့၍မရပါ',
  },
};

const MerchantOrderChatPanel: React.FC<Props> = ({
  orderId,
  userId,
  courierName,
  language,
}) => {
  const t = copy[language] || copy.zh;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [dialHint, setDialHint] = useState('');
  const logRef = useRef<HTMLDivElement | null>(null);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  useEffect(() => {
    if (!orderId) return undefined;
    let cancelled = false;
    void chatService.getOrderMessages(orderId).then((rows) => {
      if (!cancelled) setMessages(rows);
    });
    const sub = chatService.subscribeToMessages(orderId, (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });
    return () => {
      cancelled = true;
      sub.unsubscribe();
    };
  }, [orderId]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages.length]);

  useEffect(() => {
    if (!orderId || !userId) return undefined;
    void chatService.markAsRead(orderId, userId);
  }, [orderId, userId, messages.length]);

  const handleCall = async () => {
    setDialHint('');
    const result = await dialCourierByAssignment(courierName);
    if (result === 'unassigned') setDialHint(t.unassigned);
    if (result === 'no-phone') setDialHint(t.noPhone);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !userId || sending) return;
    const optimistic: ChatMessage = {
      id: `temp-${Date.now()}`,
      order_id: orderId,
      sender_id: userId,
      sender_type: 'merchant',
      message: text,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput('');
    setSending(true);
    const result = await chatService.sendMessage({
      order_id: orderId,
      sender_id: userId,
      sender_type: 'merchant',
      message: text,
    });
    setSending(false);
    if (result.success && result.data) {
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? result.data! : m)),
      );
      return;
    }
    setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    setInput(text);
    LoggerService.error('商家 Web 发聊天失败', result.error);
    setDialHint(t.failed);
  };

  const canChat = Boolean(userId);
  const canCall = !isCourierUnassigned(courierName);

  return (
    <div className="merchant-chat-panel">
      <div className="merchant-chat-panel__header">
        <div>
          <div className="merchant-chat-panel__title">{t.title}</div>
          {courierName ? (
            <div className="merchant-chat-panel__sub">{courierName}</div>
          ) : null}
        </div>
        <button
          type="button"
          className="merchant-chat-panel__call"
          onClick={() => void handleCall()}
          disabled={!canCall}
        >
          {t.call}
        </button>
      </div>
      {dialHint ? <div className="merchant-chat-panel__hint">{dialHint}</div> : null}
      <div className="merchant-chat-panel__log" ref={logRef}>
        {messages.length === 0 ? (
          <div className="merchant-chat-panel__empty">{t.empty}</div>
        ) : (
          messages.map((msg) => {
            const mine = msg.sender_id === userIdRef.current;
            return (
              <div
                key={msg.id}
                className={`merchant-chat-bubble ${mine ? 'merchant-chat-bubble--mine' : ''}`}
              >
                {msg.message}
              </div>
            );
          })
        )}
      </div>
      {canChat ? (
        <form
          className="merchant-chat-panel__composer"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.placeholder}
            maxLength={500}
          />
          <button type="submit" disabled={sending || !input.trim()}>
            {t.send}
          </button>
        </form>
      ) : null}
    </div>
  );
};

export default MerchantOrderChatPanel;
