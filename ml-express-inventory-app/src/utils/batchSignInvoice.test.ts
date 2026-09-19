import { describe, expect, it } from 'vitest';
import {
  buildBatchSignInvoice,
  formatInvoiceExpressNos,
  formatInvoiceWeight,
} from './batchSignInvoice';

describe('buildBatchSignInvoice', () => {
  it('lists single inbound by express no, own weight and fee', () => {
    const model = buildBatchSignInvoice([
      {
        id: 's1',
        barcode: 'MDY001',
        input_barcode: 'EXP-100',
        weight: '8 Kg',
        total_fee: '20000',
      },
    ]);
    expect(model.lines).toEqual([
      { kind: 'single', expressNos: ['EXP-100'], weightKg: 8, feeMmk: 20000 },
    ]);
    expect(model.totalWeightKg).toBe(8);
    expect(model.totalFeeMmk).toBe(20000);
  });

  it('collapses packaging inbound to one line with joined express nos and pack totals', () => {
    const model = buildBatchSignInvoice([
      {
        id: 'p1',
        barcode: 'MDY9(3-1)',
        input_barcode: 'A-11',
        weight: '',
        total_fee: '125000',
        pack: { weight: '36 Kg', items: [{ input_barcode: 'A-11' }, { input_barcode: 'B-22' }] },
      },
      {
        id: 'p2',
        barcode: 'MDY9(3-2)',
        input_barcode: 'B-22',
        weight: '',
        total_fee: '125000',
        pack: { weight: '36 Kg' },
      },
      {
        id: 'p3',
        barcode: 'MDY9(3-3)',
        input_barcode: 'C-33',
        weight: '',
        total_fee: '0',
        pack: { weight: '36 Kg' },
      },
    ]);
    expect(model.lines).toHaveLength(1);
    expect(model.lines[0]).toEqual({
      kind: 'packaging',
      expressNos: ['A-11', 'B-22', 'C-33'],
      weightKg: 36,
      feeMmk: 125000,
    });
    expect(model.totalFeeMmk).toBe(125000);
    expect(model.totalWeightKg).toBe(36);
  });

  it('mixes singles and packaging without double-counting pack fee or weight', () => {
    const model = buildBatchSignInvoice([
      {
        id: 's1',
        barcode: 'SOLO',
        input_barcode: 'EXP-1',
        weight: '4',
        total_fee: '10000',
      },
      {
        id: 'p1',
        barcode: 'MDY8(2-1)',
        input_barcode: 'P-1',
        weight: '10',
        total_fee: '50000',
        pack: { weight: '18 Kg' },
      },
      {
        id: 'p2',
        barcode: 'MDY8(2-2)',
        input_barcode: 'P-2',
        weight: '10',
        total_fee: '50000',
        pack: { weight: '18 Kg' },
      },
    ]);
    expect(model.lines.map((line) => line.kind)).toEqual(['single', 'packaging']);
    expect(model.totalWeightKg).toBe(22);
    expect(model.totalFeeMmk).toBe(60000);
    expect(formatInvoiceExpressNos(model.lines[1].expressNos)).toBe('P-1 · P-2');
    expect(formatInvoiceWeight(model.totalWeightKg)).toBe('22 Kg');
  });

  it('does not take a later mixed pack weight or extra express nos', () => {
    const mixedPack = {
      weight: '99 Kg',
      items: [
        { item_id: 'p1', input_barcode: 'P-1' },
        { item_id: 'other', input_barcode: 'OTHER' },
      ],
    };
    const model = buildBatchSignInvoice([
      {
        id: 'p1',
        barcode: 'MDY7(2-1)',
        input_barcode: 'P-1',
        weight: '12 Kg',
        total_fee: '30000',
        pack: mixedPack,
      },
      {
        id: 'p2',
        barcode: 'MDY7(2-2)',
        input_barcode: 'P-2',
        weight: '',
        total_fee: '30000',
        pack: mixedPack,
      },
    ]);
    expect(model.lines[0]).toEqual({
      kind: 'packaging',
      expressNos: ['P-1', 'P-2'],
      weightKg: 12,
      feeMmk: 30000,
    });
  });
});
