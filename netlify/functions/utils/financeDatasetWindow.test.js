const test = require('node:test');
const assert = require('node:assert/strict');
const {
  hasFinanceRange,
  noteMarkerOr,
  mergeRowsByKey,
  safePaidCodes,
} = require('./financeDatasetWindow');

test('range needs both instants and Yangon dates', () => {
  assert.equal(hasFinanceRange(null), false);
  assert.equal(
    hasFinanceRange({
      fromIso: '2026-09-30T17:30:00.000Z',
      toExclusiveIso: '2026-10-31T17:30:00.000Z',
      periodStart: '2026-10-01',
      periodEnd: '2026-10-31',
    }),
    true,
  );
  assert.equal(
    hasFinanceRange({
      fromIso: '2026-09-30T17:30:00.000Z',
      toExclusiveIso: '2026-10-31T17:30:00.000Z',
    }),
    false,
  );
});

test('older note filter keeps COD, pack fee, and bundle notes', () => {
  const filter = noteMarkerOr('inbound_note');
  assert.match(filter, /inbound_note\.ilike\."\*到付\*"/);
  assert.match(filter, /Total fee/);
  assert.match(filter, /打包入/);
  assert.doesNotMatch(filter, /预付/);
});

test('merge keeps the first row for a barcode and remembers truncation', () => {
  const merged = mergeRowsByKey(
    [
      { data: [{ pack_barcode: 'A' }, { pack_barcode: 'B' }], truncated: true },
      { data: [{ pack_barcode: 'a' }, { pack_barcode: 'C' }] },
    ],
    (row) => String(row.pack_barcode || '').toUpperCase(),
  );
  assert.deepEqual(
    merged.data.map((row) => row.pack_barcode),
    ['A', 'B', 'C'],
  );
  assert.equal(merged.truncated, true);
  assert.equal(merged.error, null);
});

test('paid barcodes stay uppercase and drop blank values', () => {
  assert.deepEqual(safePaidCodes([' rui1 ', 'RUI1', '', 'bad code']), ['RUI1']);
});
