import { describe, expect, it } from 'vitest';
import {
  normalizeSignedInvoiceRow,
  signedInvoiceAmountLabel,
  signedInvoiceMatches,
  signedInvoiceStation,
  splitSignedInvoiceTotals,
} from './signedInvoiceArchiveList';

describe('signed invoice archive list', () => {
  const row = normalizeSignedInvoiceRow({
    id: 'inv-1',
    invoice_no: '20261009-01',
    issued_on: '2026-10-09',
    customer_name: 'Ei Ei Khaing',
    phone: '09782769400',
    trip_label: 'RUI0026',
    piece_count: 5,
    store_code: 'MDY',
    total_fee_cny: '2400',
    total_fee_mmk: 1615200,
    signed_at: '2026-10-09T08:00:00Z',
    document: {
      invoiceNo: '20261009-01',
      meta: [
        { label: '客户姓名', value: 'Ei Ei Khaing' },
        { label: '包装号', value: 'RUI26MDY50002' },
        { label: '收货站', value: 'MDY MARKET LINK' },
      ],
      lines: [{ title: '订单号', expressNos: ['DPK301929849175'], measure: '包裹总重 60 Kg · 定价 ¥40/Kg' }],
      totals: ['总重量 60 Kg', '入库报价 ¥2,400', '1KG=40RMB', '汇率 1 CNY = 673 MMK', '总费用 1,615,200 MMK'],
      payNote: '请凭此单据付款',
    },
  });

  it('keeps the frozen invoice fields used by the archive', () => {
    expect(row?.invoiceNo).toBe('20261009-01');
    expect(row?.document.lines[0]?.expressNos).toEqual(['DPK301929849175']);
    expect(signedInvoiceAmountLabel(row!)).toBe('¥2,400');
    expect(signedInvoiceMatches(row!, 'khaing')).toBe(true);
    expect(signedInvoiceMatches(row!, 'dpk301929849175')).toBe(true);
    expect(signedInvoiceMatches(row!, 'rui26mdy50002')).toBe(true);
    expect(signedInvoiceMatches(row!, 'missing')).toBe(false);
    expect(row?.pieceCount).toBe(5);
    expect(signedInvoiceStation(row!)).toBe('MDY MARKET LINK');
  });

  it('shows the same total rows as the admin invoice, without the unit-price line', () => {
    expect(splitSignedInvoiceTotals(row!.document.totals)).toEqual([
      { kind: 'weight', label: '总重量', value: '60 Kg' },
      { kind: 'quote', label: '入库报价', value: '¥2,400' },
      { kind: 'rate', label: '汇率', value: '1 CNY = 673 MMK' },
      { kind: 'fee', label: '总费用', value: '1,615,200 MMK' },
    ]);
  });

  it('falls back to MMK when there is no yuan quote', () => {
    expect(signedInvoiceAmountLabel({ totalFeeCny: null, totalFeeMmk: 9000 })).toBe('9,000 MMK');
    expect(normalizeSignedInvoiceRow({ id: '', invoice_no: '20261009-01' })).toBeNull();
  });
});
