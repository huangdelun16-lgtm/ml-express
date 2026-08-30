import {
  buildTodayCloseReport,
  collectStockAlerts,
  isOnLocalDate,
  parseMoneyAmount,
} from './merchantOpsReport';

describe('merchantOpsReport', () => {
  it('parseMoneyAmount strips currency text', () => {
    expect(parseMoneyAmount('3,500 MMK')).toBe(3500);
    expect(parseMoneyAmount(1200)).toBe(1200);
    expect(parseMoneyAmount(null)).toBe(0);
  });

  it('isOnLocalDate matches the local calendar day', () => {
    const now = new Date(2026, 7, 30, 10, 0, 0);
    expect(isOnLocalDate(now.toISOString(), '2026-08-30')).toBe(true);
    expect(isOnLocalDate('2026-08-29T12:00:00', '2026-08-30')).toBe(false);
  });

  it('collectStockAlerts ignores unlimited stock and ranks out before low', () => {
    const alerts = collectStockAlerts([
      { id: 'a', name: '可乐', stock: -1 },
      { id: 'b', name: '面包', stock: 0 },
      { id: 'c', name: '牛奶', stock: 2 },
      { id: 'd', name: '咖啡', stock: 8 },
      {
        id: 'e',
        name: '套餐',
        stock: 99,
        variants: [
          { name: '大杯', stock: 0, is_available: true },
          { name: '小杯', stock: 1, is_available: true },
          { name: '停售', stock: 0, is_available: false },
        ],
      },
    ]);
    expect(alerts.map((item) => item.productName + (item.variantName || '') + item.level)).toEqual([
      '面包out',
      '套餐大杯out',
      '套餐小杯low',
      '牛奶low',
    ]);
  });

  it('buildTodayCloseReport splits today vs leftover unfinished', () => {
    const now = new Date(2026, 7, 30, 18, 0, 0);
    const report = buildTodayCloseReport({
      now,
      products: [{ id: 'p1', name: '面包', stock: 0 }],
      orders: [
        { status: '待确认', created_at: '2026-08-30T09:00:00', price: '1000', cod_amount: 0 },
        { status: '打包中', created_at: '2026-08-29T09:00:00', price: '2000' },
        { status: '已送达', created_at: '2026-08-30T08:00:00', delivery_time: '2026-08-30T17:00:00', price: '1500', cod_amount: 5000 },
        { status: '已取消', created_at: '2026-08-30T11:00:00', price: '800' },
      ],
    });
    expect(report.todayOrderCount).toBe(3);
    expect(report.pendingConfirm).toBe(1);
    expect(report.packing).toBe(1);
    expect(report.unfinishedCount).toBe(2);
    expect(report.completedToday).toBe(1);
    expect(report.cancelledToday).toBe(1);
    expect(report.todayDeliveryFee).toBe(3300);
    expect(report.todayCodAmount).toBe(5000);
    expect(report.outOfStockCount).toBe(1);
  });
});
