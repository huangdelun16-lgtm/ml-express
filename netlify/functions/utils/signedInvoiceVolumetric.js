const { volumetricKgFromSpec } = require('../../../src/utils/volumetricWeightCore');

function parseKg(raw) {
  const match = String(raw || '').match(/(\d+(?:\.\d+)?)/);
  const n = match ? Number(match[1]) : 0;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function formatKg(kg) {
  const n = Math.round(Number(kg) * 100) / 100;
  if (!(n > 0)) return '';
  return n % 1 === 0 ? String(n) : String(n);
}

/** 旧发票只补体积重量这一行。已经写下的重量和费用不动。 */
function appendVolumetricMeasure(measure, spec, actualKg) {
  const text = String(measure || '').trim();
  if (!text || /体积重量|Volumetric weight/i.test(text)) return text;
  const vol = volumetricKgFromSpec(spec);
  if (!(vol > actualKg) || !(actualKg > 0)) return String(measure || '');
  const label = formatKg(vol);
  if (!label) return String(measure || '');
  return `${text} · 体积重量 ${label} Kg`;
}

function applyVolumetricLines(document, items, shells) {
  if (!document || typeof document !== 'object' || !Array.isArray(document.lines)) return document;
  const shellByBarcode = shells || new Map();
  const next = {
    ...document,
    lines: document.lines.map((line) => {
      const nos = new Set((line.expressNos || []).map((no) => String(no || '').trim().toUpperCase()).filter(Boolean));
      const matched = (items || []).filter((item) => {
        const express = String(item.input_barcode || '').trim().toUpperCase();
        const inbound = String(item.barcode || '').trim().toUpperCase();
        return (express && nos.has(express)) || (inbound && nos.has(inbound));
      });
      if (!matched.length) return line;
      const pack = matched.map((item) => String(item.packed_bundle_barcode || '').trim().toUpperCase()).find(Boolean);
      const shell = pack ? shellByBarcode.get(pack) : null;
      const spec = String((shell && shell.spec) || matched.map((item) => item.spec).find((value) => String(value || '').trim()) || '');
      const actual = parseKg(shell && shell.weight) || parseKg(matched.map((item) => item.weight).find((value) => parseKg(value))) || 0;
      return { ...line, measure: appendVolumetricMeasure(line.measure, spec, actual) };
    }),
  };
  return next;
}

async function loadRows(supabase, table, columns, ids, key) {
  const rows = [];
  for (let i = 0; i < ids.length; i += 80) {
    const chunk = ids.slice(i, i + 80);
    const { data, error } = await supabase.from(table).select(columns).in(key, chunk);
    if (error) return { rows, error };
    rows.push(...(data || []));
  }
  return { rows, error: null };
}

async function enrichSignedInvoiceMeasures(supabase, invoices) {
  const source = invoices || [];
  const ids = [...new Set(source.flatMap((row) => row.item_ids || []).filter(Boolean))];
  if (!ids.length) return source;
  const loaded = await loadRows(
    supabase,
    'inventory_store_items',
    'id, barcode, input_barcode, spec, weight, packed_bundle_barcode',
    ids,
    'id',
  );
  if (loaded.error) return source;
  const packs = [...new Set(loaded.rows.map((item) => String(item.packed_bundle_barcode || '').trim()).filter(Boolean))];
  const shells = new Map();
  if (packs.length) {
    const shellRows = await loadRows(
      supabase,
      'inventory_store_items',
      'barcode, spec, weight',
      packs,
      'barcode',
    );
    if (!shellRows.error) {
      for (const shell of shellRows.rows) {
        shells.set(String(shell.barcode || '').trim().toUpperCase(), shell);
      }
    }
  }
  const byId = new Map(loaded.rows.map((item) => [item.id, item]));
  return source.map((row) => {
    const linked = (row.item_ids || []).map((id) => byId.get(id)).filter(Boolean);
    if (!linked.length || !row.document) return row;
    return { ...row, document: applyVolumetricLines(row.document, linked, shells) };
  });
}

module.exports = {
  appendVolumetricMeasure,
  applyVolumetricLines,
  enrichSignedInvoiceMeasures,
};
