const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveFinancePeriod } = require('./yangonFinancePeriod');
const { sumPeriodFreight, sumInvoiceExtraFees, combinePeriodIncome } = require('./periodSignedIncome');

const october = resolveFinancePeriod('month', '2026-10-15');

test('period freight keeps only signed orders in the month and station', () => {
  const rows = [
    {
      customerSigned: true,
      inboundBarcode: 'MDY1',
      fee: 1000,
      signedAt: '2026-10-10T04:00:00.000Z',
      ownerStoreCode: 'MDY001',
    },
    {
      customerSigned: true,
      inboundBarcode: 'MDY2',
      fee: 500,
      signedAt: '2026-09-10T04:00:00.000Z',
      ownerStoreCode: 'MDY001',
    },
    {
      customerSigned: false,
      inboundBarcode: 'MDY3',
      fee: 900,
      signedAt: '',
      ownerStoreCode: 'MDY001',
    },
    {
      customerSigned: true,
      inboundBarcode: 'YGN1',
      fee: 700,
      signedAt: '2026-10-12T04:00:00.000Z',
      ownerStoreCode: 'YGN001',
    },
  ];
  assert.equal(sumPeriodFreight(rows, october, 'MDY001').mmk, 1000);
  assert.equal(sumPeriodFreight(rows, october, '').mmk, 1700);
});

test('invoice extra fee is added once and is not the freight total', () => {
  const extra = sumInvoiceExtraFees(
    [
      {
        issued_on: '2026-10-08',
        store_code: 'MDY',
        document: { extraFeeCny: 20, extraFeeMmk: 13400, totalFeeCny: 340 },
      },
      {
        issued_on: '2026-09-01',
        store_code: 'MDY',
        document: { extraFeeCny: 8, extraFeeMmk: 5000 },
      },
    ],
    october,
    '',
  );
  assert.deepEqual(extra, { mmk: 13400, cny: 20 });
  const combined = combinePeriodIncome({ mmk: 1000, cny: 320 }, extra);
  assert.equal(combined.mmk, 14400);
  assert.equal(combined.cny, 340);
  assert.equal(combined.freightCny, 320);
  assert.equal(combined.extraCny, 20);
});
