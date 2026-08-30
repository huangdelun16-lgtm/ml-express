import {
  CHAT_WAIT_MINUTES,
  LOW_REVIEW_RATING,
  buildChatSessions,
  buildRefundPatch,
  classifyRefund,
  estimateBalanceRefundAmount,
  filterRefunds,
  filterReviews,
  isMissingRefundColumn,
  isStaffSender,
  matchesChatFilter,
  reviewNeedsWatch,
  reviewWatchFlags,
  summarizeChatSessions,
  summarizeRefunds,
  summarizeReviews,
} from './afterSalesDesk';

describe('afterSalesDesk reviews', () => {
  it('flags low ratings and pending / hidden, but not every unreplied publish', () => {
    expect(LOW_REVIEW_RATING).toBe(2);
    const low = reviewWatchFlags({ rating: 1, status: 'published', reply_text: 'ok' });
    expect(low.low).toBe(true);
    expect(reviewNeedsWatch({ rating: 1, status: 'published', reply_text: 'ok' })).toBe(true);
    expect(reviewNeedsWatch({ rating: 5, status: 'published' })).toBe(false);
    expect(reviewWatchFlags({ rating: 5, status: 'published' }).unreplied).toBe(true);
    expect(reviewNeedsWatch({ rating: 5, status: 'pending' })).toBe(true);
    expect(reviewNeedsWatch({ rating: 4, status: 'hidden' })).toBe(true);
  });

  it('filters the default needs queue to low / pending / hidden', () => {
    const rows = [
      { id: 'a', rating: 1, status: 'published', comment: '慢' },
      { id: 'b', rating: 5, status: 'published', comment: '好' },
      { id: 'c', rating: 4, status: 'hidden', comment: '不当' },
      { id: 'd', rating: 5, status: 'pending', comment: '审' },
    ];
    expect(filterReviews(rows, '', 'needs').map((r) => r.id)).toEqual(['a', 'c', 'd']);
    expect(filterReviews(rows, '慢', 'all').map((r) => r.id)).toEqual(['a']);
    expect(summarizeReviews(rows)).toMatchObject({ needs: 3, low: 1, hidden: 1, pending: 1 });
  });
});

describe('afterSalesDesk chats', () => {
  it('groups by order and marks customer-last as waiting / overdue', () => {
    const now = new Date('2026-08-30T10:00:00.000Z');
    const sessions = buildChatSessions(
      [
        {
          order_id: 'A',
          sender_type: 'customer',
          message: '货到了吗',
          created_at: '2026-08-30T09:30:00.000Z',
        },
        {
          order_id: 'B',
          sender_type: 'customer',
          message: '你好',
          created_at: '2026-08-30T09:58:00.000Z',
        },
        {
          order_id: 'B',
          sender_type: 'merchant',
          message: '在路上',
          created_at: '2026-08-30T09:59:00.000Z',
        },
        {
          order_id: 'C',
          sender_type: 'admin',
          message: '已帮您问店',
          created_at: '2026-08-30T09:50:00.000Z',
        },
      ],
      now,
    );
    expect(CHAT_WAIT_MINUTES).toBe(15);
    expect(sessions.map((s) => s.orderId)).toEqual(['A', 'B', 'C']);
    const a = sessions.find((s) => s.orderId === 'A')!;
    expect(a.waitingStaff).toBe(true);
    expect(a.overdue).toBe(true);
    expect(sessions.find((s) => s.orderId === 'B')!.waitingStaff).toBe(false);
    expect(isStaffSender('admin')).toBe(true);
    expect(matchesChatFilter(a, 'overdue')).toBe(true);
    expect(summarizeChatSessions(sessions)).toEqual({ waiting: 1, overdue: 1 });
  });
});

describe('afterSalesDesk refunds', () => {
  it('estimates member balance refund like merchant decline', () => {
    expect(
      estimateBalanceRefundAmount({
        description: '[下单身份: 会员][商品费用 (仅余额支付): 3,500 MMK]',
        payment_method: 'cash',
        price: '2,000 MMK',
      }),
    ).toBe(3500);
    expect(
      estimateBalanceRefundAmount({
        description: '[下单身份: VIP][商品费用（仅余额支付）: 1,000 MMK]',
        payment_method: 'balance',
        price: '800',
      }),
    ).toBe(1800);
  });

  it('only follows cancelled paid orders, and keeps marked outcomes', () => {
    expect(classifyRefund({ status: '已送达', payment_method: 'balance' })).toBeNull();
    expect(
      classifyRefund({
        status: '已取消',
        payment_method: 'cash',
        description: '普通件',
      }),
    ).toBeNull();
    expect(
      classifyRefund({
        id: 'c1',
        status: '已取消',
        payment_method: 'balance',
        price: '1000',
      }),
    ).toBe('pending');
    expect(
      classifyRefund({
        status: '已取消',
        payment_method: 'qr',
        price: '1000',
      }),
    ).toBe('pending');
    expect(
      classifyRefund({
        status: '已取消',
        payment_method: 'balance',
        refund_status: 'refunded',
      }),
    ).toBe('refunded');

    const rows = [
      { id: '1', status: '已取消', payment_method: 'balance', price: '100' },
      { id: '2', status: '已取消', payment_method: 'balance', refund_status: 'waived' },
      { id: '3', status: '已取消', payment_method: 'cash' },
    ];
    expect(filterRefunds(rows, '', 'pending').map((r) => r.id)).toEqual(['1']);
    expect(summarizeRefunds(rows)).toEqual({ pending: 1, refunded: 0, waived: 1 });
  });

  it('builds a refund patch and detects missing-column fallback', () => {
    const patch = buildRefundPatch(
      'refunded',
      1200,
      '拒单退余额',
      { id: 'fin01', name: '财务A' },
      't',
    );
    expect(patch).toMatchObject({
      refund_status: 'refunded',
      refund_amount: 1200,
      refund_by: 'fin01',
    });
    expect(isMissingRefundColumn({ code: 'PGRST204', message: 'column' })).toBe(true);
    expect(isMissingRefundColumn({ code: '42501', message: 'denied' })).toBe(false);
  });
});
