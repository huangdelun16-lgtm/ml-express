import {
  buildUnsignedCustomerInvoice,
  formatUnsignedInvoiceFee,
  formatUnsignedInvoiceWeight,
  isUnsignedExpressItem,
  type UnsignedInvoiceSource,
} from './customerUnsignedInvoice';

function row(partial: Partial<UnsignedInvoiceSource> & Pick<UnsignedInvoiceSource, 'id' | 'inboundBarcode'>): UnsignedInvoiceSource {
  return {
    expressBarcode: partial.id,
    destination: 'POL',
    origin: 'RUILI001',
    weightKg: 2,
    qty: 1,
    fee: 0,
    paymentLabel: '到付',
    paymentStatus: '到付待收',
    customerSigned: false,
    transportStatus: '已入库',
    ...partial,
  };
}

describe('customerUnsignedInvoice', () => {
  it('treats signed rows as not selectable', () => {
    expect(isUnsignedExpressItem({ transportStatus: '已入库' })).toBe(true);
    expect(isUnsignedExpressItem({ transportStatus: '已签收' })).toBe(false);
    expect(isUnsignedExpressItem({ customerSigned: true, transportStatus: '已入库' })).toBe(false);
  });

  it('counts a packaging batch fee once and keeps express numbers together', () => {
    const items = [
      row({
        id: 'a',
        inboundBarcode: 'MDY1(3-1)',
        expressBarcode: 'E1',
        fee: 125000,
        weightKg: 10,
        packedBundleBarcode: 'RUI26POL40001',
      }),
      row({ id: 'b', inboundBarcode: 'MDY1(3-2)', expressBarcode: 'E2', weightKg: 0 }),
      row({ id: 'c', inboundBarcode: 'MDY1(3-3)', expressBarcode: 'E3', weightKg: 0 }),
    ];
    const invoice = buildUnsignedCustomerInvoice(items, ['b', 'c']);
    expect(invoice.groups).toEqual([{ kind: 'packaging', expressNos: ['E2', 'E3'] }]);
    expect(invoice.totalFeeMmk).toBe(125000);
    expect(invoice.totalWeightKg).toBe(0);
    expect(invoice.pieceCount).toBe(2);
    expect(invoice.packNo).toBe('RUI26POL40001');
    expect(invoice.destination).toBe('POL');
    expect(invoice.payment).toBe('到付');
  });

  it('uses the one recorded batch weight when a selected piece carries it', () => {
    const items = [
      row({ id: 'a', inboundBarcode: 'MDY1(2-1)', expressBarcode: 'E1', fee: 80000, weightKg: 10 }),
      row({ id: 'b', inboundBarcode: 'MDY1(2-2)', expressBarcode: 'E2', weightKg: 0 }),
    ];
    const invoice = buildUnsignedCustomerInvoice(items, ['a', 'b']);
    expect(invoice.totalWeightKg).toBe(10);
    expect(invoice.totalFeeMmk).toBe(80000);
    expect(formatUnsignedInvoiceWeight(invoice.totalWeightKg)).toBe('10 Kg');
    expect(formatUnsignedInvoiceFee(invoice.totalFeeMmk, '免费优惠')).toBe('80,000 MMK');
  });

  it('does not bill a packaging fee that already sits on a signed piece', () => {
    const items = [
      row({
        id: 'a',
        inboundBarcode: 'MDY1(2-1)',
        fee: 80000,
        customerSigned: true,
        transportStatus: '已签收',
        paymentStatus: '已收款',
      }),
      row({ id: 'b', inboundBarcode: 'MDY1(2-2)', expressBarcode: 'E2', fee: 0 }),
    ];
    const invoice = buildUnsignedCustomerInvoice(items, ['a', 'b']);
    expect(invoice.groups[0]?.expressNos).toEqual(['E2']);
    expect(invoice.totalFeeMmk).toBe(0);
    expect(formatUnsignedInvoiceFee(0, '免费优惠')).toBe('0 MMK · 免费优惠');
  });

  it('adds a standalone order beside an unsigned packaging batch', () => {
    const items = [
      row({ id: 'a', inboundBarcode: 'MDY1(2-1)', expressBarcode: 'E1', fee: 50000, destination: 'POL' }),
      row({ id: 'b', inboundBarcode: 'MDY1(2-2)', expressBarcode: 'E2', destination: 'POL' }),
      row({
        id: 'c',
        inboundBarcode: 'SOLO',
        expressBarcode: 'E3',
        fee: 10000,
        destination: 'MDY',
        packedBundleBarcode: 'PACK9',
      }),
    ];
    const invoice = buildUnsignedCustomerInvoice(items, ['a', 'b', 'c']);
    expect(invoice.groups.map((group) => group.kind)).toEqual(['packaging', 'single']);
    expect(invoice.totalFeeMmk).toBe(60000);
    expect(invoice.destination).toBe('POL · MDY');
    expect(invoice.stationCodes).toEqual(['POL', 'MDY']);
    expect(invoice.packNo).toBe('PACK9');
    expect(invoice.pieceCount).toBe(3);
  });
});
