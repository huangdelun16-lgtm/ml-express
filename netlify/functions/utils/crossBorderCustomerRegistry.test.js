const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildCrossBorderCustomerRegistry,
  resolveRegisteredCustomer,
  looksLikeCustomerCode,
} = require('./crossBorderCustomerRegistry');
const { aggregateCustomerSummaries } = require('./inventoryCustomerAggregate');

test('recognizes customer code pattern', () => {
  assert.equal(looksLikeCustomerCode('MDY260802001'), true);
  assert.equal(looksLikeCustomerCode('AMT'), false);
});

test('resolves by movement customer_code', () => {
  const registry = buildCrossBorderCustomerRegistry([
    {
      customer_code: 'MDY260802001',
      customer_name: 'AMT',
      phone: '09788848928',
      delivery_area_code: 'MDY',
    },
  ]);
  const match = resolveRegisteredCustomer(
    { customerCode: 'MDY260802001', customerName: 'AMT', customerPhone: '—' },
    registry,
  );
  assert.equal(match?.customer_code, 'MDY260802001');
  assert.equal(match?.phone, '09788848928');
});

test('merges duplicate code rows with registered phone', () => {
  const registry = buildCrossBorderCustomerRegistry([
    {
      customer_code: 'MDY260802001',
      customer_name: 'AMT',
      phone: '09788848928',
      delivery_area_code: 'MDY',
    },
  ]);
  const rows = [
    {
      customerName: 'MDY260802001',
      customerPhone: '09788848928',
      customerCode: '',
      qty: 4,
      weightKg: 0.5,
      fee: 11500,
    },
    {
      customerName: 'MDY260802001',
      customerPhone: '—',
      customerCode: '',
      qty: 1,
      weightKg: 3,
      fee: 0,
    },
  ];
  const summaries = aggregateCustomerSummaries(rows, registry);
  assert.equal(summaries.length, 1);
  assert.equal(summaries[0].customerCode, 'MDY260802001');
  assert.equal(summaries[0].customerName, 'AMT');
  assert.equal(summaries[0].customerPhone, '09788848928');
  assert.equal(summaries[0].totalPieces, 5);
  assert.equal(summaries[0].totalFee, 11500);
});
