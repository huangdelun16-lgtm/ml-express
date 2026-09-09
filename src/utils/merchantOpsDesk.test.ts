import {
  buildNudgeMessage,
  buildOpsWatchCsv,
  isStoreIgnoredToday,
  markStoreContacted,
  mergeDeskStates,
  normalizeDeskForDay,
  parseDeskState,
  setStoreIgnoredToday,
  shouldHideStockOnlyIgnored,
  toWhatsAppDigits,
} from './merchantOpsDesk';
import { stockOnlyIssue, type MerchantOpsWatchRow } from './merchantOpsWatch';

function row(partial: Partial<MerchantOpsWatchRow>): MerchantOpsWatchRow {
  return {
    storeId: 's1',
    storeName: '测试店',
    storeCode: 'MDY002',
    region: 'mandalay',
    storeType: 'restaurant',
    status: 'active',
    phone: '09123456789',
    managerPhone: '',
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
    lowStockCount: 5,
    ...partial,
  };
}

describe('merchantOpsDesk', () => {
  it('clears yesterday ignore ids at a new local date', () => {
    const next = normalizeDeskForDay(
      { contacted: {}, ignoreDay: '2026-09-08', ignoredStoreIds: ['s1'] },
      '2026-09-09',
    );
    expect(next.ignoreDay).toBe('2026-09-09');
    expect(next.ignoredStoreIds).toEqual([]);
  });

  it('merges contacted and same-day ignore from local over remote', () => {
    const merged = mergeDeskStates(
      {
        contacted: { a: { at: '1', by: 'remote', note: 'r' } },
        ignoreDay: '2026-09-09',
        ignoredStoreIds: ['x'],
      },
      {
        contacted: { a: { at: '2', by: 'local', note: 'l' }, b: { at: '3', by: 'me', note: '' } },
        ignoreDay: '2026-09-09',
        ignoredStoreIds: ['y'],
      },
      '2026-09-09',
    );
    expect(merged.contacted.a.by).toBe('local');
    expect(merged.contacted.b.by).toBe('me');
    expect(merged.ignoredStoreIds.sort()).toEqual(['x', 'y']);
  });

  it('only hides stock-only stores that were ignored today', () => {
    const stock = row({ lowStockCount: 5 });
    const overdue = row({ storeId: 'o', overdueCount: 1, lowStockCount: 5 });
    expect(stockOnlyIssue(stock)).toBe(true);
    expect(stockOnlyIssue(overdue)).toBe(false);
    const desk = setStoreIgnoredToday(
      { contacted: {}, ignoreDay: '2026-09-09', ignoredStoreIds: [] },
      stock.storeId,
      true,
      '2026-09-09',
    );
    expect(shouldHideStockOnlyIgnored(stock, desk, '2026-09-09')).toBe(true);
    expect(shouldHideStockOnlyIgnored(overdue, desk, '2026-09-09')).toBe(false);
    expect(isStoreIgnoredToday(desk, stock.storeId, '2026-09-08')).toBe(false);
  });

  it('records who contacted a store and Myanmar WhatsApp digits', () => {
    const next = markStoreContacted(parseDeskState(null), 's1', 'Aung', '已打', '2026-09-09T04:00:00.000Z');
    expect(next.contacted.s1).toEqual({
      at: '2026-09-09T04:00:00.000Z',
      by: 'Aung',
      note: '已打',
    });
    expect(toWhatsAppDigits('09123456789')).toBe('959123456789');
    expect(
      buildNudgeMessage(
        row({
          pending: [
            {
              id: '1',
              createdAt: '2026-09-09T04:00:00.000Z',
              ageMs: 60_000,
              remainMs: 540_000,
              overdue: false,
            },
          ],
        }),
        'zh',
      ),
    ).toContain('催接单');
  });

  it('builds a csv with stock and contact columns', () => {
    const csv = buildOpsWatchCsv(
      [row({ outOfStockCount: 0, lowStockCount: 5 })],
      {
        contacted: { s1: { at: 't', by: '调度', note: '偏低' } },
        ignoreDay: '2026-09-09',
        ignoredStoreIds: ['s1'],
      },
      '2026-09-09',
    );
    expect(csv).toContain('偏低');
    expect(csv).toContain('MDY002');
    expect(csv.split('\n')[1]).toContain('5');
  });
});
