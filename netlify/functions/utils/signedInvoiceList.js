const { escapePostgrestIlike } = require('./inventoryOrderPickup');
const { yangonYmdFromUtc } = require('./yangonFinancePeriod');

const INVOICE_SEARCH_COLUMNS = ['invoice_no', 'customer_name', 'phone', 'trip_label'];
const INVOICE_PAGE_SIZES = [10, 15, 20, 30];
const INVOICE_PAGE_SIZE_DEFAULT = 10;
/** 年份收藏往回看的年数。当前年永远在内，更早的年份有发票才出现。 */
const INVOICE_YEAR_LOOKBACK = 7;

function yangonYear(now = new Date()) {
  return yangonYmdFromUtc(now).y;
}

function parseSignedInvoiceListQuery(query, now = new Date()) {
  const currentYear = yangonYear(now);
  const rawYear = parseInt(String(query?.year || ''), 10);
  const year =
    Number.isFinite(rawYear) && rawYear >= 2000 && rawYear <= currentYear + 1
      ? rawYear
      : currentYear;
  const rawPage = parseInt(String(query?.page || '1'), 10);
  const rawSize = parseInt(String(query?.pageSize || ''), 10);
  const q = String(query?.q || '')
    .trim()
    .replace(/,/g, ' ')
    .slice(0, 80);
  return {
    year,
    page: Number.isFinite(rawPage) && rawPage > 0 ? Math.min(rawPage, 500) : 1,
    pageSize: INVOICE_PAGE_SIZES.includes(rawSize) ? rawSize : INVOICE_PAGE_SIZE_DEFAULT,
    q,
    searching: q.length > 0,
  };
}

function invoiceYearRange(year) {
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

function invoiceYearsToScan(currentYear, lookback = INVOICE_YEAR_LOOKBACK) {
  const span = Number.isFinite(lookback) && lookback >= 0 ? Math.min(20, lookback) : INVOICE_YEAR_LOOKBACK;
  const years = [];
  for (let i = 0; i <= span; i += 1) years.push(currentYear - i);
  return years;
}

function collectInvoiceYears(currentYear, counts) {
  const found = [];
  for (const row of counts || []) {
    const year = Number(row && row.year);
    const count = Number(row && row.count) || 0;
    if (!Number.isFinite(year)) continue;
    if (count > 0 || year === currentYear) {
      found.push({ year, count: count > 0 ? count : 0 });
    }
  }
  if (!found.some((row) => row.year === currentYear)) {
    found.push({ year: currentYear, count: 0 });
  }
  found.sort((a, b) => b.year - a.year);
  return found;
}

function invoiceSearchOr(q) {
  const raw = String(q || '').trim();
  if (!raw) return '';
  const escaped = escapePostgrestIlike(raw).replace(/"/g, '');
  const pattern = `"%${escaped}%"`;
  return INVOICE_SEARCH_COLUMNS.map((column) => `${column}.ilike.${pattern}`).join(',');
}

module.exports = {
  INVOICE_PAGE_SIZE_DEFAULT,
  INVOICE_PAGE_SIZES,
  INVOICE_SEARCH_COLUMNS,
  INVOICE_YEAR_LOOKBACK,
  collectInvoiceYears,
  invoiceSearchOr,
  invoiceYearRange,
  invoiceYearsToScan,
  parseSignedInvoiceListQuery,
  yangonYear,
};
