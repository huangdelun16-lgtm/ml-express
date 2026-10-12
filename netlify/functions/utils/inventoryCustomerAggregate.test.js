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

test('multiple inbound quote is kept once and fee-only orders stay separate', () => {
  const pieces = [1, 2].map((index) =>
    row({
      inboundBarcode: `MDY1(2-${index})`,
      packedBundleBarcode: 'RUI26MDY50002',
      quoteCny: index === 1 ? 2400 : 0,
      fee: index === 1 ? 1615200 : 0,
      weightKg: 0,
    }),
  );
  const solo = row({
    inboundBarcode: 'MDY9',
    packedBundleBarcode: '',
    quoteCny: 0,
    fee: 134400,
    weightKg: 5,
  });
  const [summary] = aggregateCustomerSummaries(pieces.concat(solo), null);
  assert.equal(summary.totalQuoteCny, 2400);
  assert.equal(summary.feeWithoutQuote, 134400);
  assert.equal(summary.totalFee, 1749600);
  assert.equal(summary.totalCny, 2400);
  assert.equal(summary.totalMmk, 1749600);
});

test('list fee is the quote and weight price of the same pieces, pack shell is not priced again', () => {
  const pricing = {
    liveRate: 672,
    cnyPerKg: { 'MDY2609101001|RUI|MDY': 40 },
  };
  const packLines = [1, 2].map((index) =>
    row({
      inboundBarcode: `MDY420(2-${index})`,
      packedBundleBarcode: 'RUI26MDY20001',
      quoteCny: index === 1 ? 2760 : 0,
      fee: 0,
      weightKg: 0,
      origin: 'RUILI001',
      destination: 'MDY',
      customerCode: 'MDY2609101001',
    }),
  );
  const weighted = row({
    inboundBarcode: 'MDY2746',
    packedBundleBarcode: '',
    quoteCny: 0,
    fee: 1584000,
    weightKg: 60,
    origin: 'RUILI001',
    destination: 'MDY',
    customerCode: 'MDY2609101001',
  });
  const signed = row({
    inboundBarcode: 'MDY1526(5-1)',
    packedBundleBarcode: '',
    quoteCny: 0,
    fee: 1980000,
    weightKg: 0,
    customerSigned: true,
    fxMmkPerCny: 669,
    origin: 'RUILI001',
    destination: 'MDY',
    customerCode: 'MDY2609101001',
  });
  const shell = row({
    inboundBarcode: 'RUI26MDY50002',
    packedBundleBarcode: '',
    quoteCny: 2400,
    fee: 0,
    weightKg: 60,
    origin: 'RUILI001',
    destination: 'MDY',
    customerCode: 'MDY2609101001',
  });
  const [summary] = aggregateCustomerSummaries(
    packLines.concat(weighted, signed, shell),
    null,
    pricing,
  );
  assert.equal(summary.totalWeightKg, 120);
  assert.equal(Math.round(summary.totalCny * 100) / 100, Math.round((2760 + 2400 + 1980000 / 669) * 100) / 100);
  assert.equal(summary.totalMmk, Math.round(2760 * 672) + Math.round(2400 * 672) + 1980000);
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

test('signed income is legacy MMK, explicit CNY, and one packaging fee', () => {
  const [summary] = aggregateCustomerSummaries(
    [
      row({ inboundBarcode: 'OLD1', fee: 1000, customerSigned: true, quoteCny: 80 }),
      row({
        inboundBarcode: 'CNY1',
        fee: 67000,
        quoteCny: 12.5,
        paidCurrency: 'CNY',
        paidCny: 12.5,
        customerSigned: true,
      }),
      row({
        inboundBarcode: 'OPEN',
        fee: 99999,
        paidCurrency: 'CNY',
        paidCny: 50,
        customerSigned: false,
      }),
      row({ inboundBarcode: 'PK(2-1)', fee: 4000, customerSigned: true, paidCurrency: 'MMK' }),
      row({ inboundBarcode: 'PK(2-2)', fee: 4000, customerSigned: true, paidCurrency: 'MMK' }),
      row({ inboundBarcode: 'RUI26MDY40009', fee: 4000, customerSigned: true }),
    ],
    null,
  );
  assert.equal(summary.signedMmkIncome, 5000);
  assert.equal(summary.signedCnyIncome, 12.5);
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
