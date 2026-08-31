import { describe, expect, it } from 'vitest';
import type { FinanceLedgerEntry } from '../types/financeLedger';
import {
  buildFinanceExportCsv,
  buildFinanceExportFilename,
  escapeCsvCell,
  formatFinanceExportAmount,
  formatFinanceExportDateTime,
  toCsvRow,
  type FinanceExportLabels,
} from './financeLedgerExport';

const LABELS: FinanceExportLabels = {
  metaTitle: '跨境会计导出',
  hub: '站点',
  store: '店铺',
  tab: '分类',
  exportedAt: '导出时间',
  recordCount: '明细条数',
  balance: '结余',
  collected: '已收包裹费',
  transportUnpaid: '待付车费',
  transportPaid: '已付车费',
  pendingInflow: '待入账包裹费',
  agencyPayable: '代收应转',
  manualIncome: '其它收入',
  manualExpense: '其它支出',
  colTime: '时间',
  colCategory: '分类',
  colTitle: '标题',
  colSubtitle: '说明',
  colBarcode: '条码',
  colItem: '商品',
  colAmount: '金额',
  colAmountDisplay: '金额展示',
  colDest: '目的地',
  colOrigin: '发站',
  colFee: '车费',
  colPaid: '已付',
  paidYes: '是',
  paidNo: '否',
};

function entry(
  partial: Partial<FinanceLedgerEntry> & Pick<FinanceLedgerEntry, 'id' | 'category'>,
): FinanceLedgerEntry {
  return {
    title: '',
    subtitle: '',
    amount: null,
    amountDisplay: '',
    occurredAt: '',
    barcode: '',
    itemName: '',
    ...partial,
  };
}

describe('escapeCsvCell / toCsvRow', () => {
  it('普通文本不包引号', () => {
    expect(escapeCsvCell('YGN')).toBe('YGN');
    expect(toCsvRow(['时间', '分类', 1200])).toBe('时间,分类,1200');
  });

  it('逗号、换行、双引号会转义', () => {
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvCell('line1\nline2')).toBe('"line1\nline2"');
  });
});

describe('formatFinanceExportDateTime / Amount', () => {
  it('无效时间原样返回', () => {
    expect(formatFinanceExportDateTime('not-a-date')).toBe('not-a-date');
    expect(formatFinanceExportDateTime('')).toBe('');
  });

  it('本地可读时间不含秒', () => {
    const text = formatFinanceExportDateTime('2026-08-31T08:05:09.000Z');
    expect(text).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });

  it('金额保留 0 与负数，空值留空', () => {
    expect(formatFinanceExportAmount(0)).toBe('0');
    expect(formatFinanceExportAmount(-50)).toBe('-50');
    expect(formatFinanceExportAmount(12.5)).toBe('12.50');
    expect(formatFinanceExportAmount(null)).toBe('');
    expect(formatFinanceExportAmount(Number.NaN)).toBe('');
  });
});

describe('buildFinanceExportFilename', () => {
  it('站点 + tab + 本地日期', () => {
    expect(
      buildFinanceExportFilename({ hub: 'YGN', tab: 'all', at: new Date(2026, 7, 31) }),
    ).toBe('ML-finance-YGN-all-20260831.csv');
  });

  it('清洗非法字符', () => {
    expect(
      buildFinanceExportFilename({ hub: 'YGN 01', tab: 'all/../x', at: new Date(2026, 0, 2) }),
    ).toBe('ML-finance-YGN01-allx-20260102.csv');
  });

  it('空站点回退 HUB', () => {
    expect(buildFinanceExportFilename({ hub: '  ', tab: '', at: new Date(2026, 7, 1) })).toBe(
      'ML-finance-HUB-all-20260801.csv',
    );
  });
});

describe('buildFinanceExportCsv', () => {
  const collected = entry({
    id: 'c1',
    category: 'order_collected',
    title: '签收',
    subtitle: 'note, with comma',
    amount: 1500,
    amountDisplay: '+1500',
    occurredAt: '2026-08-30T10:00:00.000Z',
    barcode: 'PKG-YGN-1',
    itemName: '衣物',
    destination: 'YGN',
    originLabel: 'RUILI',
    originKey: 'RUI001',
  });
  const transport = entry({
    id: 't1',
    category: 'transport_cost',
    title: '车费',
    amount: null,
    transportFee: 200,
    paid: false,
    occurredAt: '2026-08-29T12:00:00.000Z',
    barcode: 'TRIP-1',
    destination: 'MDY',
  });
  const paidTransport = entry({
    id: 't2',
    category: 'transport_cost',
    title: '车费',
    amount: 80,
    transportFee: 80,
    paid: true,
    occurredAt: 'bad-date',
    barcode: 'TRIP-2',
  });

  const csv = buildFinanceExportCsv({
    entries: [collected, transport, paidTransport],
    summary: {
      collectedTotal: 1500,
      transportUnpaidTotal: 200,
      transportPaidTotal: 80,
      pendingInflowTotal: 0,
      agencyPayableTotal: 300,
      manualIncomeTotal: 10,
      manualExpenseTotal: 5,
    },
    netBalance: 1425,
    meta: {
      hub: 'YGN',
      store: 'YGN001',
      tab: '全部',
      exportedAt: '2026-08-31 17:00',
    },
    labels: LABELS,
    categoryLabel: (e) => (e.category === 'order_collected' ? '已签收' : '车费'),
    amountDisplay: (e) => e.amountDisplay || (e.paid ? '已支付' : '待登记车费'),
  });

  it('带 UTF-8 BOM，Excel 能开中文', () => {
    expect(csv.startsWith('\uFEFF')).toBe(true);
  });

  it('文件头含站点汇总与当前 tab 条数', () => {
    expect(csv).toContain('跨境会计导出');
    expect(csv).toContain('站点,YGN');
    expect(csv).toContain('店铺,YGN001');
    expect(csv).toContain('分类,全部');
    expect(csv).toContain('导出时间,2026-08-31 17:00');
    expect(csv).toContain('明细条数,3');
    expect(csv).toContain('结余,1425');
    expect(csv).toContain('已收包裹费,1500');
    expect(csv).toContain('待付车费,200');
    expect(csv).toContain('已付车费,80');
    expect(csv).toContain('代收应转,300');
    expect(csv).toContain('其它收入,10');
    expect(csv).toContain('其它支出,5');
  });

  it('明细用本地化分类，不用 raw category', () => {
    expect(csv).toContain('已签收');
    expect(csv).not.toContain('order_collected');
    expect(csv).toContain('PKG-YGN-1');
    expect(csv).toContain('衣物');
    expect(csv).toContain('YGN');
    expect(csv).toContain('RUILI');
    expect(csv).toContain('"note, with comma"');
  });

  it('车费行导出金额、车费与已付状态', () => {
    const body = csv.slice(1);
    expect(body).toContain('TRIP-1');
    expect(body).toMatch(/TRIP-1.*200.*否/);
    expect(body).toContain('TRIP-2,');
    expect(body).toContain('bad-date');
    expect(body).toMatch(/TRIP-2.*是/);
  });

  it('列标题齐全', () => {
    expect(csv).toContain(
      '时间,分类,标题,说明,条码,商品,金额,金额展示,目的地,发站,车费,已付',
    );
  });
});
