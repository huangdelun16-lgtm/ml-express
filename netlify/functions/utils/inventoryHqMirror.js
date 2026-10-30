/**
 * 管理端总览和出口成本待填清单，口径跟库存 App 首页待办、出口成本窗口一致。
 */

const LOCKED_PACK_STATUSES = new Set(['in_transit', 'hub_received', 'completed', 'split_at_hub']);
const PACKAGE_BARCODE_RE = /^([A-Z]{3})(\d{2})([A-Z]{3})(\d+)(\d{4})$/;
const LINE_BARCODE_RE = /^(.+)\((\d+)-(\d+)\)$/;

function text(value) {
  return String(value ?? '').trim();
}

function parseWeightKg(value) {
  const match = text(value).replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  const n = match ? Number(match[1]) : 0;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function isPackageBarcode(barcode) {
  return PACKAGE_BARCODE_RE.test(text(barcode).toUpperCase());
}

function parsePackagingLine(barcode) {
  const match = text(barcode).match(LINE_BARCODE_RE);
  if (!match) return null;
  const total = Number(match[2]);
  const index = Number(match[3]);
  if (!Number.isFinite(total) || !Number.isFinite(index) || total < 1 || index < 1 || index > total) {
    return null;
  }
  return { base: match[1], total, index };
}

function isStockedIn(row) {
  return (
    Number(row.qty_on_hand) > 0 ||
    Boolean(text(row.hub_arrived_at)) ||
    Boolean(text(row.packed_at)) ||
    Boolean(text(row.packed_bundle_barcode)) ||
    Boolean(text(row.customer_signed_at)) ||
    Boolean(text(row.hub_transit_released_at))
  );
}

function isPendingPackItem(row) {
  const barcode = text(row.barcode);
  if (!barcode || isPackageBarcode(barcode)) return false;
  if (!(Number(row.qty_on_hand) > 0)) return false;
  if (text(row.packed_at)) return false;
  if (text(row.packed_bundle_barcode)) return false;
  return true;
}

function countPendingPackItems(rows) {
  return rows.filter(isPendingPackItem).length;
}

function countPendingTruckLoads(packs) {
  return packs.filter((pack) => {
    if (text(pack.loaded_at)) return false;
    const status = text(pack.cloud_status);
    if (status && LOCKED_PACK_STATUSES.has(status)) return false;
    return true;
  }).length;
}

function countPendingNotify(rows) {
  return rows.filter((row) => {
    if (isPackageBarcode(row.barcode)) return false;
    if (!text(row.hub_arrived_at)) return false;
    if (text(row.customer_signed_at)) return false;
    if (text(row.arrival_notified_at)) return false;
    return true;
  }).length;
}

function lookupMap(keys, map) {
  if (!map) return '';
  for (const key of keys) {
    const code = text(key).toUpperCase();
    if (!code) continue;
    const value = map.get(code);
    if (value) return value;
  }
  return '';
}

function buildPendingExportBoard(items, options = {}) {
  const pending = items.filter((row) => isStockedIn(row) && !isPackageBarcode(row.barcode));
  const bases = new Set();
  for (const row of pending) {
    const parsed = parsePackagingLine(row.barcode);
    if (parsed) bases.add(parsed.base.trim().toUpperCase());
  }

  const singles = [];
  const groups = new Map();
  for (const row of pending) {
    const parsed = parsePackagingLine(row.barcode);
    if (parsed) {
      const key = parsed.base.trim().toUpperCase();
      const list = groups.get(key) || [];
      list.push(row);
      groups.set(key, list);
      continue;
    }
    const code = text(row.barcode).toUpperCase();
    if (code && bases.has(code)) continue;
    singles.push({
      id: text(row.id),
      barcode: text(row.input_barcode) || text(row.barcode),
      customer: text(row.recipient_name),
      destination: text(row.final_destination),
      weightKg: parseWeightKg(row.weight),
      tripNumber: lookupMap(
        [row.barcode, row.packed_bundle_barcode, `id:${row.id}`],
        options.tripByBarcode,
      ),
      ownerStoreCode: text(row.owner_store_code).toUpperCase(),
    });
  }

  const packages = [];
  for (const [base, rows] of groups) {
    const parsed = parsePackagingLine(rows[0]?.barcode || '');
    const pieceWeight = rows.reduce((sum, row) => sum + parseWeightKg(row.weight), 0);
    const packWeight = Number(lookupMap([base, parsed?.base], options.packageWeightKg)) || 0;
    packages.push({
      base: parsed?.base || base,
      customer: rows.map((row) => text(row.recipient_name)).find(Boolean) || '',
      destination: rows.map((row) => text(row.final_destination)).find(Boolean) || '',
      pieceCount: rows.length,
      weightKg: packWeight > 0 ? packWeight : pieceWeight,
      tripNumber: lookupMap(
        [base, ...rows.flatMap((row) => [row.barcode, row.packed_bundle_barcode, `id:${row.id}`])],
        options.tripByBarcode,
      ),
      ownerStoreCode: rows.map((row) => text(row.owner_store_code).toUpperCase()).find(Boolean) || '',
    });
  }

  singles.sort((a, b) => a.barcode.localeCompare(b.barcode));
  packages.sort((a, b) => a.base.localeCompare(b.base));
  return { singles, packages };
}

function withoutSavedExportCosts(board, saved) {
  const singles = new Set();
  const packages = new Set();
  for (const row of saved || []) {
    const key = text(row.subject_key || row.subjectKey);
    const kind = text(row.subject_kind || row.subjectKind);
    if (!key) continue;
    if (kind === 'single') singles.add(key);
    if (kind === 'package') packages.add(key.toUpperCase());
  }
  return {
    singles: board.singles.filter((row) => !singles.has(text(row.id))),
    packages: board.packages.filter((row) => !packages.has(text(row.base).toUpperCase())),
  };
}

async function fetchPages(supabase, table, select, apply) {
  const pageSize = 500;
  const rows = [];
  for (let page = 0; page < 30; page += 1) {
    const from = page * pageSize;
    let query = supabase.from(table).select(select).range(from, from + pageSize - 1);
    if (apply) query = apply(query);
    const { data, error } = await query;
    if (error) throw error;
    const batch = data || [];
    rows.push(...batch);
    if (batch.length < pageSize) return rows;
  }
  return rows;
}

async function loadHqTodoCounts(supabase) {
  const counts = { pendingPack: 0, pendingTruckLoad: 0, pendingNotify: 0 };
  try {
    const items = await fetchPages(
      supabase,
      'inventory_store_items',
      'barcode, qty_on_hand, packed_at, packed_bundle_barcode',
      (query) => query.gt('qty_on_hand', 0),
    );
    counts.pendingPack = countPendingPackItems(items);
  } catch (error) {
    console.warn('hq todo pack count skipped', error?.message || error);
  }

  try {
    const packs = await fetchPages(
      supabase,
      'inventory_packed_shipments',
      'bundle_barcode, loaded_at',
      (query) => query.is('loaded_at', null),
    );
    const barcodes = packs.map((row) => text(row.bundle_barcode).toUpperCase()).filter(Boolean);
    const statusByBarcode = new Map();
    for (let i = 0; i < barcodes.length; i += 80) {
      const chunk = barcodes.slice(i, i + 80);
      if (!chunk.length) continue;
      const { data, error } = await supabase
        .from('inventory_pkg_tracking')
        .select('pack_barcode, status')
        .in('pack_barcode', chunk);
      if (error) throw error;
      for (const row of data || []) {
        statusByBarcode.set(text(row.pack_barcode).toUpperCase(), text(row.status));
      }
    }
    counts.pendingTruckLoad = countPendingTruckLoads(
      packs.map((row) => ({
        loaded_at: row.loaded_at,
        cloud_status: statusByBarcode.get(text(row.bundle_barcode).toUpperCase()) || '',
      })),
    );
  } catch (error) {
    console.warn('hq todo truck count skipped', error?.message || error);
  }

  try {
    let rows;
    try {
      rows = await fetchPages(
        supabase,
        'inventory_store_items',
        'barcode, hub_arrived_at, customer_signed_at, arrival_notified_at',
        (query) => query.not('hub_arrived_at', 'is', null).is('customer_signed_at', null),
      );
    } catch (error) {
      if (!/arrival_notified_at/i.test(String(error?.message || error))) throw error;
      rows = await fetchPages(
        supabase,
        'inventory_store_items',
        'barcode, hub_arrived_at, customer_signed_at',
        (query) => query.not('hub_arrived_at', 'is', null).is('customer_signed_at', null),
      );
    }
    counts.pendingNotify = countPendingNotify(rows);
  } catch (error) {
    console.warn('hq todo notify count skipped', error?.message || error);
  }

  return counts;
}

async function loadPendingExportCosts(supabase) {
  const itemSelect =
    'id, barcode, input_barcode, recipient_name, final_destination, weight, qty_on_hand, packed_at, packed_bundle_barcode, hub_arrived_at, customer_signed_at, hub_transit_released_at, owner_store_code';
  const items = await fetchPages(supabase, 'inventory_store_items', itemSelect);
  const trips = await fetchPages(
    supabase,
    'inventory_pkg_tracking',
    'pack_barcode, trip_number, total_weight',
    (query) => query.not('truck_loaded_at', 'is', null),
  );
  let saved = [];
  const savedResult = await supabase.from('inventory_export_costs').select('subject_kind, subject_key');
  if (!savedResult.error) saved = savedResult.data || [];

  const tripByBarcode = new Map();
  const packageWeightKg = new Map();
  for (const row of trips) {
    const code = text(row.pack_barcode).toUpperCase();
    const trip = text(row.trip_number).toUpperCase();
    if (code && trip) tripByBarcode.set(code, trip);
    const kg = parseWeightKg(row.total_weight);
    if (code && kg > 0) packageWeightKg.set(code, kg);
  }
  for (const row of items) {
    if (!isPackageBarcode(row.barcode)) continue;
    const kg = parseWeightKg(row.weight);
    if (kg > 0) packageWeightKg.set(text(row.barcode).toUpperCase(), kg);
  }

  const board = withoutSavedExportCosts(
    buildPendingExportBoard(items, { tripByBarcode, packageWeightKg }),
    saved,
  );
  const limit = 400;
  return {
    singles: board.singles.slice(0, limit),
    packages: board.packages.slice(0, limit),
    singleCount: board.singles.length,
    packageCount: board.packages.length,
    truncated: board.singles.length > limit || board.packages.length > limit,
  };
}

const QUEUE_PAGE_SIZE = 50;

function sliceQueuePage(rows, query) {
  const pageSize = Math.min(Math.max(parseInt(query?.pageSize, 10) || QUEUE_PAGE_SIZE, 1), 100);
  const page = Math.max(parseInt(query?.page, 10) || 1, 1);
  const storeCode = text(query?.storeCode).toUpperCase();
  const filtered = storeCode ? rows.filter((row) => text(row.storeCode).toUpperCase() === storeCode) : rows;
  const start = (page - 1) * pageSize;
  return {
    total: filtered.length,
    page,
    pageSize,
    truncated: false,
    rows: filtered.slice(start, start + pageSize),
  };
}

async function loadHqQueue(supabase, query) {
  const params = query && typeof query === 'object' ? query : { queue: query };
  const kind = text(params.queue);
  if (kind === 'pack') {
    const items = await fetchPages(
      supabase,
      'inventory_store_items',
      'barcode, input_barcode, recipient_name, final_destination, weight, qty_on_hand, packed_at, packed_bundle_barcode, owner_store_code',
      (query) => query.gt('qty_on_hand', 0),
    );
    const rows = items.filter(isPendingPackItem).map((row) => ({
      barcode: text(row.barcode),
      expressNo: text(row.input_barcode),
      customer: text(row.recipient_name),
      destination: text(row.final_destination),
      weightKg: parseWeightKg(row.weight),
      qty: Number(row.qty_on_hand) || 0,
      storeCode: text(row.owner_store_code).toUpperCase(),
    }));
    const page = sliceQueuePage(rows, params);
    return { queue: 'pack', ...page };
  }

  if (kind === 'truck') {
    const packs = await fetchPages(
      supabase,
      'inventory_packed_shipments',
      'bundle_barcode, bundle_name, loaded_at, truck_leg_destination, owner_store_code',
      (query) => query.is('loaded_at', null),
    );
    const barcodes = packs.map((row) => text(row.bundle_barcode).toUpperCase()).filter(Boolean);
    const statusByBarcode = new Map();
    for (let i = 0; i < barcodes.length; i += 80) {
      const chunk = barcodes.slice(i, i + 80);
      if (!chunk.length) continue;
      const { data, error } = await supabase
        .from('inventory_pkg_tracking')
        .select('pack_barcode, status')
        .in('pack_barcode', chunk);
      if (error) throw error;
      for (const row of data || []) {
        statusByBarcode.set(text(row.pack_barcode).toUpperCase(), text(row.status));
      }
    }
    const rows = packs
      .filter((row) =>
        countPendingTruckLoads([
          {
            loaded_at: row.loaded_at,
            cloud_status: statusByBarcode.get(text(row.bundle_barcode).toUpperCase()) || '',
          },
        ]) === 1,
      )
      .map((row) => ({
        barcode: text(row.bundle_barcode),
        name: text(row.bundle_name),
        destination: text(row.truck_leg_destination).toUpperCase(),
        storeCode: text(row.owner_store_code).toUpperCase(),
      }));
    const page = sliceQueuePage(rows, params);
    return { queue: 'truck', ...page };
  }

  if (kind === 'notify') {
    let items;
    try {
      items = await fetchPages(
        supabase,
        'inventory_store_items',
        'barcode, input_barcode, recipient_name, final_destination, hub_arrived_at, customer_signed_at, arrival_notified_at, owner_store_code',
        (query) => query.not('hub_arrived_at', 'is', null).is('customer_signed_at', null),
      );
    } catch (error) {
      if (!/arrival_notified_at/i.test(String(error?.message || error))) throw error;
      items = await fetchPages(
        supabase,
        'inventory_store_items',
        'barcode, input_barcode, recipient_name, final_destination, hub_arrived_at, customer_signed_at, owner_store_code',
        (query) => query.not('hub_arrived_at', 'is', null).is('customer_signed_at', null),
      );
    }
    const rows = items.filter((row) => countPendingNotify([row]) === 1).map((row) => ({
      barcode: text(row.barcode),
      expressNo: text(row.input_barcode),
      customer: text(row.recipient_name),
      destination: text(row.final_destination),
      arrivedAt: text(row.hub_arrived_at),
      storeCode: text(row.owner_store_code).toUpperCase(),
    }));
    const page = sliceQueuePage(rows, params);
    return { queue: 'notify', ...page };
  }

  throw new Error('未知待办');
}

function settleAdminExportCost(input) {
  const kind = text(input.subjectKind).toLowerCase();
  const key = kind === 'package' ? text(input.subjectKey).toUpperCase() : text(input.subjectKey);
  const dest = text(input.legDestination).toUpperCase();
  const currency = text(input.payCurrency).toUpperCase();
  const weight = Number(input.weightKg);
  const unit = Number(input.unitPriceCny);
  const rate = Number(input.mmkPerCny);
  if (kind !== 'single' && kind !== 'package') throw new Error('请选择单个或包裹');
  if (!key || key.length > 80) throw new Error('缺少订单');
  if (dest !== 'MSE' && dest !== 'LSO') throw new Error('运达站只能是木姐或腊戌');
  if (!(weight > 0) || weight > 100000) throw new Error('缺少重量，无法保存');
  if (!(unit > 0) || unit > 1000000) throw new Error('请填写每公斤人民币单价');
  if (currency !== 'CNY' && currency !== 'MMK') throw new Error('请选择人民币或缅币');
  const quote = Math.round(weight * unit * 100) / 100;
  if (!(quote > 0)) throw new Error('请填写每公斤人民币单价');
  let totalCny = 0;
  let totalMmk = 0;
  let fx = null;
  if (currency === 'MMK') {
    if (!(rate > 0) || rate > 1000000) throw new Error('缅币结算需要填写汇率');
    totalMmk = Math.round(quote * rate);
    if (!(totalMmk > 0)) throw new Error('缅币结算需要填写汇率');
    fx = rate;
  } else {
    totalCny = quote;
  }
  return {
    subject_kind: kind,
    subject_key: key,
    display_barcode: text(input.displayBarcode).slice(0, 80),
    customer_name: text(input.customerName).slice(0, 120),
    final_destination: text(input.finalDestination).slice(0, 40),
    leg_origin: 'RUI',
    leg_destination: dest,
    weight_kg: weight,
    unit_price_cny: Math.round(unit * 100) / 100,
    total_cny: totalCny,
    pay_currency: currency,
    fx_mmk_per_cny: fx,
    total_mmk: totalMmk,
    trip_number: text(input.tripNumber).toUpperCase().slice(0, 40),
    store_code: text(input.storeCode).toUpperCase().slice(0, 40) || 'HQ',
    created_by: text(input.createdBy).slice(0, 80) || 'admin',
  };
}

module.exports = {
  buildPendingExportBoard,
  withoutSavedExportCosts,
  countPendingPackItems,
  countPendingTruckLoads,
  countPendingNotify,
  loadHqTodoCounts,
  loadPendingExportCosts,
  loadHqQueue,
  settleAdminExportCost,
};
