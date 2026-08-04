/**
 * 按中转站汇总 Inventory App「财务流水」指标（与 App financeLedgerService 逻辑对齐，基于云端表）
 */

const {
  buildTripFeeGroupMap,
  isTripTransportFeePaid,
  buildTransportSubtitle,
  tripTransportGroupKey,
} = require('./tripTransportFee');

const HUB_BY_REGION = {
  muse: 'MSE',
  mandalay: 'MDY',
  maymyo: 'POL',
  yangon: 'YGN',
  naypyidaw: 'NPW',
  taunggyi: 'TGI',
  lashio: 'LSO',
};

function hubCodeForRegion(regionId) {
  if (!regionId) return '';
  return HUB_BY_REGION[String(regionId).toLowerCase()] || '';
}

function parseAmount(raw) {
  if (raw == null) return 0;
  const s = String(raw).trim();
  if (!s) return 0;
  const n = Number(s.replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function parseInboundMovementNote(note) {
  const trimmed = String(note || '').trim();
  if (!trimmed) return {};
  const parts = trimmed.split(' · ').map((p) => p.trim()).filter(Boolean);
  let totalFee;
  let paymentLabel;
  for (const part of parts) {
    const feeMatch = part.match(/^总费用\s+([\d.]+)\s*MMK$/i);
    if (feeMatch) {
      totalFee = feeMatch[1];
      continue;
    }
    if (part === '到付' || part === '预付') {
      paymentLabel = part;
    }
  }
  return { totalFee, paymentLabel };
}

function normalizeOwnerKey(key) {
  const code = String(key || '').trim().toUpperCase();
  if (!code) return '';
  if (code.startsWith('ADMIN')) return 'ADMIN';
  if (code.startsWith('MUSE') || code === 'MSE' || code === 'MUS') return 'MUSE';
  const letters = code.replace(/[0-9]/g, '');
  const token = letters.length >= 3 ? letters.slice(0, 3) : code.slice(0, 3);
  if (token === 'MSE' || token === 'MUS') return 'MUSE';
  return token;
}

function normalizeDestinationCode(code) {
  const raw = String(code || '').trim().toUpperCase();
  if (!raw) return '';
  const museAliases = ['MSE', 'MUS', 'MUSE'];
  if (museAliases.includes(raw) || raw.startsWith('MUSE')) return 'MSE';
  const key = normalizeOwnerKey(raw);
  if (key === 'MUSE') return 'MSE';
  return key || raw.slice(0, 3);
}

function destinationCodesMatch(a, b) {
  const na = normalizeDestinationCode(a);
  const nb = normalizeDestinationCode(b);
  if (!na || !nb) return false;
  return na === nb;
}

function ownershipKeyFromStoreCode(storeCode) {
  return normalizeOwnerKey(storeCode);
}

function isCrossStationInbound(movement, finalDestination, storeCode, hubCode) {
  const dest = String(finalDestination || '').trim() || String(movement.destination || '').trim();
  if (!destinationCodesMatch(dest, hubCode)) return false;

  const currentKey = ownershipKeyFromStoreCode(storeCode);
  const originKey = String(movement.origin_store_code || '').trim()
    ? ownershipKeyFromStoreCode(movement.origin_store_code)
    : '';

  if (originKey && originKey !== currentKey) return true;

  if (ownershipKeyFromStoreCode(storeCode) === 'ADMIN') {
    return Boolean(originKey && originKey !== normalizeDestinationCode(hubCode));
  }
  return false;
}

function formatMmk(amount) {
  if (!amount || amount <= 0) return '0 MMK';
  return `${amount % 1 === 0 ? amount : amount.toFixed(2)} MMK`;
}

function ownershipLabelFromKey(key) {
  const k = normalizeOwnerKey(key);
  if (k === 'MUSE') return '木姐 MUSE';
  if (k === 'ADMIN') return 'Admin';
  return k || '—';
}

function buildOrderLedgerEntry(params) {
  const { movement, finalDestination, customerSigned, customerName, occurredAt } = params;
  const parsed = parseInboundMovementNote(movement.note);
  const fee = parseAmount(parsed.totalFee);
  const payment = parsed.paymentLabel || '';
  const dest = finalDestination || movement.destination || '';
  const originKey = movement.origin_store_code
    ? ownershipKeyFromStoreCode(movement.origin_store_code)
    : '';
  const originLabel = ownershipLabelFromKey(originKey);
  const customer = customerName || '未登记客户';
  const barcode = String(movement.barcode || '').trim();
  const itemName = String(movement.item_name || barcode).trim();
  const at = occurredAt || movement.created_at || '';

  if (payment === '预付') {
    return {
      id: `order:prepaid:${barcode}`,
      category: 'order_prepaid',
      title: '订单 · 已付款',
      subtitle: `${customer} · ${originLabel} → ${dest} · 预付`,
      amount: fee,
      amountDisplay: fee > 0 ? `已付款 · ${formatMmk(fee)}` : '已付款',
      occurredAt: at,
      barcode,
      itemName,
      destination: dest,
      originLabel,
      originKey,
    };
  }

  if (payment === '到付') {
    if (customerSigned) {
      return {
        id: `order:collected:${barcode}`,
        category: 'order_collected',
        title: '订单收入 · 已签收收款',
        subtitle: `${customer} · ${originLabel} → ${dest} · 到付`,
        amount: fee,
        amountDisplay: fee > 0 ? `+${formatMmk(fee)}` : '已收款',
        occurredAt: at,
        barcode,
        itemName,
        destination: dest,
        originLabel,
        originKey,
      };
    }
    return {
      id: `order:cod:${barcode}`,
      category: 'order_income_cod',
      title: '订单收入 · 到付待收',
      subtitle: `${customer} · ${originLabel} → ${dest}`,
      amount: fee,
      amountDisplay: fee > 0 ? `+${formatMmk(fee)}` : '到付待收',
      occurredAt: at,
      barcode,
      itemName,
      destination: dest,
      originLabel,
      originKey,
    };
  }

  if (fee > 0 && dest) {
    return {
      id: `order:fee:${barcode}`,
      category: 'order_income_cod',
      title: '订单费用',
      subtitle: `${customer} · ${originLabel} → ${dest}`,
      amount: fee,
      amountDisplay: `+${formatMmk(fee)}`,
      occurredAt: at,
      barcode,
      itemName,
      destination: dest,
      originLabel,
      originKey,
    };
  }

  return null;
}

function buildLocalOriginInboundEntry(movement, storeCode) {
  const currentKey = ownershipKeyFromStoreCode(storeCode);
  const originKey = String(movement.origin_store_code || '').trim()
    ? ownershipKeyFromStoreCode(movement.origin_store_code)
    : currentKey;
  if (originKey !== currentKey) return null;

  const parsed = parseInboundMovementNote(movement.note);
  const fee = parseAmount(parsed.totalFee);
  const payment = parsed.paymentLabel || '';
  const dest = String(movement.destination || '').trim();
  const customer = String(movement.recipient_name || '').trim() || '未登记客户';
  const barcode = String(movement.barcode || '').trim();
  const itemName = String(movement.item_name || barcode).trim();
  const originLabel = ownershipLabelFromKey(currentKey);
  const at = movement.created_at || '';

  if (payment === '预付' && fee > 0) {
    return {
      id: `origin:prepaid:${barcode}`,
      category: 'order_prepaid',
      title: '本站入库 · 已收款',
      subtitle: `${customer}${dest ? ` · → ${dest}` : ''} · 预付`,
      amount: fee,
      amountDisplay: `+${formatMmk(fee)}`,
      occurredAt: at,
      barcode,
      itemName,
      destination: dest,
      originLabel,
      originKey,
    };
  }
  if (payment === '到付') {
    return {
      id: `origin:cod:${barcode}`,
      category: 'order_income_cod',
      title: '本站入库 · 到付',
      subtitle: `${customer}${dest ? ` · → ${dest}` : ''} · 待目的站收取`,
      amount: fee,
      amountDisplay: fee > 0 ? `待目的站收 ${formatMmk(fee)}` : '待目的站收取',
      occurredAt: at,
      barcode,
      itemName,
      destination: dest,
      originLabel,
      originKey: currentKey,
    };
  }
  return null;
}

function buildTransportEntry(params) {
  const {
    id,
    packBarcode,
    packName,
    fee,
    legDest,
    originLabel,
    occurredAt,
    paid = false,
    direction = 'inbound',
    tripNumber = '',
    packCount = 1,
    packBarcodes = [],
  } = params;
  return {
    id,
    category: 'transport_cost',
    title: direction === 'outbound' ? '运输成本 · 发运车费' : '运输成本 · 装车车费',
    subtitle: buildTransportSubtitle({
      originLabel,
      legDest,
      tripNumber,
      packCount,
      packBarcode,
      packBarcodes,
    }),
    transportFee: fee,
    tripNumber: tripNumber || undefined,
    paid,
    amount: paid ? 0 : fee,
    amountDisplay: paid
      ? '已支付'
      : fee > 0
        ? `−${formatMmk(fee)}`
        : '待登记车费',
    occurredAt,
    barcode: packBarcode,
    itemName: packName || packBarcode,
    destination: legDest,
    originLabel,
    transportDirection: direction,
  };
}

function buildStockOpEntry(row) {
  const typeLabel = row.type === 'in' ? '入库' : row.type === 'out' ? '出库' : '调整';
  const barcode = String(row.barcode || '').trim();
  const itemName = String(row.item_name || barcode).trim();
  const qty = Number(row.qty) || 0;
  return {
    id: `op:${row.id}`,
    category: 'stock_op',
    title: `${typeLabel} · ${itemName}`,
    subtitle: `${barcode} · ${row.operator || '—'}`,
    amount: null,
    amountDisplay:
      row.type === 'out' ? `−${qty}` : row.type === 'in' ? `+${qty}` : String(qty),
    occurredAt: row.created_at || '',
    barcode,
    itemName,
    destination: row.destination || '',
    originLabel: row.origin_store_name || '',
  };
}

function summarize(entries) {
  let codPendingTotal = 0;
  let collectedTotal = 0;
  let transportCostTotal = 0;

  for (const e of entries) {
    const amt = e.amount ?? 0;
    if (e.category === 'order_income_cod') codPendingTotal += amt;
    if (e.category === 'order_prepaid' || e.category === 'order_collected') collectedTotal += amt;
    if (e.category === 'transport_cost') transportCostTotal += amt;
  }

  return {
    ledgerEntryCount: entries.length,
    codPendingTotal,
    collectedTotal,
    transportCostTotal,
  };
}

function bumpOriginBucket(map, originKey, originLabel, amount) {
  const key = originKey || 'LOCAL';
  if (!map[key]) {
    map[key] = {
      originKey: key,
      label: originLabel || ownershipLabelFromKey(originKey) || '本站',
      total: 0,
      count: 0,
    };
  }
  map[key].total += amount;
  map[key].count += 1;
}

function sortOriginBuckets(map) {
  return Object.values(map)
    .map((g) => ({
      ...g,
      total: Math.round(g.total),
    }))
    .sort((a, b) => b.total - a.total || b.count - a.count);
}

function buildFinanceAttribution(entries, storeCode) {
  const currentKey = ownershipKeyFromStoreCode(storeCode);
  let collectedLocalTotal = 0;
  let collectedAgencyTotal = 0;
  const collectedAgencyByOrigin = {};
  let codLocalTotal = 0;
  let codAgencyTotal = 0;
  const codAgencyByOrigin = {};

  for (const e of entries) {
    const amt = e.amount ?? 0;
    const originKey = String(e.originKey || '').trim();
    const isAgency = originKey && originKey !== currentKey;

    if (e.category === 'order_prepaid' || e.category === 'order_collected') {
      if (isAgency) {
        collectedAgencyTotal += amt;
        bumpOriginBucket(collectedAgencyByOrigin, originKey, e.originLabel, amt);
      } else {
        collectedLocalTotal += amt;
      }
    }

    if (e.category === 'order_income_cod') {
      if (isAgency) {
        codAgencyTotal += amt;
        bumpOriginBucket(codAgencyByOrigin, originKey, e.originLabel, amt);
      } else {
        codLocalTotal += amt;
      }
    }
  }

  return {
    collectedLocalTotal: Math.round(collectedLocalTotal),
    collectedAgencyTotal: Math.round(collectedAgencyTotal),
    collectedAgencyByOrigin: sortOriginBuckets(collectedAgencyByOrigin),
    codLocalTotal: Math.round(codLocalTotal),
    codAgencyTotal: Math.round(codAgencyTotal),
    codAgencyByOrigin: sortOriginBuckets(codAgencyByOrigin),
  };
}

function classifyLedgerEntry(entry, storeCode, hubCode) {
  const currentKey = ownershipKeyFromStoreCode(storeCode);
  const originKey = String(entry.originKey || '').trim();
  const dest = String(entry.destination || '').trim();
  const destHere = destinationCodesMatch(dest, hubCode);
  const originHere = !originKey || originKey === currentKey;
  const agency = Boolean(originKey && originKey !== currentKey);
  const amt = entry.amount ?? 0;

  if (entry.category === 'transport_cost') {
    const fee = Number(entry.transportFee) || amt;
    const outbound =
      entry.transportDirection === 'outbound' ||
      String(entry.title || '').includes('发运');
    if (entry.paid) {
      return { bucket: outbound ? 'transport_out_paid' : 'transport_in_paid', amount: fee };
    }
    return { bucket: outbound ? 'transport_out' : 'transport_in_unpaid', amount: fee };
  }

  if (entry.category === 'order_prepaid' && originHere && !agency) {
    return { bucket: 'origin_prepaid', amount: amt };
  }

  if (entry.category === 'order_income_cod' && originHere && !destHere) {
    return { bucket: 'origin_cod_transit', amount: amt };
  }

  if (entry.category === 'order_income_cod' && destHere && agency) {
    return {
      bucket: 'dest_pending_agency',
      amount: amt,
      originKey,
      originLabel: entry.originLabel,
    };
  }

  if (entry.category === 'order_income_cod' && destHere && originHere) {
    return { bucket: 'dest_pending_local', amount: amt };
  }

  if (
    (entry.category === 'order_collected' || entry.category === 'order_prepaid') &&
    destHere &&
    agency
  ) {
    return {
      bucket: 'dest_agency_collected',
      amount: amt,
      originKey,
      originLabel: entry.originLabel,
    };
  }

  if (entry.category === 'order_collected' && destHere && originHere) {
    return { bucket: 'dest_local_collected', amount: amt };
  }

  return null;
}

function emptyReconcileBucket() {
  return { total: 0, count: 0, items: [] };
}

function buildReconciliationSummary(entries, storeCode, hubCode, opts = {}) {
  const includeEntries = Boolean(opts.includeEntries);
  const buckets = {
    origin_prepaid: emptyReconcileBucket(),
    origin_cod_transit: emptyReconcileBucket(),
    dest_local_collected: emptyReconcileBucket(),
    dest_pending_local: emptyReconcileBucket(),
    dest_pending_agency: emptyReconcileBucket(),
    dest_agency_collected: emptyReconcileBucket(),
    transport_out: emptyReconcileBucket(),
    transport_in_unpaid: emptyReconcileBucket(),
    transport_in_paid: emptyReconcileBucket(),
    transport_out_paid: emptyReconcileBucket(),
  };
  const destPendingAgencyByOrigin = {};
  const destAgencyCollectedByOrigin = {};

  function touch(bucketKey, entry, amount) {
    const b = buckets[bucketKey];
    b.total += amount;
    b.count += 1;
    if (includeEntries) b.items.push(entry);
  }

  function touchOrigin(map, originKey, originLabel, entry, amount, bucketKey) {
    const key = originKey || 'OTHER';
    if (!map[key]) {
      map[key] = {
        originKey: key,
        label: originLabel || ownershipLabelFromKey(originKey) || key,
        total: 0,
        count: 0,
        items: includeEntries ? [] : undefined,
      };
    }
    map[key].total += amount;
    map[key].count += 1;
    if (includeEntries) map[key].items.push(entry);
    touch(bucketKey, entry, amount);
  }

  for (const entry of entries) {
    const cls = classifyLedgerEntry(entry, storeCode, hubCode);
    if (!cls) continue;

    if (cls.bucket === 'dest_pending_agency') {
      touchOrigin(
        destPendingAgencyByOrigin,
        cls.originKey,
        cls.originLabel,
        entry,
        cls.amount,
        'dest_pending_agency',
      );
      continue;
    }

    if (cls.bucket === 'dest_agency_collected') {
      touchOrigin(
        destAgencyCollectedByOrigin,
        cls.originKey,
        cls.originLabel,
        entry,
        cls.amount,
        'dest_agency_collected',
      );
      continue;
    }

    touch(cls.bucket, entry, cls.amount);
  }

  const round = (n) => Math.round(n);
  const destPendingAgencyTotal = buckets.dest_pending_agency.total;
  const destPendingLocalTotal = buckets.dest_pending_local.total;
  const destAgencyCollectedTotal = buckets.dest_agency_collected.total;
  const destLocalCollectedTotal = buckets.dest_local_collected.total;
  const originPrepaidTotal = buckets.origin_prepaid.total;
  const originCodTransitTotal = buckets.origin_cod_transit.total;
  const transportOutboundTotal = buckets.transport_out.total;
  const transportInboundUnpaidTotal = buckets.transport_in_unpaid.total;
  const transportInboundPaidTotal = buckets.transport_in_paid.total;
  const transportOutboundPaidTotal = buckets.transport_out_paid.total;
  const transportInboundTotal = round(transportInboundUnpaidTotal + transportInboundPaidTotal);
  const transportPaidTotal = round(transportInboundPaidTotal + transportOutboundPaidTotal);
  const transportUnpaidTotal = round(transportOutboundTotal + transportInboundUnpaidTotal);

  const summary = {
    originPrepaid: round(originPrepaidTotal),
    originCodTransit: round(originCodTransitTotal),
    destLocalCollected: round(destLocalCollectedTotal),
    destPendingLocal: round(destPendingLocalTotal),
    destPendingAgency: round(destPendingAgencyTotal),
    destPendingTotal: round(destPendingLocalTotal + destPendingAgencyTotal),
    destPendingAgencyByOrigin: sortOriginBuckets(destPendingAgencyByOrigin),
    destAgencyCollected: round(destAgencyCollectedTotal),
    destAgencyCollectedByOrigin: sortOriginBuckets(destAgencyCollectedByOrigin),
    transportOutbound: round(transportOutboundTotal),
    transportInbound: transportInboundTotal,
    transportInboundUnpaid: round(transportInboundUnpaidTotal),
    transportInboundPaid: round(transportInboundPaidTotal),
    transportUnpaidTotal,
    transportPaidTotal,
    transportCostTotal: round(transportUnpaidTotal + transportPaidTotal),
    agencyPayableTotal: round(destAgencyCollectedTotal),
    ownRetainTotal: round(originPrepaidTotal + destLocalCollectedTotal),
    inflowTotal: round(originPrepaidTotal + destLocalCollectedTotal),
    outflowTotal: transportUnpaidTotal,
    pendingInflowTotal: round(destPendingLocalTotal + destPendingAgencyTotal),
    netCashFlow: round(
      originPrepaidTotal +
        destLocalCollectedTotal -
        destAgencyCollectedTotal -
        transportOutboundTotal -
        transportInboundTotal,
    ),
    netPositionHint: round(
      originPrepaidTotal +
        destLocalCollectedTotal -
        destAgencyCollectedTotal -
        transportOutboundTotal -
        transportInboundTotal,
    ),
  };

  if (!includeEntries) return summary;

  return {
    ...summary,
    sections: {
      origin_prepaid: buckets.origin_prepaid,
      origin_cod_transit: buckets.origin_cod_transit,
      dest_local_collected: buckets.dest_local_collected,
      dest_pending_local: buckets.dest_pending_local,
      dest_pending_agency: buckets.dest_pending_agency,
      dest_agency_collected: buckets.dest_agency_collected,
      transport_out: buckets.transport_out,
      transport_in_unpaid: buckets.transport_in_unpaid,
      transport_in_paid: buckets.transport_in_paid,
      transport_out_paid: buckets.transport_out_paid,
      dest_pending_agency_by_origin: sortOriginBuckets(destPendingAgencyByOrigin).map((g) => ({
        ...g,
        items: destPendingAgencyByOrigin[g.originKey]?.items || [],
      })),
      dest_agency_collected_by_origin: sortOriginBuckets(destAgencyCollectedByOrigin).map((g) => ({
        ...g,
        items: destAgencyCollectedByOrigin[g.originKey]?.items || [],
      })),
    },
  };
}

/**
 * 与 Inventory App「跨境财务」页 buildCrossBorderFinanceSummary 同源
 */
function buildCrossBorderFinanceSummary(entries, storeCode, hubCode) {
  const buckets = {
    origin_prepaid: 0,
    dest_local_collected: 0,
    dest_pending_agency: 0,
    dest_agency_collected: 0,
    transport_in_unpaid: 0,
    transport_in_paid: 0,
  };

  let manualIncome = 0;
  let manualExpense = 0;

  for (const entry of entries) {
    if (entry.category === 'manual_income') {
      manualIncome += entry.amount ?? 0;
      continue;
    }
    if (entry.category === 'manual_expense') {
      manualExpense += entry.amount ?? 0;
      continue;
    }

    if (entry.category === 'transport_cost') {
      const outbound =
        entry.transportDirection === 'outbound' ||
        String(entry.title || '').includes('发运');
      if (outbound) continue;

      const legDest = String(entry.destination || '').trim();
      if (!destinationCodesMatch(legDest, hubCode)) continue;
      const fee = Number(entry.transportFee) || (entry.amount ?? 0);
      if (entry.paid) buckets.transport_in_paid += fee;
      else buckets.transport_in_unpaid += fee;
      continue;
    }

    const cls = classifyLedgerEntry(entry, storeCode, hubCode);
    if (!cls) continue;

    if (
      cls.bucket === 'origin_prepaid' ||
      cls.bucket === 'dest_local_collected' ||
      cls.bucket === 'dest_pending_agency' ||
      cls.bucket === 'dest_agency_collected'
    ) {
      buckets[cls.bucket] = (buckets[cls.bucket] ?? 0) + cls.amount;
    }
  }

  const round = (n) => Math.round(n);

  return {
    collectedTotal: round(
      buckets.origin_prepaid + buckets.dest_local_collected + buckets.dest_agency_collected,
    ),
    transportUnpaidTotal: round(buckets.transport_in_unpaid),
    transportPaidTotal: round(buckets.transport_in_paid),
    pendingInflowTotal: round(buckets.dest_pending_agency),
    agencyPayableTotal: round(buckets.dest_agency_collected),
    manualIncomeTotal: round(manualIncome),
    manualExpenseTotal: round(manualExpense),
  };
}

function filterCrossBorderFinanceEntries(entries) {
  return entries.filter(
    (e) =>
      e.category !== 'stock_op' &&
      !(e.category === 'transport_cost' && e.transportDirection === 'outbound'),
  );
}

function collectCloudTransportEntry(pkg, storeCode, hubCode, transportSeen, transportTripSeen, tripGroupMap, transportPaidBarcodes) {
  const legDest = normalizeDestinationCode(
    pkg.leg_destination_code || pkg.destination_code || '',
  );
  if (!legDest) return null;

  const packBarcode = String(pkg.pack_barcode || '').trim().toUpperCase();
  if (!packBarcode || transportSeen.has(packBarcode)) return null;

  const tripNumber = String(pkg.trip_number || '').trim().toUpperCase();
  const tripKey = tripTransportGroupKey(tripNumber, packBarcode, pkg);
  if (transportTripSeen.has(tripKey)) return null;

  const isInboundLeg = destinationCodesMatch(legDest, hubCode);
  // 本段车费由运达站承担，与 inventory_pkg_tracking 一条记录一致；发站不重复计入
  if (!isInboundLeg) return null;

  const group = tripGroupMap.get(tripKey);
  const packBarcodes = group?.packBarcodes ?? [packBarcode];
  const packCount = group?.packCount ?? 1;
  for (const code of packBarcodes) transportSeen.add(code);
  transportTripSeen.add(tripKey);

  const originKey = ownershipKeyFromStoreCode(pkg.origin_store_code || '');
  const fee = group?.fee ?? parseAmount(pkg.transport_fee);
  const originLabel =
    String(pkg.origin_store_name || '').trim() || ownershipLabelFromKey(originKey);
  const paid = isTripTransportFeePaid(tripNumber, packBarcodes, transportPaidBarcodes);

  return buildTransportEntry({
    id: tripNumber ? `transport:trip:${tripNumber}` : `transport:cloud:${packBarcode}`,
    packBarcode: group?.primaryPackBarcode || pkg.pack_barcode,
    packName: pkg.pack_name || pkg.pack_barcode,
    fee,
    legDest,
    originLabel,
    occurredAt: pkg.truck_loaded_at || pkg.updated_at || '',
    direction: 'inbound',
    paid,
    tripNumber,
    packCount,
    packBarcodes,
  });
}

function buildAllFinanceEntries(store, dataset) {
  const storeCode = String(store.store_code || '').trim();
  const hubCode = hubCodeForRegion(store.region);
  if (!storeCode || !hubCode) return [];

  const entries = [];
  const orderSeen = new Set();
  const transportSeen = new Set();
  const transportTripSeen = new Set();
  const transportPaidBarcodes = dataset.transportPaidBarcodes || new Set();
  const tripSourceRows = [
    ...(dataset.packages || []),
    ...(dataset.packedShipments || []).map((row) => ({
      pack_barcode: row.bundle_barcode,
      trip_number: row.trip_number,
      transport_fee: row.transport_fee,
      truck_loaded_at: row.loaded_at,
      origin_store_code: row.owner_store_code,
      leg_destination_code: row.truck_leg_destination,
    })),
  ];
  const tripGroupMap = buildTripFeeGroupMap(tripSourceRows);

  for (const row of dataset.movements) {
    const barcode = String(row.barcode || '').toUpperCase();
    if (barcode.startsWith('PKG')) continue;

    const item = row.item || {};
    const movement = {
      note: row.note,
      destination: row.destination,
      origin_store_code: row.origin_store_code,
      barcode: row.barcode,
      item_name: row.item_name,
      recipient_name: row.recipient_name,
      created_at: row.created_at,
      type: row.type,
    };
    const finalDest = String(item.final_destination || movement.destination || '');
    const customerSigned = Boolean(String(item.customer_signed_at || '').trim());
    const customerName = String(item.recipient_name || row.recipient_name || '').trim();

    if (isCrossStationInbound(movement, finalDest, storeCode, hubCode)) {
      const entry = buildOrderLedgerEntry({
        movement,
        finalDestination: finalDest,
        customerSigned,
        customerName,
        occurredAt: row.created_at,
      });
      if (entry && !orderSeen.has(barcode)) {
        orderSeen.add(barcode);
        entries.push(entry);
      }
      continue;
    }

    const originEntry = buildLocalOriginInboundEntry(movement, storeCode);
    if (originEntry && !orderSeen.has(barcode)) {
      orderSeen.add(barcode);
      entries.push(originEntry);
    }
  }

  for (const row of dataset.packedShipments) {
    const qty = Number(row.item?.qty_on_hand);
    const loaded = row.loaded_at || (Number.isFinite(qty) && qty <= 0);
    if (!loaded) continue;

    const packBarcode = String(row.bundle_barcode || '').trim().toUpperCase();
    if (!packBarcode || transportSeen.has(packBarcode)) continue;

    const legDest = normalizeDestinationCode(row.truck_leg_destination || '');
    const fee = parseAmount(row.transport_fee);
    if (!legDest) continue;

    const ownerKey = ownershipKeyFromStoreCode(row.owner_store_code || '');
    const isInboundLeg = destinationCodesMatch(legDest, hubCode);
    // 与云端追踪一致：本段车费只记在运达站，发站出库不重复扣减
    if (!isInboundLeg) continue;

    const tripNumber = String(row.trip_number || '').trim().toUpperCase();
    const tripKey = tripTransportGroupKey(tripNumber, packBarcode, {
      truck_loaded_at: row.loaded_at,
      origin_store_code: row.owner_store_code,
      leg_destination_code: row.truck_leg_destination,
    });
    if (transportTripSeen.has(tripKey)) continue;

    const group = tripGroupMap.get(tripKey);
    const packBarcodes = group?.packBarcodes ?? [packBarcode];
    for (const code of packBarcodes) transportSeen.add(code);
    transportTripSeen.add(tripKey);

    const originLabel = ownershipLabelFromKey(ownerKey);
    const paid = isTripTransportFeePaid(tripNumber, packBarcodes, transportPaidBarcodes);
    entries.push(
      buildTransportEntry({
        id: tripNumber ? `transport:trip:${tripNumber}` : `transport:pack:${String(row.id || packBarcode)}`,
        packBarcode: group?.primaryPackBarcode || row.bundle_barcode,
        packName: row.bundle_name || row.bundle_barcode,
        fee: group?.fee ?? fee,
        legDest,
        originLabel,
        occurredAt: row.loaded_at || '',
        direction: 'inbound',
        paid,
        tripNumber,
        packCount: group?.packCount ?? 1,
        packBarcodes,
      }),
    );
  }

  for (const pkg of dataset.packages) {
    const transportEntry = collectCloudTransportEntry(
      pkg,
      storeCode,
      hubCode,
      transportSeen,
      transportTripSeen,
      tripGroupMap,
      transportPaidBarcodes,
    );
    if (transportEntry) entries.push(transportEntry);
  }

  for (const pkg of dataset.packages) {
    const hubMatch = destinationCodesMatch(
      pkg.leg_destination_code || pkg.destination_code || '',
      hubCode,
    );
    if (!hubMatch) continue;

    const orders = dataset.ordersByPack[pkg.pack_barcode] || [];
    for (const order of orders) {
      if (!String(order.inbound_note || '').trim()) continue;
      const parsed = parseInboundMovementNote(order.inbound_note);
      if (!parsed.totalFee && !parsed.paymentLabel) continue;

      const orderDest = order.destination_code || '';
      if (orderDest && !destinationCodesMatch(orderDest, hubCode)) continue;

      const orderBarcode = String(order.order_barcode || '').trim().toUpperCase();
      if (!orderBarcode || orderSeen.has(orderBarcode)) continue;

      const pseudoMovement = {
        note: order.inbound_note,
        destination: orderDest,
        origin_store_code: pkg.origin_store_code,
        barcode: order.order_barcode,
        item_name: order.order_name,
        created_at: order.inbound_at,
      };

      const localItem = dataset.itemsByBarcode[orderBarcode];
      const customerSigned = Boolean(String(localItem?.customer_signed_at || '').trim());

      const entry = buildOrderLedgerEntry({
        movement: pseudoMovement,
        finalDestination: orderDest,
        customerSigned,
        customerName: order.recipient_name,
        occurredAt: order.inbound_at,
      });
      if (entry) {
        orderSeen.add(orderBarcode);
        entries.push({ ...entry, id: `cloud:${entry.id}` });
      }
    }
  }

  for (const row of dataset.opMovements) {
    const note = String(row.note || '');
    if (note.includes('装车出库') && row.type === 'out') continue;
    entries.push(buildStockOpEntry(row));
  }

  entries.sort((a, b) => new Date(b.occurredAt || 0).getTime() - new Date(a.occurredAt || 0).getTime());
  return entries;
}

function computeFinanceFromCachedEntries(store, allEntries, financeEntries) {
  const hubCode = hubCodeForRegion(store.region);
  const crossBorderSummary = buildCrossBorderFinanceSummary(
    financeEntries,
    store.store_code,
    hubCode,
  );
  return {
    ...summarize(allEntries),
    ...buildFinanceAttribution(allEntries, store.store_code),
    reconciliation: buildReconciliationSummary(allEntries, store.store_code, hubCode, {
      includeEntries: false,
    }),
    crossBorderSummary,
  };
}

function buildStoreFinanceEntriesCache(transitStores, dataset) {
  const cache = new Map();
  for (const store of transitStores || []) {
    const code = String(store.store_code || '').trim().toUpperCase();
    if (!code) continue;
    const allEntries = buildAllFinanceEntries(store, dataset);
    cache.set(code, {
      store,
      allEntries,
      financeEntries: filterCrossBorderFinanceEntries(allEntries),
    });
  }
  return cache;
}

function computeFinanceForStore(store, dataset) {
  const allEntries = buildAllFinanceEntries(store, dataset);
  const financeEntries = filterCrossBorderFinanceEntries(allEntries);
  return computeFinanceFromCachedEntries(store, allEntries, financeEntries);
}

function groupEntriesByOrigin(entries, localLabel = '本站发出') {
  const groups = {};
  for (const entry of entries) {
    const originKey = String(entry.originKey || '').trim() || 'LOCAL';
    const label =
      originKey === 'LOCAL'
        ? localLabel
        : entry.originLabel || ownershipLabelFromKey(originKey) || originKey;
    if (!groups[originKey]) {
      groups[originKey] = { region: originKey, label, count: 0, totalAmount: 0, items: [] };
    }
    groups[originKey].count += 1;
    groups[originKey].totalAmount += entry.amount ?? 0;
    groups[originKey].items.push(entry);
  }
  return Object.values(groups).sort((a, b) => {
    if (a.region === 'LOCAL') return -1;
    if (b.region === 'LOCAL') return 1;
    return b.totalAmount - a.totalAmount;
  });
}

function groupTransportEntries(entries) {
  const groups = {};
  for (const entry of entries) {
    const routeLabel = entry.subtitle?.split(' · ')[0] || `${entry.originLabel} → ${entry.destination}`;
    const key = routeLabel;
    if (!groups[key]) {
      groups[key] = { region: key, label: routeLabel, count: 0, totalAmount: 0, items: [] };
    }
    groups[key].count += 1;
    groups[key].totalAmount += entry.amount ?? 0;
    groups[key].items.push(entry);
  }
  return Object.values(groups).sort((a, b) => b.totalAmount - a.totalAmount);
}

function buildFinanceBreakdowns(entries) {
  const cod = entries.filter((e) => e.category === 'order_income_cod');
  const collected = entries.filter(
    (e) => e.category === 'order_prepaid' || e.category === 'order_collected',
  );
  const transport = entries.filter((e) => e.category === 'transport_cost');
  return {
    cod: groupEntriesByOrigin(cod, '本站发出 · 到付待收'),
    collected: groupEntriesByOrigin(collected, '本站发出 · 已收'),
    transport: groupTransportEntries(transport),
  };
}

function pushQueryWarning(warnings, label, error) {
  if (error) {
    warnings.push(`${label}：${error.message}`);
  }
}

async function loadFinanceDataset(supabase) {
  const warnings = [];

  const [
    movementsResult,
    opResult,
    packagesResult,
    ordersResult,
    packedResult,
    transportPayResult,
    manualResult,
  ] = await Promise.all([
    supabase
      .from('inventory_stock_movements')
      .select(
        'id, barcode, type, note, destination, origin_store_code, recipient_name, item_name, created_at, item:inventory_store_items!inner(final_destination, recipient_name, customer_signed_at, barcode)',
      )
      .eq('type', 'in')
      .order('created_at', { ascending: false })
      .limit(800),
    supabase
      .from('inventory_stock_movements')
      .select(
        'id, type, note, barcode, item_name, qty, operator, destination, origin_store_name, created_at',
      )
      .order('created_at', { ascending: false })
      .limit(120),
    supabase
      .from('inventory_pkg_tracking')
      .select(
        'pack_barcode, pack_name, origin_store_code, origin_store_name, destination_code, leg_destination_code, transport_fee, trip_number, truck_loaded_at, updated_at, status',
      )
      .in('status', ['in_transit', 'hub_received', 'completed', 'split_at_hub']),
    supabase
      .from('inventory_order_tracking')
      .select(
        'pack_barcode, order_barcode, order_name, destination_code, inbound_note, inbound_at, recipient_name',
      )
      .order('inbound_at', { ascending: false })
      .limit(2000),
    supabase
      .from('inventory_packed_shipments')
      .select(
        'bundle_barcode, bundle_name, owner_store_code, transport_fee, truck_leg_destination, trip_number, loaded_at, item:inventory_store_items(qty_on_hand)',
      )
      .order('created_at', { ascending: false })
      .limit(400),
    supabase.from('inventory_hub_transport_fee_payments').select('pack_barcode'),
    supabase
      .from('cross_border_manual_entries')
      .select('id, entry_date, kind, amount, currency, category, note, created_by, created_at')
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(500),
  ]);

  pushQueryWarning(warnings, '财务流水读取失败', movementsResult.error);
  pushQueryWarning(warnings, '库存操作流水读取失败', opResult.error);
  pushQueryWarning(warnings, '包裹追踪读取失败', packagesResult.error);
  pushQueryWarning(warnings, '订单追踪读取失败', ordersResult.error);
  pushQueryWarning(warnings, '本地包裹读取失败', packedResult.error);
  pushQueryWarning(warnings, '车费支付记录读取失败', transportPayResult.error);
  pushQueryWarning(warnings, '其它开销读取失败', manualResult.error);

  const movements = movementsResult.data || [];
  const orderRows = ordersResult.data || [];

  const transportPaidBarcodes = new Set();
  for (const row of transportPayResult.data || []) {
    const code = String(row.pack_barcode || '').trim().toUpperCase();
    if (code) transportPaidBarcodes.add(code);
  }

  const manualEntries = manualResult.error ? [] : manualResult.data || [];

  const ordersByPack = {};
  for (const order of orderRows || []) {
    const key = order.pack_barcode;
    if (!ordersByPack[key]) ordersByPack[key] = [];
    ordersByPack[key].push(order);
  }

  const itemBarcodes = new Set();
  for (const order of orderRows || []) {
    if (order.order_barcode) itemBarcodes.add(String(order.order_barcode).toUpperCase());
  }

  let itemsByBarcode = {};
  if (itemBarcodes.size > 0) {
    const { data: itemRows, error: itemErr } = await supabase
      .from('inventory_store_items')
      .select('barcode, customer_signed_at')
      .in('barcode', [...itemBarcodes]);

    if (itemErr) {
      warnings.push(`订单签收状态读取失败：${itemErr.message}`);
    } else {
      for (const item of itemRows || []) {
        itemsByBarcode[String(item.barcode).toUpperCase()] = item;
      }
    }
  }

  return {
    dataset: {
      movements,
      opMovements: opResult.data || [],
      packages: packagesResult.data || [],
      ordersByPack,
      packedShipments: packedResult.data || [],
      itemsByBarcode,
      transportPaidBarcodes,
      manualEntries,
    },
    warnings,
  };
}

function mapLedgerToCrossBorderExpense(item, store, expenseCategory) {
  const fee = Number(item.transportFee) || item.amount || 0;
  const amount =
    expenseCategory === 'transport_paid' ? fee : Number(item.amount ?? fee) || 0;
  let statusLabel = '待结算';
  if (expenseCategory === 'transport_paid') statusLabel = '已支付';
  else if (expenseCategory === 'transport_unpaid') statusLabel = '待付车费';
  else if (expenseCategory === 'pending_inflow') statusLabel = '待入账';
  else if (expenseCategory === 'collected') statusLabel = '已收';
  else if (expenseCategory === 'agency_remit') statusLabel = '待结算';

  return {
    id: `expense:${expenseCategory}:${store.store_code}:${item.id}`,
    category: expenseCategory,
    title: item.title,
    subtitle: item.subtitle,
    amount: Math.round(amount),
    amountDisplay: item.amountDisplay,
    occurredAt: item.occurredAt || '',
    barcode: item.barcode,
    itemName: item.itemName,
    destination: item.destination,
    originLabel: item.originLabel,
    stationCode: store.store_code,
    stationName: store.store_name,
    statusLabel,
  };
}

function mapManualToCrossBorderExpense(row) {
  const amount = Math.round(Number(row.amount) || 0);
  const isIncome = row.kind === 'income';
  const category = isIncome ? 'manual_income' : 'manual_expense';
  const subtitleParts = [row.category, row.note]
    .map((s) => String(s || '').trim())
    .filter(Boolean);
  const occurredAt = row.created_at || `${row.entry_date}T12:00:00.000Z`;
  return {
    id: `manual:${row.id}`,
    category,
    title: isIncome ? '其它收入' : '其它支出',
    subtitle: subtitleParts.join(' · ') || '—',
    amount,
    amountDisplay: isIncome
      ? `+${formatMmk(amount)}`
      : amount > 0
        ? `−${formatMmk(amount)}`
        : '0 MMK',
    occurredAt,
    barcode: '',
    itemName: String(row.category || '').trim() || (isIncome ? '其它收入' : '其它支出'),
    stationCode: '—',
    stationName: String(row.created_by || '').trim() || 'Admin',
    statusLabel: isIncome ? '收入' : '支出',
  };
}

function aggregateCrossBorderExpenses(transitStores, entriesCache, dataset) {
  const entries = [];
  const transportSeen = new Set();

  let collectedTotal = 0;
  let transportUnpaidTotal = 0;
  let transportPaidTotal = 0;
  let pendingInflowTotal = 0;

  for (const store of transitStores || []) {
    const hubCode = hubCodeForRegion(store.region);
    if (!hubCode) continue;

    const code = String(store.store_code || '').trim().toUpperCase();
    const cached = entriesCache.get(code);
    if (!cached) continue;

    const { financeEntries } = cached;
    const storeSummary = buildCrossBorderFinanceSummary(
      financeEntries,
      store.store_code,
      hubCode,
    );

    collectedTotal += storeSummary.collectedTotal;
    transportUnpaidTotal += storeSummary.transportUnpaidTotal;
    transportPaidTotal += storeSummary.transportPaidTotal;
    pendingInflowTotal += storeSummary.pendingInflowTotal;

    const rc = buildReconciliationSummary(financeEntries, store.store_code, hubCode, {
      includeEntries: true,
    });
    const sections = rc.sections || {};

    const collectedBuckets = ['origin_prepaid', 'dest_local_collected', 'dest_agency_collected'];
    for (const bucketKey of collectedBuckets) {
      const bucket = sections[bucketKey];
      if (!bucket?.items) continue;
      for (const item of bucket.items) {
        entries.push(mapLedgerToCrossBorderExpense(item, store, 'collected'));
      }
    }

    const transportBuckets = [
      ['transport_in_unpaid', 'transport_unpaid'],
      ['transport_in_paid', 'transport_paid'],
    ];

    for (const [bucketKey, expenseCategory] of transportBuckets) {
      const bucket = sections[bucketKey];
      if (!bucket?.items) continue;
      for (const item of bucket.items) {
        const packKey = String(item.barcode || '').trim().toUpperCase();
        if (packKey && transportSeen.has(packKey)) continue;
        if (packKey) transportSeen.add(packKey);
        entries.push(mapLedgerToCrossBorderExpense(item, store, expenseCategory));
      }
    }

    const pendingBucket = sections.dest_pending_agency;
    if (pendingBucket?.items) {
      for (const item of pendingBucket.items) {
        entries.push(mapLedgerToCrossBorderExpense(item, store, 'pending_inflow'));
      }
    }
  }

  let manualIncome = 0;
  let manualExpense = 0;
  for (const row of dataset.manualEntries || []) {
    const mapped = mapManualToCrossBorderExpense(row);
    entries.push(mapped);
    const amt = mapped.amount ?? 0;
    if (mapped.category === 'manual_income') manualIncome += amt;
    if (mapped.category === 'manual_expense') manualExpense += amt;
  }

  entries.sort(
    (a, b) => new Date(b.occurredAt || 0).getTime() - new Date(a.occurredAt || 0).getTime(),
  );

  return {
    summary: {
      entryCount: entries.length,
      collectedTotal: Math.round(collectedTotal),
      transportUnpaidTotal: Math.round(transportUnpaidTotal),
      transportPaidTotal: Math.round(transportPaidTotal),
      pendingInflowTotal: Math.round(pendingInflowTotal),
      transportRegisteredTotal: Math.round(transportUnpaidTotal + transportPaidTotal),
      manualIncomeTotal: Math.round(manualIncome),
      manualExpenseTotal: Math.round(manualExpense),
    },
    entries,
  };
}

async function aggregateFinanceForTransitStores(supabase, transitStores) {
  const { dataset, warnings } = await loadFinanceDataset(supabase);
  const entriesCache = buildStoreFinanceEntriesCache(transitStores, dataset);

  const financeByStoreCode = {};
  for (const [code, cached] of entriesCache) {
    financeByStoreCode[code] = computeFinanceFromCachedEntries(
      cached.store,
      cached.allEntries,
      cached.financeEntries,
    );
  }

  const crossBorderFinance = aggregateCrossBorderExpenses(transitStores, entriesCache, dataset);

  return { financeByStoreCode, crossBorderFinance, warnings };
}

async function fetchStoreFinanceDetail(supabase, storeCode) {
  const code = String(storeCode || '').trim().toUpperCase();
  if (!code) return { error: '缺少店铺代码' };

  const { data: store, error: storeErr } = await supabase
    .from('delivery_stores')
    .select('id, store_name, store_code, region, status')
    .eq('store_code', code)
    .maybeSingle();

  if (storeErr) return { error: storeErr.message };
  if (!store) return { error: '未找到该中转站' };

  const { dataset, warnings } = await loadFinanceDataset(supabase);
  const entries = buildAllFinanceEntries(store, dataset);
  const hubCode = hubCodeForRegion(store.region);
  const summary = {
    ...summarize(entries),
    ...buildFinanceAttribution(entries, store.store_code),
    reconciliation: buildReconciliationSummary(entries, store.store_code, hubCode, {
      includeEntries: false,
    }),
  };
  const breakdown = buildFinanceBreakdowns(entries);
  const reconciliationDetail = buildReconciliationSummary(entries, store.store_code, hubCode, {
    includeEntries: true,
  });

  return {
    store,
    hubCode,
    summary,
    entries,
    breakdown,
    reconciliationDetail,
    warnings,
  };
}

module.exports = {
  aggregateFinanceForTransitStores,
  aggregateCrossBorderExpenses,
  fetchStoreFinanceDetail,
  hubCodeForRegion,
};
