const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isUnregisteredCustomerRow,
  selectStaleUnregisteredOrders,
} = require('./purgeUnregisteredCustomers');

const registry = {
  byCode: {
    MDY2608241001: {
      customer_code: 'MDY2608241001',
      customer_name: 'Ei Ei Khaing',
      phone: '0978',
    },
  },
  byName: { 'Ei Ei Khaing': { customer_code: 'MDY2608241001', customer_name: 'Ei Ei Khaing', phone: '0978' } },
};

const now = Date.parse('2026-10-19T12:00:00.000Z');
const old = '2026-10-18T11:00:00.000Z';
const fresh = '2026-10-19T10:00:00.000Z';

test('blank inbound name is the unregistered customer card', () => {
  assert.equal(isUnregisteredCustomerRow({ customerName: '未登记客户', customerCode: '' }, registry), true);
  assert.equal(isUnregisteredCustomerRow({ customerName: '', customerCode: '' }, registry), true);
  assert.equal(isUnregisteredCustomerRow({ customerName: '古风', customerCode: '' }, registry), false);
  assert.equal(
    isUnregisteredCustomerRow({ customerName: '未登记客户', customerCode: 'MDY2608241001' }, registry),
    false,
  );
});

test('only unregistered orders older than 24 hours are selected', () => {
  const picked = selectStaleUnregisteredOrders(
    [
      { id: 'old', customerName: '未登记客户', inboundBarcode: 'A1', inboundAt: old },
      { id: 'new', customerName: '未登记客户', inboundBarcode: 'A2', inboundAt: fresh },
      { id: 'named', customerName: '古风', inboundBarcode: 'A3', inboundAt: old },
      { id: 'notime', customerName: '未登记客户', inboundBarcode: 'A4' },
    ],
    registry,
    now,
  );
  assert.deepEqual(picked.map((row) => row.id), ['old']);
});
