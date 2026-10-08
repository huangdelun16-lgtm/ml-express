function roundCny(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function moneyText(value) {
  const n = roundCny(value);
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

function legName(code) {
  const dest = String(code || '').trim().toUpperCase();
  if (dest === 'MSE') return '木姐';
  if (dest === 'LSO') return '腊戌';
  return dest;
}

function exportCostInPeriod(createdAt, range) {
  if (!range || !range.fromIso || !range.toExclusiveIso) return true;
  const t = Date.parse(String(createdAt || ''));
  if (!Number.isFinite(t)) return false;
  return t >= Date.parse(range.fromIso) && t < Date.parse(range.toExclusiveIso);
}

function mapExportCostEntry(row, stationName) {
  const total = roundCny(row.total_cny);
  const unit = roundCny(row.unit_price_cny);
  const kg = roundCny(row.weight_kg);
  const trip = String(row.trip_number || '').trim();
  const dest = legName(row.leg_destination);
  return {
    id: `export:${row.id}`,
    category: 'export_cost',
    title: String(row.display_barcode || row.subject_key || ''),
    subtitle: [
      `瑞丽 → ${dest}`,
      `${moneyText(kg)} Kg × ¥${moneyText(unit)}`,
      trip ? `车次 ${trip}` : '车次 —',
      String(row.customer_name || '').trim(),
    ]
      .filter(Boolean)
      .join(' · '),
    amount: total,
    amountDisplay: `¥${moneyText(total)}`,
    paidCny: total,
    paidCurrency: 'CNY',
    occurredAt: row.created_at || '',
    barcode: String(row.display_barcode || ''),
    itemName: String(row.customer_name || ''),
    destination: String(row.leg_destination || ''),
    stationCode: String(row.store_code || ''),
    stationName: stationName || String(row.store_code || ''),
    statusLabel: '已添加',
  };
}

function selectExportCostRows(rows, scope = {}) {
  const storeCode = String(scope.storeCode || '').trim().toUpperCase();
  const range = scope.range || null;
  const fromMs = range && range.fromIso ? Date.parse(range.fromIso) : NaN;
  const toMs = range && range.toExclusiveIso ? Date.parse(range.toExclusiveIso) : NaN;
  const exportCosts = (rows || []).filter((row) => {
    const code = String(row.store_code || '').trim().toUpperCase();
    if (storeCode && code !== storeCode) return false;
    if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) return true;
    const at = Date.parse(row.created_at || '');
    return Number.isFinite(at) && at >= fromMs && at < toMs;
  });
  const totalCny = roundCny(exportCosts.reduce((sum, row) => sum + (Number(row.total_cny) || 0), 0));
  return { exportCosts, totalCny };
}

function appendExportCosts(finance, rows, stores, opts = {}) {
  const range = opts.range || null;
  const storeCode = String(opts.storeCode || '').trim().toUpperCase();
  const names = new Map(
    (stores || []).map((store) => [
      String(store.store_code || '').trim().toUpperCase(),
      store.store_name || store.store_code || '',
    ]),
  );
  const entries = (finance?.entries || []).slice();
  let total = 0;
  for (const row of rows || []) {
    const code = String(row.store_code || '').trim().toUpperCase();
    if (storeCode && code !== storeCode) continue;
    if (!exportCostInPeriod(row.created_at, range)) continue;
    const mapped = mapExportCostEntry(row, names.get(code) || code);
    entries.push(mapped);
    total = roundCny(total + mapped.paidCny);
  }
  entries.sort((a, b) => new Date(b.occurredAt || 0).getTime() - new Date(a.occurredAt || 0).getTime());
  return {
    ...finance,
    entries,
    summary: {
      ...(finance?.summary || {}),
      entryCount: entries.length,
      exportCostCnyTotal: total,
    },
  };
}

async function loadExportCostRows(supabase, warnings) {
  const { data, error } = await supabase
    .from('inventory_export_costs')
    .select(
      'id, display_barcode, subject_key, customer_name, leg_destination, weight_kg, unit_price_cny, total_cny, trip_number, store_code, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) {
    const message = String(error.message || error);
    if (!/does not exist|schema cache/i.test(message)) warnings.push(message);
    return [];
  }
  return data || [];
}

module.exports = {
  appendExportCosts,
  loadExportCostRows,
  mapExportCostEntry,
  selectExportCostRows,
};
