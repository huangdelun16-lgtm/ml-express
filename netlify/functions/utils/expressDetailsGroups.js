/**
 * 快递明细：包装壳（整包重量那一条）不出现。
 * 打进同一个包装号的订单合成一行，件数是订单条数。
 */

const PACKAGE_BARCODE_RE = /^([A-Z]{3})(\d{2})([A-Z]{3})(\d+)(\d{4})$/;
const LINE_BARCODE_RE = /^(.+)\((\d+)-(\d+)\)$/;
const STATUS_RANK = {
  pending: 0,
  inbound: 1,
  packed: 2,
  arrived: 3,
  transferred: 4,
  signed: 5,
};

function text(value) {
  return String(value ?? '').trim();
}

function isPackageBarcode(barcode) {
  return PACKAGE_BARCODE_RE.test(text(barcode).toUpperCase());
}

/** 多个入库的件条码，如 MSE092715041126(2-1)。total < 2 不当成一组。 */
function parsePackagingLine(barcode) {
  const match = text(barcode).toUpperCase().match(LINE_BARCODE_RE);
  if (!match) return null;
  const total = Number(match[2]);
  const index = Number(match[3]);
  if (!Number.isFinite(total) || !Number.isFinite(index) || total < 2 || index < 1 || index > total) {
    return null;
  }
  return { base: match[1], total, index };
}

function expressItemStatus(row) {
  if (row.customer_signed_at) return 'signed';
  if (row.hub_transit_shipped_at) return 'transferred';
  if (row.hub_arrived_at) return 'arrived';
  if (row.packed_at || text(row.packed_bundle_barcode)) return 'packed';
  if (Number(row.qty_on_hand) > 0) return 'inbound';
  return 'pending';
}

function leastStatus(rows) {
  let chosen = 'pending';
  let rank = 99;
  for (const row of rows) {
    const status = expressItemStatus(row);
    const next = STATUS_RANK[status] ?? 0;
    if (next < rank) {
      rank = next;
      chosen = status;
    }
  }
  return chosen;
}

function newest(rows) {
  return rows.slice().sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')))[0];
}

function weightKg(value) {
  const match = text(value).replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  const n = match ? Number(match[1]) : 0;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** 各行重量相加。没有重量的行跳过。 */
function totalWeightLabel(rows) {
  let sum = 0;
  let any = false;
  for (const row of rows) {
    const kg = weightKg(row.weight);
    if (!(kg > 0)) continue;
    sum += kg;
    any = true;
  }
  if (!any) return '';
  const rounded = Math.round(sum * 1000) / 1000;
  return `${rounded.toFixed(3).replace(/\.?0+$/, '')} Kg`;
}

function uniqueLines(values) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const next = text(value);
    const key = next.toUpperCase();
    if (!next || seen.has(key)) continue;
    seen.add(key);
    out.push(next);
  }
  return out;
}

function packOf(row, packByItemBarcode) {
  const code = text(row.barcode).toUpperCase();
  return text(row.packed_bundle_barcode).toUpperCase() || text(packByItemBarcode.get(code) || '').toUpperCase();
}

/** 同一包装号的件，和还没写上包装号、但条码是 (2-1)(2-2) 的件，归到一组。 */
function inheritPackWithinBase(rows, packByItemBarcode) {
  const map = new Map(packByItemBarcode || []);
  const byBase = new Map();
  for (const row of rows) {
    const parsed = parsePackagingLine(row.barcode);
    if (!parsed) continue;
    const list = byBase.get(parsed.base) || [];
    list.push(row);
    byBase.set(parsed.base, list);
  }
  for (const list of byBase.values()) {
    const pack = list.map((row) => packOf(row, map)).find((code) => isPackageBarcode(code));
    if (!pack) continue;
    for (const row of list) {
      const code = text(row.barcode).toUpperCase();
      if (!map.get(code)) map.set(code, pack);
    }
  }
  return map;
}

function groupKey(row, packByItemBarcode) {
  const code = text(row.barcode).toUpperCase();
  if (isPackageBarcode(code)) return `pack:${code}`;
  const linked = packOf(row, packByItemBarcode);
  if (isPackageBarcode(linked)) return `pack:${linked}`;
  const parsed = parsePackagingLine(code);
  if (parsed) return `base:${parsed.base}`;
  return '';
}

function mapExpressItem(row, exceptionStatus) {
  const pack = text(row.packed_bundle_barcode);
  return {
    id: row.id,
    customerName: text(row.recipient_name),
    productName: text(row.name),
    expressBarcode: text(row.input_barcode),
    inboundBarcode: text(row.barcode),
    destination: text(row.final_destination),
    spec: text(row.spec),
    unit: text(row.unit),
    weight: text(row.weight),
    qty: Number(row.qty_on_hand) || 0,
    status: expressItemStatus(row),
    packed: Boolean(row.packed_at || pack),
    packBarcode: pack,
    ownerStoreCode: text(row.owner_store_code),
    note: text(row.note),
    inboundAt: row.created_at || '',
    updatedAt: row.updated_at || '',
    arrivedAt: row.hub_arrived_at || '',
    signedAt: row.customer_signed_at || '',
    exceptionStatus: exceptionStatus || '',
    memberIds: [row.id],
  };
}

function groupWeightLabel(lines, shells) {
  return totalWeightLabel(lines) || totalWeightLabel(shells || []);
}

function mapExpressGroup(lines, packBarcode, exceptionStatus, shells) {
  const ordered = lines.slice().sort((a, b) => {
    const left = parsePackagingLine(a.barcode);
    const right = parsePackagingLine(b.barcode);
    if (left && right && left.index !== right.index) return left.index - right.index;
    return text(a.barcode).localeCompare(text(b.barcode));
  });
  const first = ordered[0];
  const pack = text(packBarcode).toUpperCase();
  const signedAt = ordered.every((row) => row.customer_signed_at)
    ? ordered.map((row) => row.customer_signed_at).filter(Boolean).sort().slice(-1)[0] || ''
    : '';
  return {
    id: first.id,
    customerName: ordered.map((row) => text(row.recipient_name)).find(Boolean) || '',
    productName: uniqueLines(ordered.map((row) => row.name)).join('\n'),
    expressBarcode: uniqueLines(ordered.map((row) => row.input_barcode)).join('\n'),
    inboundBarcode: uniqueLines(ordered.map((row) => row.barcode)).join('\n'),
    destination: ordered.map((row) => text(row.final_destination)).find(Boolean) || '',
    spec: ordered.map((row) => text(row.spec)).find(Boolean) || '',
    unit: ordered.map((row) => text(row.unit)).find(Boolean) || '',
    weight: groupWeightLabel(ordered, shells),
    qty: ordered.length,
    status: leastStatus(ordered),
    packed: Boolean(pack) || ordered.some((row) => row.packed_at || text(row.packed_bundle_barcode)),
    packBarcode: pack,
    ownerStoreCode: ordered.map((row) => text(row.owner_store_code)).find(Boolean) || '',
    note: ordered.map((row) => text(row.note)).find(Boolean) || '',
    inboundAt: ordered.map((row) => row.created_at).find(Boolean) || '',
    updatedAt: newest(ordered).updated_at || '',
    arrivedAt: ordered.map((row) => row.hub_arrived_at).find(Boolean) || '',
    signedAt,
    exceptionStatus: exceptionStatus || '',
    memberIds: ordered.map((row) => row.id),
  };
}

function exceptionOf(rows, exceptionStatus) {
  if (rows.some((row) => exceptionStatus(row) === 'open')) return 'open';
  if (rows.some((row) => exceptionStatus(row) === 'resolved')) return 'resolved';
  return '';
}

/**
 * pageRows 是当前这一页的原始库存行。
 * relatedRows 是同包装号的其他订单，用来把跨页的件补全。
 * 包装壳不输出。一组只出现在「最新那条所在的页」上，避免翻页重复。
 */
function collapseExpressList({ pageRows, relatedRows, packByItemBarcode, exceptionStatus, searching }) {
  const pageIds = new Set((pageRows || []).map((row) => row.id));
  const pool = [];
  const seen = new Set();
  for (const row of [...(pageRows || []), ...(relatedRows || [])]) {
    if (!row || seen.has(row.id)) continue;
    seen.add(row.id);
    pool.push(row);
  }
  const packMap = inheritPackWithinBase(pool, packByItemBarcode);
  const groups = new Map();
  for (const row of pool) {
    const key = groupKey(row, packMap);
    if (!key) continue;
    const list = groups.get(key) || [];
    list.push(row);
    groups.set(key, list);
  }

  const emitted = [];
  const emittedKeys = new Set();
  for (const row of pageRows || []) {
    const key = groupKey(row, packMap);
    if (!key) {
      if (isPackageBarcode(row.barcode)) continue;
      const mapped = mapExpressItem(row, exceptionStatus(row));
      const pack = packOf(row, packMap);
      if (isPackageBarcode(pack)) {
        mapped.packBarcode = pack;
        mapped.packed = true;
      }
      emitted.push(mapped);
      continue;
    }
    if (emittedKeys.has(key)) continue;
    const members = groups.get(key) || [row];
    const lines = members.filter((item) => !isPackageBarcode(item.barcode));
    if (!lines.length) continue;
    const onPage = searching
      ? members.some((item) => pageIds.has(item.id))
      : pageIds.has(newest(members).id);
    if (!onPage) continue;
    emittedKeys.add(key);
    const pack = key.startsWith('pack:')
      ? key.slice(5)
      : lines.map((item) => packOf(item, packMap)).find((code) => isPackageBarcode(code)) || '';
    const shells = members.filter((item) => isPackageBarcode(item.barcode));
    emitted.push(mapExpressGroup(lines, pack, exceptionOf(lines, exceptionStatus), shells));
  }
  return emitted;
}

function expressDetailSubject(subject, relatedRows, packByItemBarcode) {
  const pool = [subject, ...(relatedRows || [])].filter(Boolean);
  const packMap = inheritPackWithinBase(pool, packByItemBarcode);
  const key = groupKey(subject, packMap);
  if (!key) {
    const pack = packOf(subject, packMap);
    return {
      lines: isPackageBarcode(subject.barcode) ? [] : [subject],
      packBarcode: isPackageBarcode(pack) ? pack : text(subject.packed_bundle_barcode).toUpperCase(),
    };
  }
  const members = pool.filter((row) => groupKey(row, packMap) === key);
  const lines = members.filter((row) => !isPackageBarcode(row.barcode));
  const shells = members.filter((row) => isPackageBarcode(row.barcode));
  const pack = key.startsWith('pack:')
    ? key.slice(5)
    : lines.map((row) => packOf(row, packMap)).find((code) => isPackageBarcode(code)) || '';
  return { lines, shells, packBarcode: pack };
}

function codesOf(rows) {
  return [...new Set(rows.map((row) => text(row.barcode).toUpperCase()).filter(Boolean))];
}

/**
 * 补齐同一包装里的其他订单，以及件条码 → 包装号。
 * io 由本地代理和 Netlify 函数各自接数据库。
 */
async function loadExpressGroupContext(pageRows, io) {
  const rows = pageRows || [];
  const codes = codesOf(rows);
  const shells = codes.filter(isPackageBarcode);
  const lines = codes.filter((code) => !isPackageBarcode(code));
  const packByItemBarcode = new Map();
  for (const row of rows) {
    const linked = text(row.packed_bundle_barcode).toUpperCase();
    const code = text(row.barcode).toUpperCase();
    if (code && isPackageBarcode(linked)) packByItemBarcode.set(code, linked);
  }

  const itemLinks = lines.length ? await io.shipmentItemsByBarcode(lines) : [];
  const shellPacks = shells.length ? await io.shipmentsByBarcode(shells) : [];
  const packIds = [...new Set([
    ...itemLinks.map((row) => row.pack_id),
    ...shellPacks.map((row) => row.id),
  ].filter(Boolean))];
  const packs = packIds.length ? await io.shipmentsById(packIds) : [];
  const bundleById = new Map(packs.map((row) => [row.id, text(row.bundle_barcode).toUpperCase()]));
  for (const row of shellPacks) {
    if (!bundleById.has(row.id)) bundleById.set(row.id, text(row.bundle_barcode).toUpperCase());
  }

  const packItemLinks = [...shellPacks.map((row) => row.id), ...itemLinks.map((row) => row.pack_id)]
    .filter(Boolean);
  const uniquePackIds = [...new Set(packItemLinks)];
  const packItems = uniquePackIds.length ? await io.shipmentItemsByPack(uniquePackIds) : [];
  for (const link of [...itemLinks, ...packItems]) {
    const bundle = bundleById.get(link.pack_id);
    const code = text(link.item_barcode).toUpperCase();
    if (code && isPackageBarcode(bundle)) packByItemBarcode.set(code, bundle);
  }

  const known = new Set(codes);
  const extraCodes = [...packByItemBarcode.keys()].filter((code) => !known.has(code));
  for (const link of packItems) {
    const code = text(link.item_barcode).toUpperCase();
    if (code && !known.has(code)) extraCodes.push(code);
  }
  const related = [];
  const seen = new Set(rows.map((row) => row.id));
  const add = (list) => {
    for (const row of list || []) {
      if (!row || seen.has(row.id)) continue;
      seen.add(row.id);
      related.push(row);
    }
  };
  if (extraCodes.length) add(await io.itemsByBarcode([...new Set(extraCodes)]));

  const bases = [...new Set(rows.concat(related).map((row) => parsePackagingLine(row.barcode)?.base).filter(Boolean))];
  for (const base of bases) add(await io.itemsLikeBase(base));

  const missing = rows.concat(related).filter((row) => {
    const code = text(row.barcode).toUpperCase();
    return parsePackagingLine(code) && !isPackageBarcode(packOf(row, packByItemBarcode));
  });
  if (missing.length) {
    const notes = await io.packNotes(missing.map((row) => row.id));
    const idToBarcode = new Map(missing.map((row) => [row.id, text(row.barcode).toUpperCase()]));
    for (const noteRow of notes || []) {
      const match = text(noteRow.note).toUpperCase().match(/打包入\s+([A-Z0-9]+)/);
      const barcode = idToBarcode.get(noteRow.item_id);
      if (barcode && match && isPackageBarcode(match[1])) packByItemBarcode.set(barcode, match[1]);
    }
  }

  const have = new Set(codesOf(rows.concat(related)));
  const shellCodes = [...new Set(
    [...packByItemBarcode.values(), ...bundleById.values()].map((code) => text(code).toUpperCase()),
  )].filter((code) => isPackageBarcode(code) && !have.has(code));
  if (shellCodes.length) add(await io.itemsByBarcode(shellCodes));

  return { relatedRows: related, packByItemBarcode };
}

module.exports = {
  text,
  isPackageBarcode,
  parsePackagingLine,
  mapExpressItem,
  mapExpressGroup,
  collapseExpressList,
  expressDetailSubject,
  loadExpressGroupContext,
};
