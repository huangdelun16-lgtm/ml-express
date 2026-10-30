const test = require('node:test');
const assert = require('node:assert/strict');
const {
  collectInvoiceYears,
  invoiceSearchOr,
  invoiceYearRange,
  invoiceYearsToScan,
  parseSignedInvoiceListQuery,
  yangonYear,
} = require('./signedInvoiceList');

test('yangon year rolls at Yangon midnight', () => {
  assert.equal(yangonYear(new Date('2025-12-31T17:29:00.000Z')), 2025);
  assert.equal(yangonYear(new Date('2025-12-31T17:30:00.000Z')), 2026);
});

test('invoice list defaults to the Yangon year and a page of 10', () => {
  const parsed = parseSignedInvoiceListQuery({}, new Date('2026-10-26T18:00:00.000Z'));
  assert.equal(parsed.year, 2026);
  assert.equal(parsed.page, 1);
  assert.equal(parsed.pageSize, 10);
  assert.equal(parsed.searching, false);
});

test('search keeps a chosen year for the chips and a safe page size', () => {
  const parsed = parseSignedInvoiceListQuery(
    { year: '2025', page: '3', pageSize: '15', q: ' 古风, RUI0030 ' },
    new Date('2026-10-26T18:00:00.000Z'),
  );
  assert.equal(parsed.year, 2025);
  assert.equal(parsed.page, 3);
  assert.equal(parsed.pageSize, 15);
  assert.equal(parsed.q, '古风  RUI0030');
  assert.equal(parsed.searching, true);
  const invalid = parseSignedInvoiceListQuery(
    { year: '1999', pageSize: '999' },
    new Date('2026-10-26T18:00:00.000Z'),
  );
  assert.equal(invalid.year, 2026);
  assert.equal(invalid.pageSize, 10);
});

test('year bounds cover the whole calendar year', () => {
  assert.deepEqual(invoiceYearRange(2026), { from: '2026-01-01', to: '2026-12-31' });
});

test('year chips keep the current year and any earlier year that has invoices', () => {
  const years = collectInvoiceYears(2026, [
    { year: 2026, count: 4 },
    { year: 2025, count: 2 },
    { year: 2024, count: 0 },
  ]);
  assert.deepEqual(years, [
    { year: 2026, count: 4 },
    { year: 2025, count: 2 },
  ]);
  assert.deepEqual(collectInvoiceYears(2026, []), [{ year: 2026, count: 0 }]);
  assert.deepEqual(invoiceYearsToScan(2026, 1), [2026, 2025]);
});

test('search filter quotes every invoice column', () => {
  const filter = invoiceSearchOr('RUI0030');
  assert.match(filter, /invoice_no\.ilike\."%RUI0030%"/);
  assert.match(filter, /customer_name\.ilike\."%RUI0030%"/);
  assert.match(filter, /phone\.ilike\."%RUI0030%"/);
  assert.match(filter, /trip_label\.ilike\."%RUI0030%"/);
  assert.equal(invoiceSearchOr('  '), '');
});
