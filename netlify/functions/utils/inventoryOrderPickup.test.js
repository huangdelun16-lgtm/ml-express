const test = require('node:test');
const assert = require('node:assert/strict');
const {
  attachPickupToOrders,
  collectItemLookupCodes,
  escapePostgrestIlike,
  filterAwaitingPickupOrders,
  filterSignedOrders,
} = require('./inventoryOrderPickup');

test('attaches signed/notify timestamps by order barcode then express barcode', () => {
  const orders = [
    { id: '1', order_barcode: 'IN-1', express_barcode: 'SF-1', status: 'hub_received' },
    { id: '2', order_barcode: 'IN-2', express_barcode: 'SF-2', status: 'hub_received' },
    { id: '3', order_barcode: 'IN-3', express_barcode: '', status: 'in_transit' },
  ];
  const items = [
    {
      barcode: 'in-1',
      input_barcode: 'SF-1',
      customer_signed_at: '2026-09-10T10:00:00Z',
      arrival_notified_at: '2026-09-10T09:00:00Z',
    },
    {
      barcode: 'OTHER',
      input_barcode: 'sf-2',
      arrival_notified_at: '2026-09-11T08:00:00Z',
      customer_signed_at: null,
    },
  ];

  const attached = attachPickupToOrders(orders, items);
  assert.equal(attached[0].customer_signed_at, '2026-09-10T10:00:00Z');
  assert.equal(attached[1].arrival_notified_at, '2026-09-11T08:00:00Z');
  assert.equal(attached[2].customer_signed_at, null);
  assert.deepEqual(collectItemLookupCodes(items), {
    barcodes: ['IN-1', 'OTHER'],
    expresses: ['SF-1', 'SF-2'],
  });
});

test('awaiting pickup keeps arrived unsigned orders; signed sorts newest first', () => {
  const orders = [
    {
      id: 'a',
      status: 'hub_received',
      customer_signed_at: null,
    },
    {
      id: 'b',
      status: 'hub_received',
      customer_signed_at: '2026-09-10T12:00:00Z',
    },
    {
      id: 'c',
      status: 'in_transit',
      customer_signed_at: null,
    },
    {
      id: 'd',
      status: 'hub_received',
      customer_signed_at: '2026-09-11T08:00:00Z',
    },
  ];

  assert.deepEqual(
    filterAwaitingPickupOrders(orders).map((row) => row.id),
    ['a'],
  );
  assert.deepEqual(
    filterSignedOrders(orders).map((row) => row.id),
    ['d', 'b'],
  );
});

test('escapes ilike wildcards in pack barcodes', () => {
  assert.equal(escapePostgrestIlike('PKG%_1'), 'PKG\\%\\_1');
});
