const test = require('node:test');
const assert = require('node:assert/strict');
const { parseTripNumber, planTripClear } = require('./clearInventoryTrip');

test('accepts a station trip number only', () => {
  assert.equal(parseTripNumber(' mse0007 '), 'MSE0007');
  assert.equal(parseTripNumber('MSE7'), '');
  assert.equal(parseTripNumber('MSE0007%'), '');
});

test('clears packs and orders on the trip and leaves another trip alone', () => {
  const plan = planTripClear({
    packs: [
      {
        pack_barcode: 'PKG-A',
        pack_name: 'A',
        origin_store_code: 'MSE',
        leg_destination_code: 'MDY',
        item_count: 2,
        truck_loaded_at: '2026-09-01T00:00:00Z',
      },
    ],
    shipments: [{ bundle_barcode: 'PKG-A', bundle_name: 'A' }],
    shipmentItems: [
      { bundle_barcode: 'PKG-A', item_barcode: 'ORD-1' },
      { bundle_barcode: 'PKG-A', item_barcode: 'ORD-2' },
      { bundle_barcode: 'PKG-B', item_barcode: 'ORD-9' },
    ],
    orderRows: [
      { id: 'o1', pack_barcode: 'PKG-A', order_barcode: 'ORD-1', express_barcode: 'EXP-1' },
      { id: 'o2', pack_barcode: 'PKG-A', order_barcode: 'ORD-2', express_barcode: '' },
      { id: 'o3', pack_barcode: 'PKG-B', order_barcode: 'ORD-9', express_barcode: 'EXP-9' },
    ],
    storeItems: [
      { id: 'i-pack', barcode: 'PKG-A', packed_bundle_barcode: '' },
      { id: 'i1', barcode: 'ORD-1', input_barcode: 'EXP-1', packed_bundle_barcode: 'PKG-A' },
      { id: 'i2', barcode: 'ORD-2', packed_bundle_barcode: '' },
      { id: 'i9', barcode: 'ORD-9', packed_bundle_barcode: 'PKG-B' },
    ],
  });

  assert.deepEqual(plan.packBarcodes, ['PKG-A']);
  assert.equal(plan.orderCount, 2);
  assert.deepEqual(plan.deleteItemBarcodes.sort(), ['ORD-1', 'ORD-2', 'PKG-A']);
  assert.deepEqual(plan.keptOnOtherTrip, ['ORD-9']);
  assert.equal(plan.orderIds.includes('o3'), false);
});
