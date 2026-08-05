const { test } = require('node:test');
const assert = require('node:assert/strict');
const { applyPackFeeDedup } = require('./inventoryCustomerAggregate');

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
