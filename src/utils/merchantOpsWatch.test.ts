import {
  PENDING_ACCEPT_TIMEOUT_MINUTES,
  buildPendingWatchOrders,
  collectStockAlerts,
  filterWatchRows,
  formatAgeLabel,
  isOverduePending,
  isWithinOperatingHours,
  localDateKey,
  overdueCutoffIso,
  resolveStoreHoursState,
  rowHasWatchIssue,
  sortWatchRows,
  summarizeWatchRows,
  type MerchantOpsWatchRow,
} from './merchantOpsWatch';

function row(partial: Partial<MerchantOpsWatchRow>): MerchantOpsWatchRow {
  return {
    storeId: 's1',
    storeName: '测试店',
    storeCode: 'MDY001',
    region: 'mandalay',
    storeType: 'restaurant',
    status: 'active',
    phone: '091',
    managerPhone: '092',
    hours: {
      closedToday: false,
      onVacation: false,
      inHours: true,
      shouldBeOpen: true,
      hoursLabel: '09:00 - 21:00',
    },
    pending: [],
    overdueCount: 0,
    oldestOverdueMs: null,
    stockAlerts: [],
    outOfStockCount: 0,
    lowStockCount: 0,
    ...partial,
  };
}

describe('merchantOpsWatch', () => {
  it('uses the same 10-minute accept timeout as the watch board', () => {
    expect(PENDING_ACCEPT_TIMEOUT_MINUTES).toBe(10);
    const now = new Date('2026-08-30T10:00:00.000Z');
    expect(isOverduePending('2026-08-30T09:51:00.000Z', now)).toBe(false);
    expect(isOverduePending('2026-08-30T09:50:00.000Z', now)).toBe(true);
    expect(overdueCutoffIso(now)).toBe('2026-08-30T09:50:00.000Z');
  });

  it('treats 今日打烊 and vacation as intentional close, not after-hours', () => {
    const noon = new Date();
    noon.setHours(13, 0, 0, 0);
    const closed = resolveStoreHoursState(
      { is_closed_today: true, operating_hours: '09:00 - 21:00' },
      noon,
    );
    expect(closed.closedToday).toBe(true);
    expect(closed.shouldBeOpen).toBe(false);

    const vacation = resolveStoreHoursState(
      {
        is_closed_today: false,
        vacation_dates: [localDateKey(noon)],
        operating_hours: '09:00 - 21:00',
      },
      noon,
    );
    expect(vacation.onVacation).toBe(true);
    expect(vacation.shouldBeOpen).toBe(false);

    const afterHours = new Date();
    afterHours.setHours(23, 10, 0, 0);
    const after = resolveStoreHoursState(
      { is_closed_today: false, vacation_dates: [], operating_hours: '09:00 - 21:00' },
      afterHours,
    );
    expect(after.inHours).toBe(false);
    expect(after.closedToday).toBe(false);
    expect(after.shouldBeOpen).toBe(false);
  });

  it('supports overnight hours', () => {
    const late = new Date();
    late.setHours(23, 30, 0, 0);
    expect(isWithinOperatingHours('22:00 - 02:00', late)).toBe(true);
    expect(isWithinOperatingHours('09:00 - 21:00', late)).toBe(false);
  });

  it('collects out-of-stock and low-stock the same way as the merchant close report', () => {
    const alerts = collectStockAlerts([
      { id: 'p1', name: '芒果', stock: 0 },
      { id: 'p2', name: '奶茶', stock: 2 },
      { id: 'p3', name: '正常', stock: 8 },
      {
        id: 'p4',
        name: '套餐',
        stock: 9,
        variants: [
          { name: '大杯', stock: 0, is_available: true },
          { name: '停售', stock: 0, is_available: false },
        ],
      },
      { id: 'p5', name: '已拒', stock: 0, listing_status: 'rejected' },
    ]);
    expect(alerts.map((a) => `${a.productName}:${a.variantName || ''}:${a.level}`)).toEqual([
      '芒果::out',
      '套餐:大杯:out',
      '奶茶::low',
    ]);
  });

  it('sorts pending orders by age and marks overdue ones', () => {
    const now = new Date('2026-08-30T10:00:00.000Z');
    const pending = buildPendingWatchOrders(
      [
        { id: 'new', created_at: '2026-08-30T09:55:00.000Z', sender_name: 'A' },
        { id: 'old', created_at: '2026-08-30T09:40:00.000Z', sender_name: 'B' },
      ],
      now,
    );
    expect(pending[0].id).toBe('old');
    expect(pending[0].overdue).toBe(true);
    expect(pending[1].overdue).toBe(false);
    expect(formatAgeLabel(12 * 60 * 1000)).toBe('12 分钟');
    expect(formatAgeLabel(65 * 60 * 1000)).toBe('1 小时 5 分');
  });

  it('filters watch rows by tab and search, and ignores after-hours-only stores', () => {
    const closed = row({
      storeId: 'c',
      storeName: '关店面',
      storeCode: 'YGN1',
      region: 'yangon',
      hours: {
        closedToday: true,
        onVacation: false,
        inHours: true,
        shouldBeOpen: false,
        hoursLabel: '09:00 - 21:00',
      },
    });
    const stock = row({
      storeId: 'k',
      storeName: '缺货店',
      storeCode: 'MDY2',
      outOfStockCount: 2,
    });
    const overdue = row({
      storeId: 'o',
      storeName: '超时店',
      storeCode: 'POL3',
      overdueCount: 1,
      oldestOverdueMs: 20 * 60 * 1000,
    });
    const quiet = row({ storeId: 'q', storeName: '正常店' });

    expect(rowHasWatchIssue(quiet)).toBe(false);
    expect(filterWatchRows([closed, stock, overdue, quiet], '', 'all').map((r) => r.storeId)).toEqual(
      ['c', 'k', 'o'],
    );
    expect(filterWatchRows([closed, stock, overdue], '', 'closed').map((r) => r.storeId)).toEqual(['c']);
    expect(filterWatchRows([closed, stock, overdue], '', 'stock').map((r) => r.storeId)).toEqual(['k']);
    expect(filterWatchRows([closed, stock, overdue], '', 'overdue').map((r) => r.storeId)).toEqual(['o']);
    expect(filterWatchRows([closed, stock], 'ygn', 'all').map((r) => r.storeId)).toEqual(['c']);
    expect(filterWatchRows([closed, stock], '', 'all', 'mandalay').map((r) => r.storeId)).toEqual(['k']);

    const summary = summarizeWatchRows([closed, stock, overdue]);
    expect(summary).toEqual({
      closed: 1,
      stock: 1,
      overdue: 1,
      overdueOrders: 1,
      outOfStockItems: 2,
    });

    expect(sortWatchRows([stock, overdue, closed]).map((r) => r.storeId)).toEqual(['o', 'c', 'k']);
  });
});
