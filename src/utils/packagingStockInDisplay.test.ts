import {
  groupCustomerExpressItems,
  hasCustomerExpressNo,
  packagingFeeRowWeight,
  parsePackagingStockInLineBarcode,
} from './packagingStockInDisplay';

describe('packagingStockInDisplay', () => {
  it('hides package shells that have no express number', () => {
    expect(hasCustomerExpressNo('DPK301929849175')).toBe(true);
    expect(hasCustomerExpressNo('')).toBe(false);
    expect(hasCustomerExpressNo('—')).toBe(false);
    expect(hasCustomerExpressNo('-')).toBe(false);
  });

  it('parses (n-i) inbound barcodes', () => {
    expect(parsePackagingStockInLineBarcode('MDY555306070926(3-2)')).toEqual({
      base: 'MDY555306070926',
      total: 3,
      index: 2,
    });
    expect(parsePackagingStockInLineBarcode('MDY555306070926')).toBeNull();
  });

  it('groups multiple inbound rows and keeps the shared fee once', () => {
    const items = [
      { id: 'a', inboundBarcode: 'MDY1(3-1)', fee: 125000 },
      { id: 'b', inboundBarcode: 'MDY1(3-2)', fee: 0 },
      { id: 'c', inboundBarcode: 'MDY1(3-3)', fee: 0 },
      { id: 'd', inboundBarcode: 'SOLO-1', fee: 10000 },
    ];
    const groups = groupCustomerExpressItems(items);
    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({
      type: 'packaging',
      base: 'MDY1',
      declaredTotal: 3,
      sharedFee: 125000,
    });
    expect(groups[0].type === 'packaging' && groups[0].items.map((row) => row.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(groups[1]).toEqual({ type: 'single', item: items[3] });
  });

  it('writes the pack total weight only on the fee row', () => {
    const rows = [
      { weight: '—', weightKg: 0, fee: 0, quoteCny: 2760, packWeightKg: 69 },
      { weight: '—', weightKg: 0, fee: 0, quoteCny: 0, packWeightKg: 69 },
      { weight: '—', weightKg: 0, fee: 1980000, quoteCny: 0, packWeightKg: 75 },
      { weight: '4 Kg', weightKg: 4, fee: 100, quoteCny: 0, packWeightKg: 69 },
    ];
    expect(packagingFeeRowWeight(rows[0], rows.slice(0, 2))).toBe('69 Kg');
    expect(packagingFeeRowWeight(rows[1], rows.slice(0, 2))).toBe('—');
    expect(packagingFeeRowWeight(rows[2], [rows[2]])).toBe('75 Kg');
    expect(packagingFeeRowWeight(rows[3], [rows[3]])).toBe('4 Kg');
  });
});
