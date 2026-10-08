const { test } = require('node:test');
const assert = require('node:assert/strict');
const { applyPackFeeDedup, attachTripNumbers, aggregateCustomerSummaries } = require('./inventoryCustomerAggregate');

function row(overrides = {}) {
  return {
    inboundBarcode: 'MDY1',
    packedBundleBarcode: 'RUI26MDY30006',
    inboundNote: '',
    fee: 0,
    qty: 1,
    weightKg: 1,
    customerName: 'AMT',
    customerPhone: '09',
    customerCode: '',
    customerKey: 'amt__09',
    paymentLabel: '',
    paymentStatus: '—',
    customerSigned: false,
    ...overrides,
  };
}

test('a packed bundle shell is not an extra order, but its weight still counts', () => {
  const pieces = [1, 2, 3, 4].map((index) =>
    row({
      inboundBarcode: `MDY564620260926(4-${index})`,
      packedBundleBarcode: 'RUI26MDY40001',
      weightKg: 0,
      fee: index === 1 ? 162500 : 0,
      qty: 1,
      customerName: '裕梅',
    }),
  );
  const shell = row({
    inboundBarcode: 'RUI26MDY40001',
    packedBundleBarcode: '',
    weightKg: 6.5,
    fee: 0,
    qty: 1,
    customerName: '裕梅',
  });
  const [summary] = aggregateCustomerSummaries(pieces.concat(shell), null);
  assert.equal(summary.orderCount, 4);
  assert.equal(summary.totalPieces, 4);
  assert.equal(summary.totalWeightKg, 6.5);
  assert.equal(summary.totalFee, 162500);
});

test('trip number follows the pack, and an unpacked row stays blank', () => {
  const rows = [
    row({ inboundBarcode: 'A', packedBundleBarcode: 'RUI26MDY50001' }),
    row({ inboundBarcode: 'B', packedBundleBarcode: '' }),
  ];
  attachTripNumbers(rows, { RUI26MDY50001: 'rui0007' });
  assert.equal(rows[0].tripNumber, 'RUI0007');
  assert.equal(rows[1].tripNumber, '');
});

test('pack note fee applied once per pack', () => {
  const rows = [
    row({ inboundBarcode: 'A', fee: 0 }),
    row({ inboundBarcode: 'B', fee: 0 }),
    row({ inboundBarcode: 'C', fee: 0 }),
  ];
  applyPackFeeDedup(rows, {
    RUI26MDY30006: '多个入库 · 总费用 50000 MMK · 09',
  });
  assert.equal(rows.reduce((s, r) => s + r.fee, 0), 50000);
});

test('pack note quote is applied once', () => {
  const rows = [
    row({ inboundBarcode: 'A(2-1)', quoteCny: 0 }),
    row({ inboundBarcode: 'A(2-2)', quoteCny: 0 }),
  ];
  applyPackFeeDedup(rows, {
    RUI26MDY30006: '多个入库 · 报价 88.5 CNY · 09',
  });
  assert.equal(rows.reduce((sum, item) => sum + item.quoteCny, 0), 88.5);
});

test('packaging line quotes are kept once on the first piece', () => {
  const rows = [
    row({ inboundBarcode: 'MDY1(3-1)', quoteCny: 100 }),
    row({ inboundBarcode: 'MDY1(3-2)', quoteCny: 100 }),
    row({ inboundBarcode: 'MDY1(3-3)', quoteCny: 100 }),
  ];
  applyPackFeeDedup(rows, {});
  assert.equal(rows.reduce((sum, item) => sum + item.quoteCny, 0), 100);
  assert.equal(rows.find((item) => item.inboundBarcode === 'MDY1(3-1)').quoteCny, 100);
});

test('packaging (3-n) line fees are deduped for total income', () => {
  const rows = [
    row({ inboundBarcode: 'MDY1(3-1)', fee: 90000 }),
    row({ inboundBarcode: 'MDY1(3-2)', fee: 90000 }),
    row({ inboundBarcode: 'MDY1(3-3)', fee: 90000 }),
  ];
  applyPackFeeDedup(rows, {
    RUI26MDY30006: '多个入库 · 总费用 90000 MMK · 09',
  });
  assert.equal(rows.reduce((s, r) => s + r.fee, 0), 90000);
});
