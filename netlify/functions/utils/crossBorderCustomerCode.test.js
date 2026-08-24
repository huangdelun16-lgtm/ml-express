const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildCustomerCode, formatApplicationDateCompact } = require('./crossBorderCustomerCode');

test('formats application date as YYMMDD', () => {
  assert.equal(formatApplicationDateCompact('2026-08-24'), '260824');
});

test('builds customer code with daily sequence', () => {
  assert.equal(buildCustomerCode('MDY', '2026-08-24', '001', 1), 'MDY2608241001');
  assert.equal(buildCustomerCode('MDY', '2026-08-24', 'MDY-001', 1), 'MDY2608241001');
  assert.equal(buildCustomerCode('MDY', '2026-08-24', '001', 10), 'MDY26082410001');
});
