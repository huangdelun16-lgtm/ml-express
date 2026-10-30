const { sumSignedCurrencyIncome } = require('./signedCurrencyIncome');
const { occurredAtInRange } = require('./yangonFinancePeriod');

function roundCny(value) {
  return Math.round(Number(value) * 100) / 100;
}

function readInvoiceDocument(row) {
  const raw = row && row.document;
  if (raw && typeof raw === 'object') return raw;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function invoiceDay(row) {
  return String((row && (row.issued_on || row.signed_at)) || '').slice(0, 10);
}

/** 本期已签收运费。没有周期时保留全部已签收。 */
function sumPeriodFreight(rows, range, storeCode) {
  const wanted = String(storeCode || '').trim().toUpperCase();
  const filtered = (rows || []).filter((row) => {
    if (!row || !row.customerSigned) return false;
    if (wanted && String(row.ownerStoreCode || '').trim().toUpperCase() !== wanted) return false;
    if (!range || !range.fromIso) return true;
    return occurredAtInRange(row.signedAt, range.fromIso, range.toExclusiveIso);
  });
  return sumSignedCurrencyIncome(filtered);
}

/** 发票上的短途附加费，按开票日计入本期，不重复计入运费。 */
function sumInvoiceExtraFees(invoices, range, storeCode) {
  const wanted = String(storeCode || '').trim().toUpperCase();
  let mmk = 0;
  let cny = 0;
  for (const row of invoices || []) {
    if (wanted && String(row.store_code || '').trim().toUpperCase() !== wanted) continue;
    if (range && range.periodStart && range.periodEnd) {
      const day = invoiceDay(row);
      if (!day || day < range.periodStart || day > range.periodEnd) continue;
    }
    const doc = readInvoiceDocument(row);
    const extraCny = Number(doc.extraFeeCny);
    const extraMmk = Number(doc.extraFeeMmk);
    if (Number.isFinite(extraCny) && extraCny > 0) cny += extraCny;
    if (Number.isFinite(extraMmk) && extraMmk > 0) mmk += extraMmk;
  }
  return { mmk: Math.round(mmk), cny: roundCny(cny) };
}

function combinePeriodIncome(freight, extra) {
  return {
    mmk: Math.round((Number(freight.mmk) || 0) + (Number(extra.mmk) || 0)),
    cny: roundCny((Number(freight.cny) || 0) + (Number(extra.cny) || 0)),
    freightMmk: Math.round(Number(freight.mmk) || 0),
    freightCny: roundCny(Number(freight.cny) || 0),
    extraMmk: Math.round(Number(extra.mmk) || 0),
    extraCny: roundCny(Number(extra.cny) || 0),
  };
}

module.exports = {
  sumPeriodFreight,
  sumInvoiceExtraFees,
  combinePeriodIncome,
};
