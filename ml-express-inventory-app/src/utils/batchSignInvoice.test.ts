import { describe, expect, it, vi } from 'vitest';

vi.mock('../services/supabase', () => ({
  isSupabaseConfigured: () => false,
  getSupabaseUrl: () => '',
  getSupabaseAnonKey: () => '',
  supabase: {},
}));

import {
  buildBatchSignInvoice,
  formatInvoiceDocumentNo,
  formatInvoiceExpressNos,
  formatInvoiceUnitPrice,
  formatInvoiceUnitRateLines,
  formatInvoiceWeight,
  resolveInvoiceLineUnitCny,
  resolveInvoiceUnitRateLabels,
} from './batchSignInvoice';

describe('formatInvoiceDocumentNo', () => {
  it('uses the date and trip, and falls back to destination plus pieces', () => {
    expect(formatInvoiceDocumentNo({
      issuedOn: '2026-10-08',
      trips: ['rui0026'],
      destination: 'MDY',
      pieceCount: 18,
    })).toBe('20261008-RUI0026');
    expect(formatInvoiceDocumentNo({
      issuedOn: '2026-10-08',
      trips: [],
      destination: 'MDY',
      pieceCount: 18,
    })).toBe('20261008-MDY-18');
  });
});

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
      { kind: 'single', expressNos: ['EXP-100'], weightKg: 8, feeMmk: 20000, route: null },
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
      route: null,
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

  it('uses the tracked pack weight when the bundle row is missing', () => {
    const model = buildBatchSignInvoice([
      {
        id: 'p1',
        barcode: 'POL1(4-1)',
        input_barcode: '116622',
        weight: '',
        total_fee: '264000',
        tracked_pack_weight: '10 Kg',
      },
      {
        id: 'p2',
        barcode: 'POL1(4-2)',
        input_barcode: '432423',
        weight: '',
        total_fee: '264000',
        tracked_pack_weight: '10 Kg',
      },
    ]);
    expect(model.lines[0].weightKg).toBe(10);
    expect(model.totalWeightKg).toBe(10);
    expect(model.totalFeeMmk).toBe(264000);
    expect(formatInvoiceWeight(model.totalWeightKg)).toBe('10 Kg');
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
      route: null,
    });
  });

  it('settles locked inbound CNY with the HQ rate and does not invent MMK without a rate', () => {
    const row = {
      id: 's1',
      barcode: 'MDY001',
      input_barcode: 'EXP-100',
      weight: '8 Kg',
      quote_cny: '100',
      total_fee: '99999',
    };
    const settled = buildBatchSignInvoice([row], 450);
    expect(settled.totalFeeCny).toBe(100);
    expect(settled.rate).toBe(450);
    expect(settled.totalFeeMmk).toBe(45000);
    expect(settled.missingRate).toBe(false);

    const blocked = buildBatchSignInvoice([row], null);
    expect(blocked.missingRate).toBe(true);
    expect(blocked.totalFeeMmk).toBe(0);
  });

  it('keeps one customer-pricing route for a single and one for a whole package', () => {
    const model = buildBatchSignInvoice([
      {
        id: 's1',
        barcode: 'SOLO',
        input_barcode: '11',
        weight: '2 Kg',
        owner_store_code: 'MUSE001',
        final_destination: 'MDY',
        customer_code: 'MDY009',
        quote_cny: '80',
      },
      {
        id: 'p1',
        barcode: 'MDY9(2-1)',
        input_barcode: '33',
        weight: '',
        owner_store_code: 'RUI001',
        final_destination: 'MDY',
        customer_code: 'MDY009',
        quote_cny: '120',
        pack: { weight: '3 Kg' },
      },
      {
        id: 'p2',
        barcode: 'MDY9(2-2)',
        input_barcode: '22',
        weight: '',
        quote_cny: '120',
        pack: { weight: '3 Kg' },
      },
    ]);
    expect(model.lines.map((line) => ({ kind: line.kind, weightKg: line.weightKg, route: line.route }))).toEqual([
      {
        kind: 'single',
        weightKg: 2,
        route: { originCode: 'MSE', destinationCode: 'MDY', customerCode: 'MDY009' },
      },
      {
        kind: 'packaging',
        weightKg: 3,
        route: { originCode: 'RUI', destinationCode: 'MDY', customerCode: 'MDY009' },
      },
    ]);
    expect(model.totalWeightKg).toBe(5);
  });
});

describe('formatInvoiceUnitRateLines', () => {
  it('writes each different route price once, as 1KG=40RMB', () => {
    expect(formatInvoiceUnitRateLines([40, 35, 40])).toEqual(['1KG=40RMB', '1KG=35RMB']);
    expect(formatInvoiceUnitRateLines([4.7])).toEqual(['1KG=4.7RMB']);
    expect(formatInvoiceUnitPrice(40)).toBe('¥40/Kg');
    expect(formatInvoiceUnitPrice(40.3053)).toBe('¥40.3053/Kg');
  });

  it('uses the customer route matrix and skips a legacy fallback', async () => {
    const labels = await resolveInvoiceUnitRateLabels(
      [
        {
          kind: 'single',
          expressNos: ['11'],
          weightKg: 2,
          feeMmk: 0,
          route: { originCode: 'RUI', destinationCode: 'MDY', customerCode: 'MDY009' },
        },
        {
          kind: 'packaging',
          expressNos: ['33', '22'],
          weightKg: 3,
          feeMmk: 0,
          route: { originCode: 'LSO', destinationCode: 'MDY', customerCode: 'MDY009' },
        },
      ],
      666,
      async (route) => {
        if (route.originCode === 'RUI') {
          return { perKgMmk: 40 * 666, mmkPerCny: 666, fromRouteMatrix: true };
        }
        return { perKgMmk: 999, mmkPerCny: 666, fromRouteMatrix: false };
      },
    );
    expect(labels).toEqual(['1KG=40RMB']);
  });

  it('uses the locked CNY from the customer pricing window', async () => {
    const prices = await resolveInvoiceLineUnitCny(
      [
        {
          kind: 'packaging',
          expressNos: ['YT1'],
          weightKg: 6.5,
          feeMmk: 162500,
          route: { originCode: 'RUI', destinationCode: 'MDY', customerCode: 'RUILI2609211001' },
        },
      ],
      669,
      async () => ({
        perKgMmk: 26400,
        mmkPerCny: 669,
        fromRouteMatrix: true,
        cnyPerKg: 40,
      }),
    );
    expect(prices).toEqual([40]);
  });
});
