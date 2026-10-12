const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseTripNumber,
  planTripClear,
  buildTripClearKeys,
  planExportCostClear,
  planSignedInvoiceClear,
  planManualEntryClear,
} = require('./clearInventoryTrip');

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
        total_weight: '12.5',
      },
    ],
    shipments: [{ bundle_barcode: 'PKG-A', bundle_name: 'A' }],
    shipmentItems: [
      { bundle_barcode: 'PKG-A', item_barcode: 'ORD-1' },
      { bundle_barcode: 'PKG-A', item_barcode: 'ORD-2' },
      { bundle_barcode: 'PKG-B', item_barcode: 'ORD-9' },
    ],
    orderRows: [
      { id: 'o1', pack_barcode: 'PKG-A', order_barcode: 'ORD-1', express_barcode: 'EXP-1', recipient_name: 'Ei Ei Khaing' },
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
  assert.equal(plan.totalWeight, '12.5 Kg');
  assert.equal(plan.packSummaries[0].weight, '12.5 Kg');
  assert.equal(plan.packSummaries[0].customerName, 'Ei Ei Khaing');
});

function sampleKeys() {
  return buildTripClearKeys('MSE0007', {
    packBarcodes: ['PKG-A'],
    orderBarcodes: ['ORD-1', 'EXP-1'],
    deleteItemBarcodes: ['ORD-1', 'PKG-A'],
    lineBarcodes: ['ORD-1(2-1)'],
    deleteItemIds: ['item-1'],
    keptOnOtherTrip: ['ORD-9'],
  });
}

test('collects pack, order, line, and item keys without treating another trip as cleared', () => {
  const keys = sampleKeys();
  assert.equal(keys.tripNumber, 'MSE0007');
  assert.equal(keys.barcodes.has('PKG-A'), true);
  assert.equal(keys.barcodes.has('ORD-1'), true);
  assert.equal(keys.barcodes.has('ORD-1(2-1)'), true);
  assert.equal(keys.barcodes.has('BASE'), false);
  assert.equal(keys.itemIds.has('ITEM-1'), true);
  assert.equal(keys.keptBarcodes.has('ORD-9'), true);
  assert.equal(keys.barcodes.has('ORD-9'), false);
});

test('deletes export costs for this trip or its orders and leaves another trip', () => {
  const keys = sampleKeys();
  const plan = planExportCostClear(
    [
      { id: 'by-item', subject_key: 'item-1', display_barcode: 'ORD-1', trip_number: '' },
      { id: 'by-pack', subject_kind: 'package', subject_key: 'pkg-a', display_barcode: 'PKG-A', trip_number: 'MSE0007' },
      { id: 'by-trip', subject_key: 'other-item', display_barcode: 'UNKNOWN', trip_number: 'mse0007' },
      { id: 'kept-order', subject_key: 'item-9', display_barcode: 'ORD-9', trip_number: 'MSE0007' },
      { id: 'other-trip', subject_key: 'item-8', display_barcode: 'ORD-8', trip_number: 'MSE0008' },
      { id: 'line', subject_key: 'line', display_barcode: 'ORD-1(2-1)', trip_number: '' },
      { id: 'sibling', subject_key: 'sib', display_barcode: 'ORD-1(2-2)', trip_number: 'MSE0008' },
    ],
    keys,
  );

  assert.deepEqual(
    plan.deleteIds.sort(),
    ['by-item', 'by-pack', 'by-trip', 'kept-order', 'line', 'sibling'],
  );
  assert.equal(plan.clearTripIds, undefined);
});

test('does not delete a sibling packaging line when only one line barcode is cleared', () => {
  const keys = buildTripClearKeys('MSE0007', {
    packBarcodes: [],
    orderBarcodes: [],
    deleteItemBarcodes: [],
    lineBarcodes: ['BASE(3-1)'],
    deleteItemIds: [],
    keptOnOtherTrip: [],
  });
  const plan = planExportCostClear(
    [
      { id: 'line', display_barcode: 'BASE(3-1)', subject_key: 'a', trip_number: '' },
      { id: 'sibling', display_barcode: 'BASE(3-2)', subject_key: 'b', trip_number: 'MSE0008' },
    ],
    keys,
  );
  assert.deepEqual(plan.deleteIds, ['line']);
  assert.equal(plan.clearTripIds, undefined);
});

test('removes only cleared orders from a mixed invoice and deletes an empty one', () => {
  const keys = sampleKeys();
  const totals = ['总重量 10 Kg', '总费用 ¥100'];
  const plan = planSignedInvoiceClear(
    [
      {
        id: 'mixed',
        trip_label: 'MSE0007',
        piece_count: 2,
        item_ids: ['item-1', 'item-9'],
        document: {
          trip: 'MSE0007',
          packNo: 'PKG-A',
          pieceCount: 2,
          totals,
          lines: [{ title: '订单号', expressNos: ['ORD-1', 'ORD-9'], measure: '10 Kg' }],
          meta: [
            { label: '车次', value: 'MSE0007' },
            { label: '包装号', value: 'PKG-A' },
            { label: '件数', value: '2' },
            { label: '客户姓名', value: 'Ei Ei' },
          ],
        },
      },
      {
        id: 'only-this-trip',
        trip_label: 'MSE0007',
        piece_count: 1,
        item_ids: ['item-1'],
        document: {
          trip: 'MSE0007',
          packNo: 'PKG-A',
          lines: [{ title: '单号', expressNos: ['ORD-1'], measure: '1 Kg' }],
          totals: ['总费用 ¥20'],
          meta: [],
        },
      },
      {
        id: 'other-trip',
        trip_label: 'MSE0008',
        piece_count: 1,
        item_ids: ['item-8'],
        document: {
          trip: 'MSE0008',
          packNo: 'PKG-B',
          lines: [{ title: '单号', expressNos: ['ORD-8'], measure: '1 Kg' }],
          meta: [{ label: '车次', value: 'MSE0008' }],
        },
      },
      {
        id: 'partial-other',
        trip_label: 'MSE0008',
        piece_count: 2,
        item_ids: ['item-1', 'item-8'],
        document: {
          trip: 'MSE0008',
          packNo: 'PKG-B',
          lines: [{ title: '单号', expressNos: ['ORD-1', 'ORD-8'], measure: '2 Kg' }],
          totals: ['总费用 ¥40'],
          meta: [{ label: '车次', value: 'MSE0008' }],
        },
      },
    ],
    keys,
  );

  assert.deepEqual(plan.deleteIds, ['only-this-trip']);
  const mixed = plan.updates.find((row) => row.id === 'mixed');
  assert.equal(mixed.trip_label, '');
  assert.equal(mixed.piece_count, 1);
  assert.deepEqual(mixed.item_ids, ['item-9']);
  assert.deepEqual(mixed.document.lines[0].expressNos, ['ORD-9']);
  assert.equal(mixed.document.lines[0].measure, '10 Kg');
  assert.equal(mixed.document.trip, '');
  assert.equal(mixed.document.packNo, '');
  assert.deepEqual(mixed.document.totals, totals);
  assert.equal(mixed.document.meta.find((item) => item.label === '件数').value, '1');
  assert.equal(mixed.document.meta.find((item) => item.label === '客户姓名').value, 'Ei Ei');
  assert.equal(plan.updates.some((row) => row.id === 'other-trip'), false);

  const partial = plan.updates.find((row) => row.id === 'partial-other');
  assert.equal(partial.trip_label, 'MSE0008');
  assert.deepEqual(partial.document.lines[0].expressNos, ['ORD-8']);
  assert.equal(partial.document.trip, 'MSE0008');
  assert.deepEqual(partial.document.totals, ['总费用 ¥40']);
  assert.deepEqual(partial.item_ids, ['item-8']);
});

test('drops an invoice that only carries this trip number', () => {
  const keys = sampleKeys();
  const plan = planSignedInvoiceClear(
    [
      {
        id: 'anchored',
        trip_label: 'MSE0007',
        item_ids: [],
        document: {
          trip: 'MSE0007',
          lines: [{ expressNos: ['NOT-LOADED'] }],
        },
      },
    ],
    keys,
  );
  assert.deepEqual(plan.deleteIds, ['anchored']);
  assert.deepEqual(plan.updates, []);
});

test('manual entries are removed only when they hang on this trip alone', () => {
  const keys = sampleKeys();
  const plan = planManualEntryClear(
    [
      { id: 'trip-only', category: '装卸费', note: 'MSE0007' },
      { id: 'two-trips', category: '装卸费', note: 'MSE0007、MSE0008' },
      { id: 'kept-order', category: '杂费', note: 'ORD-1 和 ORD-9' },
      { id: 'rent', category: '办公室租金', note: '' },
      { id: 'phone', category: '电话费', note: 'MSE0007 09123456789' },
    ],
    keys,
  );

  assert.deepEqual(plan.deleteIds.sort(), ['phone', 'trip-only']);
  const two = plan.updates.find((row) => row.id === 'two-trips');
  assert.equal(two.note, 'MSE0008');
  assert.equal(two.category, '装卸费');
  const kept = plan.updates.find((row) => row.id === 'kept-order');
  assert.equal(kept.note, '和 ORD-9');
  assert.equal(plan.updates.some((row) => row.id === 'rent'), false);
});
