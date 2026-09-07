import type { CrossBorderExpenseRow } from '../services/inventoryConsoleService';
import { buildHqFinanceExportCsv } from './crossBorderFinanceExport';

function row(partial: Partial<CrossBorderExpenseRow> & Pick<CrossBorderExpenseRow, 'id' | 'category'>): CrossBorderExpenseRow {
  return {
    title: '',
    subtitle: '',
    amount: 0,
    amountDisplay: '',
    occurredAt: '',
    barcode: '',
    itemName: '',
    stationCode: 'YGN',
    stationName: '仰光',
    statusLabel: '',
    ...partial,
  };
}

describe('buildHqFinanceExportCsv', () => {
  const csv = buildHqFinanceExportCsv({
    entries: [
      row({
        id: 'c1',
        category: 'collected',
        title: '已收',
        subtitle: 'note',
        amount: 188000,
        occurredAt: '2026-08-30T10:00:00.000Z',
        statusLabel: '已收',
        fxMmkPerCny: 5000,
        paidCurrency: 'CNY',
        paidCny: 37.6,
      }),
      row({
        id: 'p1',
        category: 'pending_inflow',
        title: '到付待入账',
        amount: 10000,
        occurredAt: '2026-08-31T02:00:00.000Z',
        statusLabel: '待入账',
      }),
      row({
        id: 't1',
        category: 'transport_unpaid',
        title: '装车车费 · 待付',
        amount: 200,
        occurredAt: '2026-08-29T12:00:00.000Z',
        statusLabel: '待付车费',
      }),
    ],
    summary: {
      entryCount: 3,
      collectedTotal: 188000,
      collectedCny: 37.6,
      transportUnpaidTotal: 200,
      transportPaidTotal: 0,
      pendingInflowTotal: 10000,
      transportRegisteredTotal: 200,
      agencyRemittedTotal: 0,
      manualIncomeTotal: 0,
      manualExpenseTotal: 0,
    },
    periodLabel: 'day 2026-08-31',
    stationLabel: '全部站点',
    isEn: false,
    liveRate: 5000,
  });

  it('带 BOM，并保留缅币账本列', () => {
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('跨境财务导出');
    expect(csv).toContain('已收MMK,188000');
    expect(csv).toContain('已收人民币,37.60');
    expect(csv).toContain('待入账,10000');
  });

  it('已收用锁定人民币，待入账用活汇率，车费不折人民币', () => {
    expect(csv).toContain('时间,类型,说明,站点,金额MMK,人民币,汇率,实收币种,汇率状态,状态');
    expect(csv).toContain('188000,37.60,5000,CNY,锁定');
    expect(csv).toContain('10000,2,5000,,活汇率');
    const truck = csv.split('\n').find((line) => line.includes('装车车费'));
    expect(truck).toBeTruthy();
    expect(truck).not.toContain('锁定');
    expect(truck).not.toContain('活汇率');
  });
});
