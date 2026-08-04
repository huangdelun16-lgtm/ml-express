/**
 * 装车出库：车费按「车次」计一次，不按包裹重复累加
 */

function parseTripTransportFee(raw) {
  if (raw == null) return 0;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const n = Number(String(raw).trim().replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function normalizeTripLegCode(raw) {
  return String(raw ?? '').trim().toUpperCase();
}

function loadBatchGroupKey(ref) {
  const loaded = String(ref.truck_loaded_at ?? '').trim();
  const origin = normalizeTripLegCode(ref.origin_store_code);
  const leg =
    normalizeTripLegCode(ref.leg_destination_code) ||
    normalizeTripLegCode(ref.destination_code);
  if (!loaded || !origin || !leg) return null;
  const ts = Date.parse(loaded);
  if (Number.isNaN(ts)) return null;
  return `load:${origin}:${leg}:${Math.floor(ts / 60000)}`;
}

function tripTransportGroupKey(tripNumber, packBarcode, loadBatch) {
  const trip = String(tripNumber ?? '').trim().toUpperCase();
  const pack = String(packBarcode ?? '').trim().toUpperCase();
  if (trip) return `trip:${trip}`;
  const batchKey = loadBatch ? loadBatchGroupKey(loadBatch) : null;
  if (batchKey) return batchKey;
  return `pack:${pack}`;
}

function buildTripFeeGroupMap(packages) {
  const groups = new Map();
  for (const pkg of packages || []) {
    const packBarcode = String(pkg.pack_barcode ?? pkg.bundle_barcode ?? '').trim().toUpperCase();
    if (!packBarcode) continue;
    const tripNumber = String(pkg.trip_number ?? '').trim().toUpperCase();
    const key = tripTransportGroupKey(tripNumber, packBarcode, pkg);
    if (!groups.has(key)) {
      groups.set(key, { tripNumber, packs: [] });
    }
    groups.get(key).packs.push(pkg);
  }

  const result = new Map();
  for (const [key, { tripNumber, packs }] of groups) {
    packs.sort((a, b) =>
      String(a.pack_barcode ?? a.bundle_barcode ?? '').localeCompare(
        String(b.pack_barcode ?? b.bundle_barcode ?? ''),
      ),
    );
    const packBarcodes = packs.map((p) =>
      String(p.pack_barcode ?? p.bundle_barcode ?? '').trim().toUpperCase(),
    );
    let fee = 0;
    for (const p of packs) {
      fee = Math.max(fee, parseTripTransportFee(p.transport_fee));
    }
    result.set(key, {
      tripNumber,
      packBarcodes,
      packCount: packBarcodes.length,
      fee,
      primaryPackBarcode: packBarcodes[0] ?? '',
    });
  }
  return result;
}

function isPrimaryTripFeePack(packBarcode, tripNumber, groupMap, loadBatch) {
  const code = String(packBarcode ?? '').trim().toUpperCase();
  const key = tripTransportGroupKey(tripNumber, code, loadBatch);
  const group = groupMap.get(key);
  if (!group || group.packCount <= 1) return true;
  return group.primaryPackBarcode === code;
}

function isTripTransportFeePaid(tripNumber, packBarcodes, transportPaidBarcodes) {
  if (!transportPaidBarcodes || transportPaidBarcodes.size === 0) return false;
  for (const code of packBarcodes || []) {
    if (transportPaidBarcodes.has(String(code).trim().toUpperCase())) return true;
  }
  return false;
}

function buildTransportSubtitle(params) {
  const {
    originLabel,
    legDest,
    tripNumber,
    packCount,
    packBarcode,
    packBarcodes,
  } = params;
  const route = `${originLabel} → ${legDest}`;
  if (tripNumber && packCount > 1) {
    const packList = (packBarcodes || []).slice(0, 3).join(', ');
    const more = packCount > 3 ? ` +${packCount - 3}` : '';
    return `${route} · 车次 ${tripNumber} · ${packCount} 包 (${packList}${more})`;
  }
  if (tripNumber) {
    return `${route} · 车次 ${tripNumber} · ${packBarcode}`;
  }
  return `${route} · ${packBarcode}`;
}

module.exports = {
  parseTripTransportFee,
  loadBatchGroupKey,
  tripTransportGroupKey,
  buildTripFeeGroupMap,
  isPrimaryTripFeePack,
  isTripTransportFeePaid,
  buildTransportSubtitle,
};
