const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildPendingExportBoard,
  withoutSavedExportCosts,
  countPendingPackItems,
  countPendingTruckLoads,
  countPendingNotify,
  settleAdminExportCost,
} = require('./inventoryHqMirror');

test('pending export keeps stocked singles and multi-inbound packs, then drops saved ones', () => {
  const board = buildPendingExportBoard(
    [
      {
        id: 's1',
        barcode: 'MDY105600261026',
        input_barcode: '777448827423866',
        recipient_name: 'AMT',
        final_destination: 'MDY',
        weight: '3 Kg',
        qty_on_hand: 0,
        customer_signed_at: '2026-10-10',
        packed_bundle_barcode: 'RUI26MDY200004',
      },
      {
        id: 'p1',
        barcode: 'RUI26MDY2(2-1)',
        input_barcode: '111',
        recipient_name: 'Ko',
        final_destination: 'MDY',
        weight: '1',
        qty_on_hand: 1,
      },
      {
        id: 'p2',
        barcode: 'RUI26MDY2(2-2)',
        input_barcode: '222',
        recipient_name: 'Ko',
        final_destination: 'MDY',
        weight: '1',
        packed_at: '2026-10-11',
      },
      {
        id: 'shell',
        barcode: 'RUI26MDY200004',
        weight: '12 Kg',
        qty_on_hand: 1,
      },
      {
        id: 'draft',
        barcode: 'MDY0001',
        qty_on_hand: 0,
      },
    ],
    {
      tripByBarcode: new Map([['RUI26MDY200004', 'RUI0027']]),
      packageWeightKg: new Map([['RUI26MDY2', 8]]),
    },
  );

  assert.equal(board.singles.length, 1);
  assert.equal(board.singles[0].barcode, '777448827423866');
  assert.equal(board.singles[0].weightKg, 3);
  assert.equal(board.singles[0].tripNumber, 'RUI0027');
  assert.equal(board.packages.length, 1);
  assert.equal(board.packages[0].base, 'RUI26MDY2');
  assert.equal(board.packages[0].pieceCount, 2);
  assert.equal(board.packages[0].weightKg, 8);

  const left = withoutSavedExportCosts(board, [
    { subject_kind: 'single', subject_key: 's1' },
    { subject_kind: 'package', subject_key: 'rui26mdy2' },
  ]);
  assert.equal(left.singles.length, 0);
  assert.equal(left.packages.length, 0);
});

test('admin export cost settles yuan or locked kyat the same way as the app', () => {
  const cny = settleAdminExportCost({
    subjectKind: 'single',
    subjectKey: 's1',
    displayBarcode: '777',
    legDestination: 'MSE',
    weightKg: 2,
    unitPriceCny: 10,
    payCurrency: 'CNY',
    storeCode: 'RUI001',
    createdBy: 'hq',
  });
  assert.equal(cny.total_cny, 20);
  assert.equal(cny.total_mmk, 0);
  assert.equal(cny.fx_mmk_per_cny, null);

  const mmk = settleAdminExportCost({
    subjectKind: 'package',
    subjectKey: 'rui26mdy2',
    legDestination: 'lso',
    weightKg: 2,
    unitPriceCny: 10,
    payCurrency: 'MMK',
    mmkPerCny: 450,
  });
  assert.equal(mmk.subject_key, 'RUI26MDY2');
  assert.equal(mmk.total_cny, 0);
  assert.equal(mmk.total_mmk, 9000);
  assert.throws(() => settleAdminExportCost({ ...cny, legDestination: 'MDY', subjectKind: 'single', subjectKey: 's1', weightKg: 1, unitPriceCny: 1, payCurrency: 'CNY' }), /木姐或腊戌/);
});

test('hq todo counts match the inventory home rules', () => {
  assert.equal(
    countPendingPackItems([
      { barcode: 'MDY1', qty_on_hand: 1 },
      { barcode: 'MDY2', qty_on_hand: 1, packed_at: '2026-10-01' },
      { barcode: 'RUI26MDY100001', qty_on_hand: 1 },
      { barcode: 'MDY3', qty_on_hand: 0 },
    ]),
    1,
  );
  assert.equal(
    countPendingTruckLoads([
      { loaded_at: null, cloud_status: '' },
      { loaded_at: null, cloud_status: 'in_transit' },
      { loaded_at: '2026-10-01', cloud_status: '' },
    ]),
    1,
  );
  assert.equal(
    countPendingNotify([
      { barcode: 'MDY1', hub_arrived_at: '2026-10-01', customer_signed_at: '', arrival_notified_at: '' },
      { barcode: 'MDY2', hub_arrived_at: '2026-10-01', arrival_notified_at: '2026-10-02' },
      { barcode: 'MDY3', hub_arrived_at: '2026-10-01', customer_signed_at: '2026-10-03' },
      { barcode: 'RUI26MDY100001', hub_arrived_at: '2026-10-01' },
    ]),
    1,
  );
});
