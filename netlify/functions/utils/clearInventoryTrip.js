function normalizeCode(value) {
  return String(value || '').trim().toUpperCase();
}

function parseTripNumber(value) {
  const tripNumber = normalizeCode(value);
  if (!/^[A-Z]{3}[0-9]{4}$/.test(tripNumber)) return '';
  return tripNumber;
}

function parseKg(value) {
  const text = String(value || '').trim();
  if (!text) return 0;
  const n = Number(text.replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function formatKg(kg) {
  if (!(kg > 0)) return '';
  const rounded = Math.round(kg * 100) / 100;
  return `${rounded} Kg`;
}

function addCustomerName(map, packCode, name) {
  const code = normalizeCode(packCode);
  const text = String(name || '').trim();
  if (!code || !text) return;
  const list = map.get(code) || [];
  if (!list.some((item) => item.toLowerCase() === text.toLowerCase())) list.push(text);
  map.set(code, list);
}

function chunk(list, size = 80) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

function planTripClear({ packs, shipments, shipmentItems, orderRows, storeItems }) {
  const packBarcodeSet = new Set();
  const packBarcodes = [];
  const packSummaries = [];

  function rememberPack(rawBarcode, summary) {
    const code = normalizeCode(rawBarcode);
    if (!code || packBarcodeSet.has(code)) return;
    packBarcodeSet.add(code);
    packBarcodes.push(String(rawBarcode || '').trim());
    packSummaries.push(summary);
  }

  for (const pack of packs || []) {
    const code = normalizeCode(pack.pack_barcode);
    if (!code || packBarcodeSet.has(code)) continue;
    rememberPack(pack.pack_barcode, {
      packBarcode: code,
      name: String(pack.pack_name || '').trim(),
      route: [pack.origin_store_code, pack.leg_destination_code || pack.destination_code]
        .map((part) => normalizeCode(part))
        .filter(Boolean)
        .join(' → '),
      itemCount: Number(pack.item_count) || 0,
      loadedAt: pack.truck_loaded_at || null,
      weight: '',
      customerName: '',
    });
  }

  for (const shipment of shipments || []) {
    const code = normalizeCode(shipment.bundle_barcode);
    if (!code || packBarcodeSet.has(code)) continue;
    rememberPack(shipment.bundle_barcode, {
      packBarcode: code,
      name: String(shipment.bundle_name || '').trim(),
      route: [shipment.owner_store_code, shipment.truck_leg_destination]
        .map((part) => normalizeCode(part))
        .filter(Boolean)
        .join(' → '),
      itemCount: 0,
      loadedAt: null,
      weight: '',
      customerName: '',
    });
  }

  const orderIds = [];
  const orderBarcodes = [];
  const orderSamples = [];
  const orderBarcodeSet = new Set();
  for (const order of orderRows || []) {
    const pack = normalizeCode(order.pack_barcode);
    if (!packBarcodeSet.has(pack)) continue;
    if (order.id) orderIds.push(order.id);
    const orderCode = normalizeCode(order.order_barcode);
    const express = normalizeCode(order.express_barcode);
    if (orderCode && !orderSamples.includes(orderCode)) orderSamples.push(orderCode);
    if (orderCode && !orderBarcodeSet.has(orderCode)) {
      orderBarcodeSet.add(orderCode);
      orderBarcodes.push(orderCode);
    }
    if (express && !orderBarcodeSet.has(express)) {
      orderBarcodeSet.add(express);
      orderBarcodes.push(express);
    }
  }

  const shipmentItemBarcodes = new Set();
  const lineBarcodes = [];
  const lineSeen = new Set();
  function rememberLine(raw) {
    const code = normalizeCode(raw);
    if (!code || lineSeen.has(code)) return;
    lineSeen.add(code);
    lineBarcodes.push(String(raw).trim());
  }
  for (const line of shipmentItems || []) {
    const pack = normalizeCode(line.bundle_barcode);
    if (pack && !packBarcodeSet.has(pack)) continue;
    const code = normalizeCode(line.item_barcode);
    if (code) shipmentItemBarcodes.add(code);
    rememberLine(line.item_barcode);
    rememberLine(line.input_barcode);
  }

  const deleteItemIds = [];
  const deleteItemBarcodes = [];
  const seenItems = new Set();
  const keptOnOtherTrip = [];

  for (const item of storeItems || []) {
    const barcode = normalizeCode(item.barcode);
    const input = normalizeCode(item.input_barcode);
    const currentPack = normalizeCode(item.packed_bundle_barcode);
    if (!barcode || seenItems.has(barcode)) continue;
    const onThisPack = Boolean(currentPack && packBarcodeSet.has(currentPack));
    const onOtherPack = Boolean(currentPack && !packBarcodeSet.has(currentPack));
    const isBundle = packBarcodeSet.has(barcode);
    const inLines = shipmentItemBarcodes.has(barcode);
    const inOrders = orderBarcodeSet.has(barcode) || (input && orderBarcodeSet.has(input));
    if (onOtherPack && !isBundle) {
      keptOnOtherTrip.push(barcode);
      seenItems.add(barcode);
      continue;
    }
    if (!(onThisPack || isBundle || inLines || inOrders)) continue;
    seenItems.add(barcode);
    if (item.id) deleteItemIds.push(item.id);
    deleteItemBarcodes.push(String(item.barcode || '').trim());
  }

  const weightByPack = new Map();
  for (const pack of packs || []) {
    const code = normalizeCode(pack.pack_barcode);
    const kg = parseKg(pack.total_weight);
    if (code && kg > 0) weightByPack.set(code, kg);
  }
  const namesByPack = new Map();
  for (const order of orderRows || []) {
    addCustomerName(namesByPack, order.pack_barcode, order.recipient_name || order.order_name);
  }
  const itemWeightByPack = new Map();
  for (const item of storeItems || []) {
    const pack = normalizeCode(item.packed_bundle_barcode);
    if (!pack || !packBarcodeSet.has(pack)) continue;
    if (packBarcodeSet.has(normalizeCode(item.barcode))) continue;
    addCustomerName(namesByPack, pack, item.recipient_name || item.customer_name);
    const kg = parseKg(item.weight);
    if (kg > 0) itemWeightByPack.set(pack, (itemWeightByPack.get(pack) || 0) + kg);
  }
  let totalKg = 0;
  for (const summary of packSummaries) {
    const code = normalizeCode(summary.packBarcode);
    const kg = weightByPack.get(code) || itemWeightByPack.get(code) || 0;
    summary.weight = formatKg(kg);
    summary.customerName = (namesByPack.get(code) || []).join('、');
    totalKg += kg;
  }

  return {
    packBarcodes,
    packSummaries,
    orderIds,
    orderBarcodes,
    orderSamples,
    orderCount:
      deleteItemBarcodes.filter((code) => !packBarcodeSet.has(normalizeCode(code))).length ||
      orderIds.length,
    deleteItemIds,
    deleteItemBarcodes,
    lineBarcodes,
    keptOnOtherTrip,
    totalWeight: formatKg(totalKg),
  };
}

function codeAliases(value) {
  const code = normalizeCode(value);
  if (!code) return [];
  const aliases = [code];
  const match = code.match(/^(.+)\((\d+)-(\d+)\)$/);
  if (!match) return aliases;
  const total = Number(match[2]);
  const index = Number(match[3]);
  if (total >= 1 && index >= 1 && index <= total && match[1]) aliases.push(match[1]);
  return aliases;
}

function aliasesHit(value, set) {
  return codeAliases(value).some((code) => set.has(code));
}

function addExact(set, value) {
  const code = normalizeCode(value);
  if (code) set.add(code);
}

function buildTripClearKeys(tripNumber, plan) {
  const barcodes = new Set();
  const itemIds = new Set();
  const keptBarcodes = new Set();
  const tokens = [];
  const tokenSeen = new Set();
  const trip = normalizeCode(tripNumber);

  function addToken(value) {
    const text = String(value || '').trim();
    const code = normalizeCode(text);
    if (!code || tokenSeen.has(code)) return;
    tokenSeen.add(code);
    tokens.push(text);
  }

  if (trip) addToken(trip);
  for (const value of [
    ...(plan?.packBarcodes || []),
    ...(plan?.orderBarcodes || []),
    ...(plan?.deleteItemBarcodes || []),
    ...(plan?.lineBarcodes || []),
  ]) {
    addExact(barcodes, value);
    addToken(value);
  }
  for (const id of plan?.deleteItemIds || []) {
    addExact(itemIds, id);
    addToken(id);
  }
  for (const value of plan?.keptOnOtherTrip || []) addExact(keptBarcodes, value);

  return { tripNumber: trip, barcodes, itemIds, keptBarcodes, tokens };
}

function planExportCostClear(rows, keys) {
  const deleteIds = [];
  const trip = keys?.tripNumber || '';
  for (const row of rows || []) {
    if (!row?.id) continue;
    const subjectCleared = aliasesHit(row.subject_key, keys.barcodes) || aliasesHit(row.subject_key, keys.itemIds);
    const displayCleared = aliasesHit(row.display_barcode, keys.barcodes) || aliasesHit(row.display_barcode, keys.itemIds);
    const tripHit = Boolean(trip) && normalizeCode(row.trip_number) === trip;
    // 一行只记一个订单或一个包裹。对上这一车的单号、包装或车次号就整行删。
    // 车次号是空的，只要单号或包装条码对上，也删。不把车次号改成空再把成本留在财务里。
    if (subjectCleared || displayCleared || tripHit) deleteIds.push(row.id);
  }
  return { deleteIds };
}

function isRealExpress(value) {
  const text = String(value || '').trim();
  return Boolean(text) && text !== '—' && text !== '-' && text !== '–';
}

function labelKind(label) {
  const text = String(label || '').trim();
  const upper = text.toUpperCase();
  if (text === '车次' || text === 'ယာဉ်အမှတ်စဉ်' || upper === 'TRIP') return 'trip';
  if (text === '包装号' || text === 'ထုပ်အမှတ်' || text === 'ထုပ်ပိုးနံပါတ်' || upper === 'PACK NO.') return 'pack';
  if (text === '件数' || text === 'အရေအတွက်' || upper === 'PIECES') return 'pieces';
  return '';
}

function invoiceAnchor(row, doc, keys) {
  const trip = keys?.tripNumber || '';
  const anchoredTrip =
    Boolean(trip) &&
    (normalizeCode(row?.trip_label) === trip || normalizeCode(doc?.trip) === trip);
  const packAnchored = aliasesHit(doc?.packNo, keys.barcodes);
  let metaTrip = false;
  let metaPack = false;
  const meta = Array.isArray(doc?.meta) ? doc.meta : [];
  for (const item of meta) {
    if (!item || typeof item !== 'object') continue;
    if (trip && normalizeCode(item.value) === trip) metaTrip = true;
    if (aliasesHit(item.value, keys.barcodes)) metaPack = true;
  }
  return { anchoredTrip: anchoredTrip || metaTrip, packAnchored: packAnchored || metaPack };
}

function shouldDropExpress(value, anchored, keys) {
  if (aliasesHit(value, keys.keptBarcodes)) return false;
  if (aliasesHit(value, keys.barcodes) || aliasesHit(value, keys.itemIds)) return true;
  return anchored;
}

/**
 * 一张发票里混有多个订单时，只拿掉属于被清车次的单号。
 * 拿完没有任何订单号、也没有留下的货物 id，才删整张发票。
 * 定档金额是整张发票的合计，没有按订单拆开，部分保留时不改金额。
 */
function planSignedInvoiceClear(rows, keys) {
  const deleteIds = [];
  const updates = [];
  for (const row of rows || []) {
    if (!row?.id) continue;
    const doc =
      row.document && typeof row.document === 'object'
        ? JSON.parse(JSON.stringify(row.document))
        : {};
    const anchor = invoiceAnchor(row, doc, keys);
    const anchored = anchor.anchoredTrip || anchor.packAnchored;
    const lines = Array.isArray(doc.lines) ? doc.lines : [];
    const nextLines = [];
    let removedExpress = false;
    for (const line of lines) {
      const expressNos = Array.isArray(line?.expressNos) ? line.expressNos : [];
      const keptNos = [];
      for (const no of expressNos) {
        if (!isRealExpress(no)) continue;
        if (shouldDropExpress(no, anchored, keys)) {
          removedExpress = true;
          continue;
        }
        keptNos.push(no);
      }
      if (!keptNos.length) continue;
      nextLines.push({ ...line, expressNos: keptNos });
    }
    const originalIds = Array.isArray(row.item_ids) ? row.item_ids : [];
    const nextIds = originalIds.filter((id) => {
      const text = String(id || '').trim();
      return text && !aliasesHit(text, keys.itemIds);
    });
    const removedIds = nextIds.length !== originalIds.filter((id) => String(id || '').trim()).length;
    if (!anchored && !removedExpress && !removedIds) continue;
    const realCount = nextLines.reduce((sum, line) => sum + line.expressNos.length, 0);
    if (!realCount && !nextIds.length) {
      deleteIds.push(row.id);
      continue;
    }
    const pieceCount = realCount || nextIds.length;
    const meta = (Array.isArray(doc.meta) ? doc.meta : []).map((item) => {
      if (!item || typeof item !== 'object') return item;
      const kind = labelKind(item.label);
      if (kind === 'pieces') return { ...item, value: String(pieceCount) };
      if ((kind === 'trip' || normalizeCode(item.value) === keys.tripNumber) && anchor.anchoredTrip) {
        return { ...item, value: '' };
      }
      if (aliasesHit(item.value, keys.barcodes) && kind !== 'pieces') return { ...item, value: '' };
      return item;
    });
    const nextDoc = { ...doc, lines: nextLines, meta, pieceCount };
    if (anchor.anchoredTrip) nextDoc.trip = '';
    if (aliasesHit(doc.packNo, keys.barcodes)) nextDoc.packNo = '';
    updates.push({
      id: row.id,
      trip_label: anchor.anchoredTrip ? '' : String(row.trip_label || ''),
      piece_count: pieceCount,
      document: nextDoc,
      item_ids: nextIds,
    });
  }
  return { deleteIds, updates };
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasToken(text, token) {
  const needle = normalizeCode(token);
  if (!needle) return false;
  const upper = String(text || '').toUpperCase();
  const re = new RegExp(`(^|[^A-Z0-9])${escapeRegExp(needle)}(?=$|[^A-Z0-9])`);
  return re.test(upper);
}

function stripTokens(text, tokens) {
  let next = String(text || '');
  const sorted = (tokens || []).filter(Boolean).slice().sort((a, b) => String(b).length - String(a).length);
  for (const token of sorted) {
    const re = new RegExp(`(^|[^A-Za-z0-9])${escapeRegExp(token)}(?=$|[^A-Za-z0-9])`, 'gi');
    next = next.replace(re, '$1');
  }
  return next
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s*([,，、])\s*/g, '$1')
    .replace(/^[,，、\s]+|[,，、\s]+$/g, '')
    .trim();
}

function otherBusinessTokens(text, keys) {
  const found = [];
  const seen = new Set();
  const upper = String(text || '').toUpperCase();
  const tripRe = /(?:^|[^A-Z0-9])([A-Z]{3}[0-9]{4})(?=$|[^A-Z0-9])/g;
  let tripMatch;
  while ((tripMatch = tripRe.exec(upper))) {
    const code = tripMatch[1];
    if (!code || code === keys.tripNumber || seen.has(code)) continue;
    seen.add(code);
    found.push(code);
  }
  const tokenRe = /[A-Z0-9](?:[A-Z0-9-]{2,})[A-Z0-9]/g;
  const tokens = upper.match(tokenRe) || [];
  for (const token of tokens) {
    if (seen.has(token) || token === keys.tripNumber) continue;
    if (keys.barcodes.has(token) || keys.itemIds.has(token)) continue;
    if (keys.keptBarcodes.has(token)) {
      seen.add(token);
      found.push(token);
      continue;
    }
    if (/^(?=.*[A-Z])(?=.*[\d-])[A-Z0-9-]{4,}$/.test(token)) {
      seen.add(token);
      found.push(token);
    }
  }
  return found;
}

function planManualEntryClear(rows, keys) {
  const deleteIds = [];
  const updates = [];
  const tokens = keys?.tokens || [];
  for (const row of rows || []) {
    if (!row?.id) continue;
    const category = String(row.category || '');
    const note = String(row.note || '');
    const blob = `${category}\n${note}`;
    if (!tokens.some((token) => hasToken(blob, token))) continue;
    if (otherBusinessTokens(blob, keys).length) {
      const nextCategory = stripTokens(category, tokens);
      const nextNote = stripTokens(note, tokens);
      if (nextCategory === category.trim() && nextNote === note.trim()) continue;
      updates.push({ id: row.id, category: nextCategory, note: nextNote });
      continue;
    }
    deleteIds.push(row.id);
  }
  return { deleteIds, updates };
}

module.exports = {
  chunk,
  normalizeCode,
  parseTripNumber,
  planTripClear,
  buildTripClearKeys,
  planExportCostClear,
  planSignedInvoiceClear,
  planManualEntryClear,
};
