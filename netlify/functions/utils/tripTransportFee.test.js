const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildTripFeeGroupMap, isPrimaryTripFeePack } = require('./tripTransportFee');

test('trip fee counted once per trip group', () => {
  const map = buildTripFeeGroupMap([
    { pack_barcode: 'PKG-A', trip_number: 'MSE0007', transport_fee: '15000' },
    { pack_barcode: 'PKG-B', trip_number: 'MSE0007', transport_fee: '15000' },
  ]);
  const group = map.get('trip:MSE0007');
  assert.equal(group.fee, 15000);
  assert.equal(group.packCount, 2);
  assert.equal(isPrimaryTripFeePack('PKG-A', 'MSE0007', map), true);
  assert.equal(isPrimaryTripFeePack('PKG-B', 'MSE0007', map), false);
});

test('trip fee counted once per load batch without trip_number', () => {
  const loaded = '2026-08-04T10:00:00.000Z';
  const map = buildTripFeeGroupMap([
    {
      pack_barcode: 'RUI26LSO30001',
      transport_fee: '30000',
      truck_loaded_at: loaded,
      origin_store_code: 'RUILI001',
      leg_destination_code: 'LSO',
    },
    {
      pack_barcode: 'RUI26LSO30002',
      transport_fee: '30000',
      truck_loaded_at: loaded,
      origin_store_code: 'RUILI001',
      leg_destination_code: 'LSO',
    },
  ]);
  const group = map.get('load:RUILI001:LSO:' + Math.floor(Date.parse(loaded) / 60000));
  assert.equal(group.packCount, 2);
  assert.equal(group.fee, 30000);
});
