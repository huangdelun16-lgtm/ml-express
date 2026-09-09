import { groupCustomerExpressItems, parsePackagingStockInLineBarcode } from './packagingStockInDisplay';

describe('packagingStockInDisplay', () => {
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
});
