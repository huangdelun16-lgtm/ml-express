import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../services/supabase';
import { feedbackService } from '../services/FeedbackService';
import {
  fetchAfterSalesDesk,
  markPackageRefund,
  sendAdminChatReply,
  setReviewVisibility,
  type AfterSalesChatItem,
  type AfterSalesDeskData,
  type AfterSalesRefundItem,
  type AfterSalesReviewItem,
} from '../services/afterSalesDeskService';
import {
  CHAT_WAIT_MINUTES,
  filterChatSessions,
  filterRefunds,
  filterReviews,
  formatWaitLabel,
  reviewWatchFlags,
  summarizeChatSessions,
  summarizeRefunds,
  summarizeReviews,
  type AfterSalesTab,
  type ChatWatchFilter,
  type RefundWatchFilter,
  type ReviewWatchFilter,
} from '../utils/afterSalesDesk';
import '../styles/merchantApplications.css';
import '../styles/adminMerchantOpsWatch.css';
import '../styles/adminProductReviewQueue.css';
import '../styles/adminAfterSalesDesk.css';

type ChatMessageRow = {
  id: string;
  sender_type?: string;
  message?: string;
  created_at?: string;
};

function formatWhen(iso?: string | null, language?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(language === 'en' ? 'en-US' : 'zh-CN');
  } catch {
    return iso;
  }
}

const AfterSalesDeskPage: React.FC = () => {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = (searchParams.get('tab') || 'reviews') as AfterSalesTab;
  const tab: AfterSalesTab = ['reviews', 'chats', 'refunds'].includes(tabParam) ? tabParam : 'reviews';

  const [data, setData] = useState<AfterSalesDeskData>({ reviews: [], chats: [], refunds: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [reviewFilter, setReviewFilter] = useState<ReviewWatchFilter>('needs');
  const [chatFilter, setChatFilter] = useState<ChatWatchFilter>('waiting');
  const [refundFilter, setRefundFilter] = useState<RefundWatchFilter>('pending');
  const [openReview, setOpenReview] = useState<AfterSalesReviewItem | null>(null);
  const [openChat, setOpenChat] = useState<AfterSalesChatItem | null>(null);
  const [openRefund, setOpenRefund] = useState<AfterSalesRefundItem | null>(null);
  const [thread, setThread] = useState<ChatMessageRow[]>([]);
  const [reply, setReply] = useState('');
  const [refundNote, setRefundNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      const next = await fetchAfterSalesDesk();
      setData(next);
      setLastUpdatedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : isEn ? 'Failed to load' : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [isEn]);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load({ silent: true }), 30000);
    return () => window.clearInterval(t);
  }, [load]);

  const setTab = (next: AfterSalesTab) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'reviews') params.delete('tab');
    else params.set('tab', next);
    setSearchParams(params, { replace: true });
    setQuery('');
  };

  const reviewRows = useMemo(
    () => filterReviews(data.reviews, query, reviewFilter),
    [data.reviews, query, reviewFilter],
  );
  const reviewSummary = useMemo(() => summarizeReviews(data.reviews), [data.reviews]);
  const chatRows = useMemo(
    () => filterChatSessions(data.chats, query, chatFilter),
    [data.chats, query, chatFilter],
  );
  const chatSummary = useMemo(() => summarizeChatSessions(data.chats), [data.chats]);
  const refundRows = useMemo(
    () => filterRefunds(data.refunds, query, refundFilter),
    [data.refunds, query, refundFilter],
  );
  const refundSummary = useMemo(() => summarizeRefunds(data.refunds), [data.refunds]);

  const openThread = async (session: AfterSalesChatItem) => {
    setOpenChat(session);
    setReply('');
    const { data: msgs } = await supabase
      .from('chat_messages')
      .select('id, sender_type, message, created_at')
      .eq('order_id', session.orderId)
      .order('created_at', { ascending: true })
      .limit(80);
    setThread((msgs || []) as ChatMessageRow[]);
  };

  const hideReview = async (review: AfterSalesReviewItem, hidden: boolean) => {
    setBusy(true);
    try {
      const result = await setReviewVisibility(review, hidden ? 'hidden' : 'published');
      if (!result.ok) {
        feedbackService.notify(result.error || (isEn ? 'Failed' : '操作失败'));
        return;
      }
      feedbackService.notify(hidden ? (isEn ? 'Hidden' : '已隐藏') : (isEn ? 'Published' : '已恢复展示'));
      setOpenReview(null);
      await load({ silent: true });
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async () => {
    if (!openChat) return;
    setBusy(true);
    try {
      const result = await sendAdminChatReply(openChat.orderId, reply);
      if (!result.ok) {
        feedbackService.notify(result.error || (isEn ? 'Send failed' : '发送失败'));
        return;
      }
      setReply('');
      feedbackService.notify(isEn ? 'Replied' : '已回复');
      await openThread(openChat);
      await load({ silent: true });
    } finally {
      setBusy(false);
    }
  };

  const followRefund = async (
    status: 'refunded' | 'waived',
    creditBalance: boolean,
  ) => {
    if (!openRefund) return;
    setBusy(true);
    try {
      const result = await markPackageRefund({
        pkg: openRefund,
        status,
        note: refundNote,
        creditBalance,
      });
      if (!result.ok) {
        feedbackService.notify(result.error || (isEn ? 'Failed' : '操作失败'));
        return;
      }
      feedbackService.notify(
        status === 'waived'
          ? isEn
            ? 'Marked as no refund needed'
            : '已记为无需退'
          : creditBalance
            ? isEn
              ? 'Balance refunded'
              : '已退回余额'
            : isEn
              ? 'Marked refunded'
              : '已记为已退',
      );
      setOpenRefund(null);
      setRefundNote('');
      await load({ silent: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="merchant-apps-page">
      <div className="merchant-apps-header">
        <div>
          <h1>{isEn ? 'After-sales desk' : '售后跟单'}</h1>
          <p>
            {isEn
              ? `Moderate store reviews, reply to order chats waiting more than ${CHAT_WAIT_MINUTES} minutes, and follow cancelled paid refunds.`
              : `评价监管、客服会话、退款跟单。低分/待审/已隐藏评价、客户最后发言超过 ${CHAT_WAIT_MINUTES} 分钟的会话、已取消且可能已付款的退款。`}
          </p>
        </div>
        <div className="merchant-apps-toolbar">
          <input
            className="merchant-apps-filter"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              tab === 'reviews'
                ? isEn
                  ? 'Order / store / comment'
                  : '订单、店铺、评价'
                : tab === 'chats'
                  ? isEn
                    ? 'Order / message'
                    : '订单号、消息'
                  : isEn
                    ? 'Order / customer'
                    : '订单、客户'
            }
          />
          <button
            type="button"
            className="merchant-apps-btn merchant-apps-btn--ghost"
            onClick={() => void load({ silent: data.reviews.length > 0 })}
          >
            {isEn ? 'Refresh' : '刷新'}
          </button>
          <span className="merchant-apps-poll-hint">
            {isEn ? 'Auto-refresh every 30s' : '每 30 秒自动刷新'}
            {lastUpdatedAt
              ? ` · ${isEn ? 'Updated' : '已更新'} ${new Date(lastUpdatedAt).toLocaleTimeString()}`
              : ''}
          </span>
        </div>
      </div>

      <div className="asd-tabs">
        <button type="button" className={`asd-tab${tab === 'reviews' ? ' is-active' : ''}`} onClick={() => setTab('reviews')}>
          {isEn ? 'Reviews' : '评价监管'} ({reviewSummary.needs})
        </button>
        <button type="button" className={`asd-tab${tab === 'chats' ? ' is-active' : ''}`} onClick={() => setTab('chats')}>
          {isEn ? 'Chats' : '客服会话'} ({chatSummary.waiting})
        </button>
        <button type="button" className={`asd-tab${tab === 'refunds' ? ' is-active' : ''}`} onClick={() => setTab('refunds')}>
          {isEn ? 'Refunds' : '退款跟单'} ({refundSummary.pending})
        </button>
      </div>

      {error && (
        <div className="merchant-apply-alert merchant-apply-alert--error" role="alert">
          {error}
        </div>
      )}

      {tab === 'reviews' && (
        <>
          <div className="mow-summary">
            {([
              ['needs', reviewSummary.needs, isEn ? 'Needs watch' : '需关注'],
              ['low', reviewSummary.low, isEn ? 'Low rating' : '低分'],
              ['unreplied', reviewSummary.unreplied, isEn ? 'Unreplied' : '待回复'],
              ['hidden', reviewSummary.hidden, isEn ? 'Hidden' : '已隐藏'],
              ['pending', reviewSummary.pending, isEn ? 'Pending' : '待审'],
            ] as Array<[ReviewWatchFilter, number, string]>).map(([key, n, label]) => (
              <button
                key={key}
                type="button"
                className={`mow-chip${reviewFilter === key ? ' is-active' : ''}`}
                onClick={() => setReviewFilter(key)}
              >
                <strong>{n}</strong>
                <span>{label}</span>
              </button>
            ))}
          </div>
          <div className="merchant-apps-table-wrap">
            {loading && data.reviews.length === 0 ? (
              <div className="merchant-apps-empty">{isEn ? 'Loading…' : '加载中…'}</div>
            ) : reviewRows.length === 0 ? (
              <div className="merchant-apps-empty">
                {isEn ? 'No reviews in this filter.' : '这个筛选下没有评价。'}
              </div>
            ) : (
              <table className="merchant-apps-table">
                <thead>
                  <tr>
                    <th>{isEn ? 'Review' : '评价'}</th>
                    <th>{isEn ? 'Store / order' : '店铺 / 订单'}</th>
                    <th>{isEn ? 'Flags' : '状态'}</th>
                    <th>{isEn ? 'When' : '时间'}</th>
                    <th>{isEn ? 'Actions' : '操作'}</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewRows.map((row) => {
                    const flags = reviewWatchFlags(row);
                    return (
                      <tr key={String(row.id)}>
                        <td>
                          <div className="asd-stars">{'★'.repeat(Number(row.rating || 0) || 0)}</div>
                          <div className="prd-review-sub">{row.user_name || '—'}</div>
                          <div>{String(row.comment || '').slice(0, 80) || '—'}</div>
                        </td>
                        <td>
                          <div className="prd-review-name">{row.store_name || row.store_id || '—'}</div>
                          <div className="prd-review-sub">{row.order_id || '—'}</div>
                        </td>
                        <td>
                          <div className="mow-flags">
                            {flags.low && <span className="mow-flag mow-flag--overdue">{isEn ? 'Low' : '低分'}</span>}
                            {flags.pending && <span className="mow-flag mow-flag--vacation">{isEn ? 'Pending' : '待审'}</span>}
                            {flags.hidden && <span className="mow-flag mow-flag--closed">{isEn ? 'Hidden' : '已隐藏'}</span>}
                            {flags.unreplied && <span className="mow-flag">{isEn ? 'No reply' : '未回复'}</span>}
                          </div>
                        </td>
                        <td>{formatWhen(row.created_at, language)}</td>
                        <td>
                          <button
                            type="button"
                            className="merchant-apps-btn merchant-apps-btn--ghost"
                            onClick={() => setOpenReview(row)}
                          >
                            {isEn ? 'Open' : '查看'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {tab === 'chats' && (
        <>
          <div className="mow-summary">
            {([
              ['waiting', chatSummary.waiting, isEn ? 'Waiting staff' : '待回复'],
              ['overdue', chatSummary.overdue, isEn ? `Over ${CHAT_WAIT_MINUTES} min` : `超过 ${CHAT_WAIT_MINUTES} 分钟`],
              ['all', data.chats.length, isEn ? 'All sessions' : '全部会话'],
            ] as Array<[ChatWatchFilter, number, string]>).map(([key, n, label]) => (
              <button
                key={key}
                type="button"
                className={`mow-chip${chatFilter === key ? ' is-active' : ''}`}
                onClick={() => setChatFilter(key)}
              >
                <strong>{n}</strong>
                <span>{label}</span>
              </button>
            ))}
          </div>
          <div className="merchant-apps-table-wrap">
            {loading && data.chats.length === 0 ? (
              <div className="merchant-apps-empty">{isEn ? 'Loading…' : '加载中…'}</div>
            ) : chatRows.length === 0 ? (
              <div className="merchant-apps-empty">
                {isEn ? 'No chat sessions in this filter.' : '这个筛选下没有会话。'}
              </div>
            ) : (
              <table className="merchant-apps-table">
                <thead>
                  <tr>
                    <th>{isEn ? 'Order' : '订单'}</th>
                    <th>{isEn ? 'Last message' : '最后一条'}</th>
                    <th>{isEn ? 'Wait' : '等待'}</th>
                    <th>{isEn ? 'Actions' : '操作'}</th>
                  </tr>
                </thead>
                <tbody>
                  {chatRows.map((row) => (
                    <tr key={row.orderId} className={row.overdue ? 'mow-row--hot' : ''}>
                      <td>
                        <div className="prd-review-name">{row.orderId}</div>
                        <div className="prd-review-sub">
                          {row.storeName || row.senderName || '—'} · {row.orderStatus || '—'}
                        </div>
                      </td>
                      <td>
                        <div>{row.lastMessage || '—'}</div>
                        <div className="prd-review-sub">
                          {row.lastSenderType || '—'} · {row.messageCount}
                          {isEn ? ' msgs' : ' 条'}
                        </div>
                      </td>
                      <td>
                        {row.waitingStaff ? formatWaitLabel(row.waitMs) : isEn ? 'Staff last' : '店/骑手/后台已回'}
                        {row.overdue ? (
                          <div className="mow-flag mow-flag--overdue">{isEn ? 'Overdue' : '超时'}</div>
                        ) : null}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="merchant-apps-btn merchant-apps-btn--ghost"
                          onClick={() => void openThread(row)}
                        >
                          {isEn ? 'Reply' : '回复'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {tab === 'refunds' && (
        <>
          <div className="mow-summary">
            {([
              ['pending', refundSummary.pending, isEn ? 'Need follow-up' : '待跟'],
              ['refunded', refundSummary.refunded, isEn ? 'Refunded' : '已退'],
              ['waived', refundSummary.waived, isEn ? 'No refund' : '无需退'],
              ['all', refundSummary.pending + refundSummary.refunded + refundSummary.waived, isEn ? 'All' : '全部'],
            ] as Array<[RefundWatchFilter, number, string]>).map(([key, n, label]) => (
              <button
                key={key}
                type="button"
                className={`mow-chip${refundFilter === key ? ' is-active' : ''}`}
                onClick={() => setRefundFilter(key)}
              >
                <strong>{n}</strong>
                <span>{label}</span>
              </button>
            ))}
          </div>
          <div className="merchant-apps-table-wrap">
            {loading && data.refunds.length === 0 ? (
              <div className="merchant-apps-empty">{isEn ? 'Loading…' : '加载中…'}</div>
            ) : refundRows.length === 0 ? (
              <div className="merchant-apps-empty">
                {isEn ? 'No refund rows in this filter.' : '这个筛选下没有退款跟单。'}
              </div>
            ) : (
              <table className="merchant-apps-table">
                <thead>
                  <tr>
                    <th>{isEn ? 'Order' : '订单'}</th>
                    <th>{isEn ? 'Pay / amount' : '支付 / 金额'}</th>
                    <th>{isEn ? 'Status' : '状态'}</th>
                    <th>{isEn ? 'Actions' : '操作'}</th>
                  </tr>
                </thead>
                <tbody>
                  {refundRows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div className="prd-review-name">{row.id}</div>
                        <div className="prd-review-sub">
                          {row.delivery_store_name || row.sender_name || '—'} · {row.receiver_name || '—'}
                        </div>
                      </td>
                      <td>
                        {row.payment_method || '—'} · {(row.estimatedAmount || 0).toLocaleString()} MMK
                      </td>
                      <td>
                        {row.refundKind === 'pending'
                          ? isEn
                            ? 'Pending'
                            : '待跟'
                          : row.refundKind === 'refunded'
                            ? isEn
                              ? 'Refunded'
                              : '已退'
                            : isEn
                              ? 'Waived'
                              : '无需退'}
                        {row.refund_by_name ? (
                          <div className="prd-review-sub">{row.refund_by_name}</div>
                        ) : null}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="merchant-apps-btn merchant-apps-btn--ghost"
                          onClick={() => {
                            setOpenRefund(row);
                            setRefundNote(row.refund_note || '');
                          }}
                        >
                          {isEn ? 'Follow' : '跟单'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {openReview && (
        <div className="merchant-apps-modal-overlay" role="dialog" aria-modal="true" onClick={() => setOpenReview(null)}>
          <div className="merchant-apps-modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(560px, 100%)', padding: 20 }}>
            <h2>{isEn ? 'Review' : '评价详情'}</h2>
            <p className="asd-stars">{'★'.repeat(Number(openReview.rating || 0) || 0)}</p>
            <p>{openReview.comment || '—'}</p>
            <p className="prd-review-sub">
              {openReview.store_name || '—'} · {openReview.order_id || '—'} · {formatWhen(openReview.created_at, language)}
            </p>
            {openReview.reply_text ? (
              <p>
                {isEn ? 'Store reply: ' : '商家回复：'}
                {openReview.reply_text}
              </p>
            ) : null}
            <div className="merchant-apps-toolbar" style={{ marginTop: 12 }}>
              {String(openReview.status) === 'hidden' ? (
                <button
                  type="button"
                  className="merchant-apps-btn"
                  disabled={busy}
                  onClick={() => void hideReview(openReview, false)}
                >
                  {isEn ? 'Publish again' : '恢复展示'}
                </button>
              ) : (
                <button
                  type="button"
                  className="merchant-apps-btn"
                  disabled={busy}
                  onClick={() => void hideReview(openReview, true)}
                >
                  {isEn ? 'Hide' : '隐藏'}
                </button>
              )}
              <button type="button" className="merchant-apps-btn merchant-apps-btn--ghost" onClick={() => setOpenReview(null)}>
                {isEn ? 'Close' : '关闭'}
              </button>
            </div>
          </div>
        </div>
      )}

      {openChat && (
        <div className="merchant-apps-modal-overlay" role="dialog" aria-modal="true" onClick={() => setOpenChat(null)}>
          <div className="merchant-apps-modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(640px, 100%)', padding: 20 }}>
            <h2>{isEn ? `Chat ${openChat.orderId}` : `会话 ${openChat.orderId}`}</h2>
            <p className="prd-review-sub">
              {openChat.storeName || openChat.senderName || '—'} · {openChat.receiverName || '—'}
            </p>
            <div className="asd-thread">
              {thread.map((msg) => (
                <div
                  key={msg.id}
                  className={`asd-bubble${msg.sender_type === 'customer' ? ' asd-bubble--customer' : ' asd-bubble--staff'}`}
                >
                  <div className="prd-review-sub">{msg.sender_type || '—'} · {formatWhen(msg.created_at, language)}</div>
                  <div>{msg.message || '—'}</div>
                </div>
              ))}
            </div>
            <div className="asd-reply">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder={isEn ? 'Reply as admin…' : '以后台身份回复…'}
              />
              <button type="button" className="merchant-apps-btn" disabled={busy || !reply.trim()} onClick={() => void sendReply()}>
                {isEn ? 'Send' : '发送'}
              </button>
            </div>
            <button type="button" className="merchant-apps-btn merchant-apps-btn--ghost" onClick={() => setOpenChat(null)}>
              {isEn ? 'Close' : '关闭'}
            </button>
          </div>
        </div>
      )}

      {openRefund && (
        <div className="merchant-apps-modal-overlay" role="dialog" aria-modal="true" onClick={() => setOpenRefund(null)}>
          <div className="merchant-apps-modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(560px, 100%)', padding: 20 }}>
            <h2>{isEn ? `Refund ${openRefund.id}` : `退款跟单 ${openRefund.id}`}</h2>
            <p>
              {isEn ? 'Estimated' : '应退约'} {(openRefund.estimatedAmount || 0).toLocaleString()} MMK
              {' · '}
              {openRefund.payment_method || '—'}
            </p>
            <p className="prd-review-sub">
              {isEn ? 'Customer' : '客户'} {openRefund.customer_id || '—'} · {openRefund.receiver_name || openRefund.sender_name || '—'}
            </p>
            <textarea
              value={refundNote}
              onChange={(e) => setRefundNote(e.target.value)}
              placeholder={isEn ? 'Note (offline refund, reason to waive…)' : '备注（线下已退、无需退原因…）'}
              style={{ width: '100%', minHeight: 72, marginTop: 8 }}
            />
            <div className="merchant-apps-toolbar" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="merchant-apps-btn"
                disabled={busy}
                onClick={() => void followRefund('refunded', true)}
              >
                {isEn ? 'Refund balance' : '退回余额'}
              </button>
              <button
                type="button"
                className="merchant-apps-btn merchant-apps-btn--ghost"
                disabled={busy}
                onClick={() => void followRefund('refunded', false)}
              >
                {isEn ? 'Mark refunded' : '记为已退'}
              </button>
              <button
                type="button"
                className="merchant-apps-btn merchant-apps-btn--ghost"
                disabled={busy}
                onClick={() => void followRefund('waived', false)}
              >
                {isEn ? 'No refund needed' : '无需退'}
              </button>
              <button type="button" className="merchant-apps-btn merchant-apps-btn--ghost" onClick={() => setOpenRefund(null)}>
                {isEn ? 'Close' : '关闭'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AfterSalesDeskPage;
