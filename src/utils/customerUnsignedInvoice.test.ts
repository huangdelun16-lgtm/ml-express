import {
  buildUnsignedCustomerInvoice,
  formatInvoiceDocumentNo,
  formatUnsignedInvoiceFee,
  formatUnsignedInvoiceQuote,
  formatUnsignedInvoiceUnitPrice,
  formatUnsignedInvoiceRate,
  formatUnsignedInvoiceWeight,
  isUnsignedExpressItem,
  packagingBatchSelectionIds,
  settleUnsignedInvoice,
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
  it('selects every unsigned piece in the same inbound batch', () => {
    const items = [
      row({ id: 'a', inboundBarcode: 'POL142622220926(4-1)' }),
      row({ id: 'b', inboundBarcode: 'POL142622220926(4-2)' }),
      row({ id: 'c', inboundBarcode: 'POL142622220926(4-3)', customerSigned: true, transportStatus: '已签收' }),
      row({ id: 'd', inboundBarcode: 'POL142622220926(4-4)' }),
      row({ id: 'solo', inboundBarcode: 'SOLO-1' }),
    ];
    expect(packagingBatchSelectionIds(items, 'a').sort()).toEqual(['a', 'b', 'd']);
    expect(packagingBatchSelectionIds(items, 'c')).toEqual([]);
    expect(packagingBatchSelectionIds(items, 'solo')).toEqual(['solo']);
  });

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
    expect(invoice.groups).toEqual([
      { kind: 'packaging', expressNos: ['E2', 'E3'], weightKg: 10, quoteCny: 0 },
    ]);
    expect(invoice.totalFeeMmk).toBe(125000);
    expect(invoice.totalWeightKg).toBe(10);
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
    expect(invoice.tripNo).toBe('');
    expect(invoice.tripIncomplete).toBe(true);
  });

  it('keeps unique trip numbers and builds a stable invoice number', () => {
    const items = [
      row({ id: 'a', inboundBarcode: 'SOLO-1', expressBarcode: 'E1', tripNumber: 'rui0026', destination: 'MDY' }),
      row({ id: 'b', inboundBarcode: 'SOLO-2', expressBarcode: 'E2', tripNumber: 'RUI0026', destination: 'MDY' }),
      row({ id: 'c', inboundBarcode: 'SOLO-3', expressBarcode: 'E3', tripNumber: 'MSE0001', destination: 'MDY' }),
    ];
    const invoice = buildUnsignedCustomerInvoice(items, ['a', 'b', 'c']);
    expect(invoice.tripNo).toBe('RUI0026 · MSE0001');
    expect(invoice.tripIncomplete).toBe(false);
    expect(formatInvoiceDocumentNo({
      issuedOn: '2026-10-08',
      trips: invoice.tripNo.split(' · '),
      destination: invoice.destination,
      pieceCount: invoice.pieceCount,
    })).toBe('20261008-RUI0026-MSE0001');
    expect(formatInvoiceDocumentNo({
      issuedOn: '2026-10-08',
      trips: [],
      destination: 'MDY',
      pieceCount: 18,
    })).toBe('20261008-MDY-18');
  });

  it('shows each single order weight and one package weight for a multiple inbound', () => {
    const items = [
      row({ id: 's1', inboundBarcode: 'SOLO-1', expressBarcode: 'S1', weightKg: 2.5, quoteCny: 20 }),
      row({ id: 's2', inboundBarcode: 'SOLO-2', expressBarcode: 'S2', weightKg: 1, quoteCny: 8 }),
      row({
        id: 'a',
        inboundBarcode: 'MDY1(2-1)',
        expressBarcode: 'E1',
        weightKg: 1,
        packWeightKg: 13,
        quoteCny: 100,
      }),
      row({
        id: 'b',
        inboundBarcode: 'MDY1(2-2)',
        expressBarcode: 'E2',
        weightKg: 1,
        packWeightKg: 13,
        inboundNote: '报价 100 CNY · 到付',
      }),
    ];
    const invoice = buildUnsignedCustomerInvoice(items, ['s1', 's2', 'a', 'b']);
    expect(invoice.groups.map((group) => ({ kind: group.kind, weightKg: group.weightKg, quoteCny: group.quoteCny }))).toEqual([
      { kind: 'single', weightKg: 2.5, quoteCny: 20 },
      { kind: 'single', weightKg: 1, quoteCny: 8 },
      { kind: 'packaging', weightKg: 13, quoteCny: 100 },
    ]);
    expect(invoice.totalWeightKg).toBe(16.5);
    expect(invoice.totalQuoteCny).toBe(128);
    expect(formatUnsignedInvoiceQuote(invoice.totalQuoteCny)).toBe('¥128');
    expect(formatUnsignedInvoiceUnitPrice(200, 5)).toBe('¥40/Kg');
    expect(formatUnsignedInvoiceUnitPrice(2418.318, 60)).toBe('¥40.3053/Kg');
    expect(formatUnsignedInvoiceRate(450)).toBe('1 CNY = 450 MMK');
    expect(settleUnsignedInvoice(invoice.totalQuoteCny, 450, 99999)).toEqual({
      feeMmk: 57600,
      missingRate: false,
    });
    expect(settleUnsignedInvoice(invoice.totalQuoteCny, null, 99999)).toEqual({
      feeMmk: 0,
      missingRate: true,
    });
  });

  it('uses the package barcode row as the multiple-inbound total weight', () => {
    const items = [
      row({
        id: 'shell',
        inboundBarcode: 'RUI26MDY50001',
        expressBarcode: '—',
        weightKg: 13,
      }),
      row({
        id: 'a',
        inboundBarcode: 'MDY1(2-1)',
        expressBarcode: 'E1',
        weightKg: 0,
        packedBundleBarcode: 'RUI26MDY50001',
        inboundNote: '报价 100 CNY · 到付',
      }),
      row({
        id: 'b',
        inboundBarcode: 'MDY1(2-2)',
        expressBarcode: 'E2',
        weightKg: 0,
        packedBundleBarcode: 'RUI26MDY50001',
        inboundNote: '报价 100 CNY · 到付',
      }),
    ];
    const invoice = buildUnsignedCustomerInvoice(items, ['shell', 'a', 'b']);
    expect(invoice.groups).toEqual([
      { kind: 'packaging', expressNos: ['E1', 'E2'], weightKg: 13, quoteCny: 100 },
    ]);
    expect(invoice.pieceCount).toBe(2);
  });

  it('keeps the per-kg price on a package whose pieces have no weight', () => {
    const items = [1, 2, 3, 4].map((index) =>
      row({
        id: `p${index}`,
        inboundBarcode: `MDY564620260926(4-${index})`,
        expressBarcode: `YT${index}`,
        weightKg: 0,
        packWeightKg: 6.5,
        packedBundleBarcode: 'RUI26MDY40001',
        fee: index === 1 ? 162500 : 0,
        unitCnyPerKg: 40,
      }),
    );
    const invoice = buildUnsignedCustomerInvoice(
      items,
      items.map((item) => item.id),
    );
    expect(invoice.groups).toEqual([
      {
        kind: 'packaging',
        expressNos: ['YT1', 'YT2', 'YT3', 'YT4'],
        weightKg: 6.5,
        quoteCny: 260,
        unitCnyPerKg: 40,
      },
    ]);
    expect(formatUnsignedInvoiceUnitPrice(40, 1)).toBe('¥40/Kg');
    expect(invoice.totalQuoteCny).toBe(260);
    expect(settleUnsignedInvoice(invoice.totalQuoteCny, 669, 162500)).toEqual({
      feeMmk: Math.round(260 * 669),
      missingRate: false,
    });
  });

  it('bills every kilogram at its per-kg price, including package weight', () => {
    const loose = row({
      id: 'solo',
      inboundBarcode: 'SOLO',
      expressBarcode: 'S1',
      weightKg: 236.5,
      unitCnyPerKg: 40,
      fee: 1,
    });
    const packed = [1, 2].map((index) =>
      row({
        id: `p${index}`,
        inboundBarcode: `PACK(2-${index})`,
        expressBarcode: `P${index}`,
        weightKg: 0,
        packWeightKg: 75,
        packedBundleBarcode: 'RUI26MDY90001',
        fee: index === 1 ? 1 : 0,
        unitCnyPerKg: 40,
      }),
    );
    const invoice = buildUnsignedCustomerInvoice([loose, ...packed], ['solo', 'p1', 'p2']);
    expect(invoice.totalWeightKg).toBe(311.5);
    expect(invoice.totalQuoteCny).toBe(12460);
    expect(settleUnsignedInvoice(invoice.totalQuoteCny, 669, 0).feeMmk).toBe(8_335_740);
  });

  it('reads a quote from the inbound note and does not bill a signed package again', () => {
    const items = [
      row({
        id: 'a',
        inboundBarcode: 'MDY1(2-1)',
        expressBarcode: 'E1',
        inboundNote: '报价 100 CNY · 到付',
        customerSigned: true,
        transportStatus: '已签收',
      }),
      row({
        id: 'b',
        inboundBarcode: 'MDY1(2-2)',
        expressBarcode: 'E2',
        inboundNote: '报价 100 CNY · 到付',
      }),
    ];
    const invoice = buildUnsignedCustomerInvoice(items, ['b']);
    expect(invoice.totalQuoteCny).toBe(0);
    expect(settleUnsignedInvoice(0, 450, invoice.totalFeeMmk)).toEqual({
      feeMmk: 0,
      missingRate: false,
    });
  });
});
