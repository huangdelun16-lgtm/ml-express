import { describe, expect, it, vi } from 'vitest';

vi.mock('../services/supabase', () => ({
  isSupabaseConfigured: () => false,
  getSupabaseUrl: () => '',
  getSupabaseAnonKey: () => '',
  supabase: {},
}));

import { buildFrozenSignedInvoiceDocument, invoiceLineMeasure } from './frozenSignedInvoice';

const templates = {
  lineMeasure: '重量 {weight} · 定价 {price}',
  lineWeight: '重量 {weight}',
  packMeasure: '包裹总重 {weight} · 定价 {price}',
  packWeight: '包裹总重 {weight}',
};

describe('invoiceLineMeasure', () => {
  it('puts the unit price on the measure line', () => {
    expect(
      invoiceLineMeasure(
        { kind: 'single', expressNos: ['A'], weightKg: 8, cnyPerKg: 40 },
        templates,
      ),
    ).toBe('重量 8 Kg · 定价 ¥40/Kg');
    expect(
      invoiceLineMeasure(
        { kind: 'packaging', expressNos: ['A'], weightKg: 75, cnyPerKg: 40 },
        templates,
      ),
    ).toBe('包裹总重 75 Kg · 定价 ¥40/Kg');
  });
});

describe('buildFrozenSignedInvoiceDocument', () => {
  it('keeps the paper text and leaves the invoice number for sign time', () => {
    const document = buildFrozenSignedInvoiceDocument({
      customerName: 'Ei Ei Khaing',
      phone: '09782769400',
      destination: 'MDY',
      station: 'MDY',
      trip: 'RUI0026',
      notLoadedLabel: '未装车',
      packNo: 'RUI26MDY40002',
      pieceCount: 18,
      payment: '到付',
      issuedOn: '2026-10-08',
      labels: {
        customer: '客户姓名',
        phone: '电话',
        destination: '最终目的地',
        station: '收货站',
        trip: '车次',
        packNo: '包装号',
        pieces: '件数',
        payment: '付款方式',
        date: '开单日期',
        totalWeight: '总重量',
        totalFee: '总费用',
        waybill: '单号',
        orderNos: '订单号',
      },
      lines: [{ kind: 'single', expressNos: ['435359956947416'], weightKg: 8, cnyPerKg: 40 }],
      measureTemplates: templates,
      totalWeight: '8 Kg',
      totalQuote: '¥320',
      totalRate: '1 CNY = 669 MMK',
      unitRates: ['¥40/Kg'],
      totalFee: '214,080 MMK',
      totalFeeCny: 320,
      totalFeeMmk: 214080,
      payNote: '请凭此单据付款',
      contactLabel: '联系方式',
      contactPhoneLabel: '联系电话：',
      contactPhones: '09788868928',
      contactKpay: '09259369349',
      contactSite: 'www.market-link-express.com',
    });

    expect(document).not.toHaveProperty('invoiceNo');
    expect(document.customerName).toBe('Ei Ei Khaing');
    expect(document.trip).toBe('RUI0026');
    expect(document.meta.find((row) => row.label === '车次')?.value).toBe('RUI0026');
    expect(document.lines[0]?.measure).toBe('重量 8 Kg · 定价 ¥40/Kg');
    expect(document.totalFeeCny).toBe(320);
  });

  it('writes 未装车 when the selected orders have no trip', () => {
    const document = buildFrozenSignedInvoiceDocument({
      customerName: 'A',
      phone: '',
      destination: '',
      station: '',
      trip: '',
      notLoadedLabel: '未装车',
      packNo: '',
      pieceCount: 1,
      payment: '',
      issuedOn: '2026-10-08',
      labels: {
        customer: '客户姓名',
        phone: '电话',
        destination: '最终目的地',
        station: '收货站',
        trip: '车次',
        packNo: '包装号',
        pieces: '件数',
        payment: '付款方式',
        date: '开单日期',
        totalWeight: '总重量',
        totalFee: '总费用',
        waybill: '单号',
        orderNos: '订单号',
      },
      lines: [],
      measureTemplates: templates,
      totalWeight: '',
      totalQuote: '',
      totalRate: '',
      unitRates: [],
      totalFee: '0 MMK',
      totalFeeCny: null,
      totalFeeMmk: 0,
      payNote: '请凭此单据付款',
      contactLabel: '联系方式',
      contactPhoneLabel: '联系电话：',
      contactPhones: '',
      contactKpay: '',
      contactSite: '',
    });
    expect(document.trip).toBe('未装车');
    expect(document.meta.find((row) => row.label === '车次')?.value).toBe('未装车');
  });
});
