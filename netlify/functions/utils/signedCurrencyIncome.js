/**
 * 全部已签收收入。规则与 src/utils/signedCurrencyIncome.ts 一致。
 * 缅币：已签收且不是明确人民币（含无锁历史单、实收 MMK、只写了汇率的锁）。
 * 人民币：签收备注里明确是实收 CNY。金额用实收 CNY，否则用报价，不按今天汇率把缅币折回来。
 * 多个入库同一基础号只计一次。包裹壳不另计。
 */

const PACKAGE_SHELL_BARCODE = /^[A-Z]{3}\d{2}[A-Z]{3}\d+\d{4}$/;

function isPackageShellBarcode(barcode) {
  return PACKAGE_SHELL_BARCODE.test(String(barcode || '').trim().toUpperCase());
}

function packagingParts(barcode) {
  const match = String(barcode || '')
    .trim()
    .match(/^(.+)\((\d+)-(\d+)\)$/);
  if (!match) return null;
  const total = Number(match[2]);
  const index = Number(match[3]);
  if (!Number.isFinite(total) || !Number.isFinite(index) || total < 1 || index < 1 || index > total) {
    return null;
  }
  return { base: match[1].toUpperCase(), index };
}

function positive(raw) {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function roundCny(n) {
  return Math.round(n * 100) / 100;
}

function isExplicitCny(row) {
  return row && row.paidCurrency === 'CNY';
}

function pickChargeRow(group) {
  let best = group[0];
  for (let i = 1; i < group.length; i += 1) {
    const row = group[i];
    const feeDelta = positive(row.fee) - positive(best.fee);
    if (feeDelta > 0) {
      best = row;
    } else if (feeDelta === 0) {
      const nextIndex = (packagingParts(row.inboundBarcode) || {}).index || 0;
      const bestIndex = (packagingParts(best.inboundBarcode) || {}).index || 0;
      if (nextIndex < bestIndex) best = row;
    }
  }
  return best;
}

function maxAmount(group, read) {
  let max = 0;
  for (let i = 0; i < group.length; i += 1) {
    const n = read(group[i]);
    if (n > max) max = n;
  }
  return max;
}

function sumSignedCurrencyIncome(rows) {
  const list = rows || [];
  const bundleShells = {};
  for (let i = 0; i < list.length; i += 1) {
    const code = String(list[i].packedBundleBarcode || '').trim().toUpperCase();
    if (code) bundleShells[code] = true;
  }

  const groups = {};
  const order = [];
  for (let i = 0; i < list.length; i += 1) {
    const row = list[i];
    if (!row.customerSigned) continue;
    const barcode = String(row.inboundBarcode || '').trim().toUpperCase();
    if (barcode && (isPackageShellBarcode(barcode) || bundleShells[barcode])) continue;
    const parts = packagingParts(row.inboundBarcode);
    const key = parts ? `base:${parts.base}` : `row:${barcode || `anon:${i}`}`;
    if (!groups[key]) {
      groups[key] = [];
      order.push(key);
    }
    groups[key].push(row);
  }

  let mmk = 0;
  let cny = 0;
  for (let i = 0; i < order.length; i += 1) {
    const group = groups[order[i]];
    const charge = pickChargeRow(group);
    if (isExplicitCny(charge)) {
      const paid = positive(charge.paidCny) || maxAmount(group, (row) => positive(row.paidCny));
      const quote = positive(charge.quoteCny) || maxAmount(group, (row) => positive(row.quoteCny));
      cny += paid || quote;
    } else {
      mmk += maxAmount(group, (row) => positive(row.fee));
    }
  }

  return { mmk: Math.round(mmk), cny: roundCny(cny) };
}

module.exports = {
  isPackageShellBarcode,
  sumSignedCurrencyIncome,
};
