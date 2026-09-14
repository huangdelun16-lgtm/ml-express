import { describe, expect, it } from 'vitest';
import type { FinanceLedgerEntry } from '../types/financeLedger';
import {
  buildFinanceExportCsv,
  buildFinanceExportExcelBase64,
  buildFinanceExportFilename,
  buildFinanceExportSheets,
  escapeCsvCell,
  formatFinanceExportAmount,
  formatFinanceExportDateTime,
  toCsvRow,
  type FinanceExportLabels,
} from './financeLedgerExport';
import { buildInventoryExcelXlsx } from './inventoryExcelExport';

const LABELS: FinanceExportLabels = {
  metaTitle: '跨境会计导出',
  brand: 'MARKET LINK · 跨境会计',
  summarySheet: '汇总',
  detailSheet: '明细',
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
  colCny: '人民币',
  colFxRate: '汇率',
  colPaidCcy: '实收币种',
  colFxLock: '汇率状态',
  collectedCny: '已收人民币',
  paidYes: '是',
  paidNo: '否',
  fxLocked: '锁定',
  fxLive: '活汇率',
  fxLegacy: '旧单无锁',
  metric: '项目',
  value: '数值',
  noteBooks: '客户账人民币与缅甸开销缅币分列，不要互相加总',
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
  fxMmkPerCny: 5000,
  paidCurrency: 'CNY',
  paidCny: 0.3,
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

const exportParams = {
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
  categoryLabel: (e: FinanceLedgerEntry) =>
    e.category === 'order_collected' ? '已签收' : '车费',
  amountDisplay: (e: FinanceLedgerEntry) =>
    e.amountDisplay || (e.paid ? '已支付' : '待登记车费'),
  liveRate: 5000,
};

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
  it('站点 + tab + 本地日期，后缀 xlsx', () => {
    expect(
      buildFinanceExportFilename({ hub: 'YGN', tab: 'all', at: new Date(2026, 7, 31) }),
    ).toBe('ML-finance-YGN-all-20260831.xlsx');
  });

  it('清洗非法字符', () => {
    expect(
      buildFinanceExportFilename({ hub: 'YGN 01', tab: 'all/../x', at: new Date(2026, 0, 2) }),
    ).toBe('ML-finance-YGN01-allx-20260102.xlsx');
  });

  it('空站点回退 HUB', () => {
    expect(buildFinanceExportFilename({ hub: '  ', tab: '', at: new Date(2026, 7, 1) })).toBe(
      'ML-finance-HUB-all-20260801.xlsx',
    );
  });
});

describe('buildFinanceExportSheets / Workbook', () => {
  it('汇总 + 明细两表，金额为数字', () => {
    const sheets = buildFinanceExportSheets(exportParams);
    expect(sheets).toHaveLength(2);
    expect(sheets[0].name).toBe('汇总');
    expect(sheets[1].name).toBe('明细');
    expect(sheets[0].rows.some((row) => row[0] === '结余' && row[1] === 1425)).toBe(true);
    expect(sheets[0].rows.some((row) => row[0] === '已收人民币' && row[1] === 0.3)).toBe(true);
    const collectedRow = sheets[1].rows.find((row) => row[4] === 'PKG-YGN-1');
    expect(collectedRow?.[6]).toBe(1500);
    expect(collectedRow?.[12]).toBe(0.3);
    expect(sheets[1].rowFills?.[0]).toBe('FFECFDF5');
    expect(sheets[1].rowFills?.[1]).toBe('FFFEF2F2');
  });

  it('生成真正的 xlsx zip，含标题与数字', () => {
    const bytes = buildInventoryExcelXlsx(buildFinanceExportSheets(exportParams));
    expect(String.fromCharCode(bytes[0], bytes[1])).toBe('PK');
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain('MARKET LINK · 跨境会计');
    expect(text).toContain('name="汇总"');
    expect(text).toContain('name="明细"');
    expect(text).toContain('<v>1500</v>');
    expect(buildFinanceExportExcelBase64(exportParams).length).toBeGreaterThan(200);
  });
});

describe('buildFinanceExportCsv (兼容)', () => {
  const csv = buildFinanceExportCsv(exportParams);

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
    expect(csv).toContain('已收人民币,0.3');
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
      '时间,分类,标题,说明,条码,商品,金额,金额展示,目的地,发站,车费,已付,人民币,汇率,实收币种,汇率状态',
    );
  });

  it('已收行带锁定人民币与汇率，车费行人民币留空', () => {
    expect(csv).toContain('0.3');
    expect(csv).toContain('5000');
    expect(csv).toContain('CNY');
    expect(csv).toContain('锁定');
    const transportLine = csv.split('\n').find((line) => line.includes('TRIP-1'));
    expect(transportLine).toBeTruthy();
    expect(transportLine).not.toContain('锁定');
    expect(transportLine).not.toContain('活汇率');
  });
});
