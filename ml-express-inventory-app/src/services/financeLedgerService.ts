import { getHubTransportFeePaidBarcodeSet } from './hubTransportFeeService';
import type { InventoryStoreSession } from './authService';
import { getDatabase } from './database';
import { listInboundPackages, listOutboundPackagesFromOrigin } from './trackingService';
import { isSupabaseConfigured, supabase } from './supabase';
import type { FinanceLedgerEntry, FinanceLedgerResult, FinanceLedgerSummary } from '../types/financeLedger';
import type { StockMovement } from '../types/inventory';
import { destinationCodesMatch, normalizeDestinationCode } from '../utils/destinationCode';
import { parseInboundMovementNote } from '../utils/inboundMovementNote';
import { parseTransportFeeFromLoadNote } from '../utils/truckRouteFee';
import {
  isAdminStore,
  ownershipKeyFromStoreCode,
  ownershipLabelFromKey,
} from '../utils/storeOwnership';
import {
  buildCrossBorderFinanceSummary,
  buildStationReconciliationSummary,
} from '../utils/stationReconciliation';

function parseAmount(raw: string | undefined | null): number {
  if (!raw?.trim()) return 0;
  const n = Number(raw.replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function formatMmk(amount: number): string {
  if (amount <= 0) return '0 MMK';
  return `${amount % 1 === 0 ? amount : amount.toFixed(2)} MMK`;
}

function movementRowToPartial(row: Record<string, unknown>): StockMovement {
  return {
    id: String(row.id),
    item_id: String(row.item_id),
    barcode: String(row.barcode),
    item_name: String(row.item_name),
    type: row.type as StockMovement['type'],
    qty: Number(row.qty) || 0,
    qty_before: Number(row.qty_before) || 0,
    qty_after: Number(row.qty_after) || 0,
    operator: String(row.operator),
    note: String(row.note ?? ''),
    recipient_name: String(row.recipient_name ?? ''),
    recipient_phone: String(row.recipient_phone ?? ''),
    destination: String(row.destination ?? ''),
    detail_address: String(row.detail_address ?? ''),
    packaging: String(row.packaging ?? ''),
    input_barcode: String(row.input_barcode ?? ''),
    origin_store_id: String(row.origin_store_id ?? ''),
    origin_store_code: String(row.origin_store_code ?? ''),
    origin_store_name: String(row.origin_store_name ?? ''),
    created_at: String(row.created_at),
  };
}

function isCrossStationInbound(
  movement: StockMovement,
  finalDestination: string,
  currentStore: InventoryStoreSession,
  hubCode: string,
): boolean {
  const dest = finalDestination.trim() || movement.destination.trim();
  if (!destinationCodesMatch(dest, hubCode)) return false;

  const currentKey = ownershipKeyFromStoreCode(currentStore.storeCode);
  const originKey = movement.origin_store_code.trim()
    ? ownershipKeyFromStoreCode(movement.origin_store_code)
    : '';

  if (originKey && originKey !== currentKey) return true;

  if (isAdminStore(currentStore)) {
    return Boolean(originKey && originKey !== normalizeDestinationCode(hubCode));
  }
  return false;
}

function buildOrderLedgerEntry(params: {
  movement: StockMovement;
  finalDestination: string;
  customerSigned: boolean;
  customerName: string;
}): FinanceLedgerEntry | null {
  const parsed = parseInboundMovementNote(params.movement.note);
  const fee = parseAmount(parsed.totalFee);
  const payment = parsed.paymentLabel ?? '';
  const dest = params.finalDestination || params.movement.destination;
  const originLabel =
    params.movement.origin_store_name.trim() ||
    ownershipLabelFromKey(ownershipKeyFromStoreCode(params.movement.origin_store_code));

  const originKey = ownershipKeyFromStoreCode(params.movement.origin_store_code);

  const customer = params.customerName.trim() || params.movement.recipient_name.trim() || '未登记客户';

  if (payment === '预付') {
    return {
      id: `order:prepaid:${params.movement.id}`,
      category: 'order_prepaid',
      title: '订单 · 已付款',
      subtitle: `${customer} · ${originLabel} → ${dest} · 预付`,
      amount: fee,
      amountDisplay: fee > 0 ? `已付款 · ${formatMmk(fee)}` : '已付款',
      occurredAt: params.movement.created_at,
      barcode: params.movement.barcode,
      itemName: params.movement.item_name,
      destination: dest,
      originLabel,
      originKey,
    };
  }

  if (payment === '到付') {
    if (params.customerSigned) {
      return {
        id: `order:collected:${params.movement.id}`,
        category: 'order_collected',
        title: '订单收入 · 已签收收款',
        subtitle: `${customer} · ${originLabel} → ${dest} · 到付`,
        amount: fee,
        amountDisplay: fee > 0 ? `+${formatMmk(fee)}` : '已收款',
        occurredAt: params.movement.created_at,
        barcode: params.movement.barcode,
        itemName: params.movement.item_name,
        destination: dest,
        originLabel,
        originKey,
      };
    }
    return {
      id: `order:cod:${params.movement.id}`,
      category: 'order_income_cod',
      title: '订单收入 · 到付待收',
      subtitle: `${customer} · ${originLabel} → ${dest}`,
      amount: fee,
      amountDisplay: fee > 0 ? `+${formatMmk(fee)}` : '到付待收',
      occurredAt: params.movement.created_at,
      barcode: params.movement.barcode,
      itemName: params.movement.item_name,
      destination: dest,
      originLabel,
      originKey,
    };
  }

  if (fee > 0 && dest) {
    return {
      id: `order:fee:${params.movement.id}`,
      category: 'order_income_cod',
      title: '订单费用',
      subtitle: `${customer} · ${originLabel} → ${dest}`,
      amount: fee,
      amountDisplay: `+${formatMmk(fee)}`,
      occurredAt: params.movement.created_at,
      barcode: params.movement.barcode,
      itemName: params.movement.item_name,
      destination: dest,
      originLabel,
      originKey,
    };
  }

  return null;
}

function buildLocalOriginInboundEntry(
  movement: StockMovement,
  currentStore: InventoryStoreSession,
): FinanceLedgerEntry | null {
  const currentKey = ownershipKeyFromStoreCode(currentStore.storeCode);
  const originKey = movement.origin_store_code.trim()
    ? ownershipKeyFromStoreCode(movement.origin_store_code)
    : currentKey;
  if (originKey !== currentKey) return null;

  const parsed = parseInboundMovementNote(movement.note);
  const fee = parseAmount(parsed.totalFee);
  const payment = parsed.paymentLabel ?? '';
  const dest = movement.destination.trim();
  const customer = movement.recipient_name.trim() || '未登记客户';

  if (payment === '预付' && fee > 0) {
    return {
      id: `origin:prepaid:${movement.id}`,
      category: 'order_prepaid',
      title: '本站入库 · 已收款',
      subtitle: `${customer}${dest ? ` · → ${dest}` : ''} · 预付`,
      amount: fee,
      amountDisplay: `+${formatMmk(fee)}`,
      occurredAt: movement.created_at,
      barcode: movement.barcode,
      itemName: movement.item_name,
      destination: dest,
      originLabel: ownershipLabelFromKey(currentKey),
      originKey: currentKey,
    };
  }

  if (payment === '到付') {
    return {
      id: `origin:cod:${movement.id}`,
      category: 'order_income_cod',
      title: '本站入库 · 到付',
      subtitle: `${customer}${dest ? ` · → ${dest}` : ''} · 待目的站收取`,
      amount: fee,
      amountDisplay: fee > 0 ? `待目的站收 ${formatMmk(fee)}` : '待目的站收取',
      occurredAt: movement.created_at,
      barcode: movement.barcode,
      itemName: movement.item_name,
      destination: dest,
      originLabel: ownershipLabelFromKey(currentKey),
      originKey: currentKey,
    };
  }

  return null;
}

function buildTransportEntry(params: {
  id: string;
  packBarcode: string;
  packName: string;
  fee: number;
  legDest: string;
  originLabel: string;
  originKey: string;
  occurredAt: string;
  paid?: boolean;
  direction?: 'inbound' | 'outbound';
}): FinanceLedgerEntry {
  const direction = params.direction ?? 'inbound';
  return {
    id: params.id,
    category: 'transport_cost',
    title:
      direction === 'outbound' ? '运输成本 · 发运车费' : '运输成本 · 装车车费',
    subtitle: `${params.originLabel} → ${params.legDest} · ${params.packBarcode}`,
    transportFee: params.fee,
    paid: params.paid ?? false,
    transportDirection: direction,
    amount: params.paid ? 0 : params.fee,
    amountDisplay: params.paid
      ? '已支付'
      : params.fee > 0
        ? `−${formatMmk(params.fee)}`
        : '待登记车费',
    occurredAt: params.occurredAt,
    barcode: params.packBarcode,
    itemName: params.packName,
    destination: params.legDest,
    originLabel: params.originLabel,
    originKey: params.originKey,
  };
}

async function loadLatestTruckLoadMovementsByItemIds(
  itemIds: string[],
): Promise<Map<string, StockMovement>> {
  const ids = [...new Set(itemIds.map((id) => String(id).trim()).filter(Boolean))];
  if (!ids.length) return new Map();

  const db = await getDatabase();
  const placeholders = ids.map(() => '?').join(',');
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM stock_movements
     WHERE item_id IN (${placeholders})
       AND type = 'out'
       AND note LIKE '%装车出库%'
     ORDER BY created_at DESC`,
    ids,
  );

  const map = new Map<string, StockMovement>();
  for (const row of rows) {
    const itemId = String(row.item_id ?? '');
    if (!itemId || map.has(itemId)) continue;
    map.set(itemId, movementRowToPartial(row));
  }
  return map;
}

async function loadCustomerSignedMap(barcodes: string[]): Promise<Map<string, boolean>> {
  const codes = [...new Set(barcodes.map((b) => String(b).trim()).filter(Boolean))];
  if (!codes.length) return new Map();

  const db = await getDatabase();
  const placeholders = codes.map(() => '?').join(',');
  const rows = await db.getAllAsync<{ barcode: string; customer_signed_at: string }>(
    `SELECT barcode, customer_signed_at FROM inventory_items WHERE barcode IN (${placeholders})`,
    codes,
  );

  const map = new Map<string, boolean>();
  for (const row of rows) {
    const key = String(row.barcode ?? '').trim().toUpperCase();
    if (!key) continue;
    map.set(key, Boolean(String(row.customer_signed_at ?? '').trim()));
  }
  return map;
}

async function collectLocalTransportEntries(params: {
  store: InventoryStoreSession;
  hub: string;
  transportSeen: Set<string>;
  transportPaidBarcodes: Set<string>;
}): Promise<FinanceLedgerEntry[]> {
  const { store, hub, transportSeen, transportPaidBarcodes } = params;
  const db = await getDatabase();
  const currentKey = ownershipKeyFromStoreCode(store.storeCode);
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT p.id, p.bundle_barcode, p.bundle_name, p.transport_fee, p.truck_leg_destination,
            p.owner_store_code, p.bundle_item_id, p.created_at, i.qty_on_hand
     FROM packed_shipments p
     LEFT JOIN inventory_items i ON i.id = p.bundle_item_id
     ORDER BY p.created_at DESC
     LIMIT 300`,
  );

  const loadedRows = rows.filter((row) => {
    const qty = Number(row.qty_on_hand);
    return Number.isFinite(qty) && qty <= 0;
  });
  const bundleItemIds = loadedRows
    .map((row) => String(row.bundle_item_id ?? '').trim())
    .filter(Boolean);
  const truckLoadByItemId = await loadLatestTruckLoadMovementsByItemIds(bundleItemIds);

  const out: FinanceLedgerEntry[] = [];

  for (const row of loadedRows) {

    const packBarcode = String(row.bundle_barcode ?? '').trim().toUpperCase();
    if (!packBarcode || transportSeen.has(packBarcode)) continue;

    let legDest = normalizeDestinationCode(String(row.truck_leg_destination ?? ''));
    let fee = parseAmount(String(row.transport_fee ?? ''));
    let occurredAt = String(row.created_at ?? '');

    const bundleItemId = String(row.bundle_item_id ?? '');
    if (bundleItemId) {
      const movement = truckLoadByItemId.get(bundleItemId);
      if (movement) {
        if (fee <= 0) fee = parseAmount(parseTransportFeeFromLoadNote(movement.note));
        if (!legDest) legDest = normalizeDestinationCode(movement.destination ?? '');
        if (!occurredAt) occurredAt = movement.created_at;
      }
    }

    if (!legDest) continue;

    const ownerKey = ownershipKeyFromStoreCode(String(row.owner_store_code ?? ''));
    const isInboundLeg = destinationCodesMatch(legDest, hub);
    const isOutboundFromHere =
      ownerKey === currentKey && !destinationCodesMatch(legDest, hub);

    if (!isInboundLeg && !isOutboundFromHere) continue;

    transportSeen.add(packBarcode);
    const originLabel = ownershipLabelFromKey(ownerKey);
    const paid = transportPaidBarcodes.has(packBarcode);

    out.push(
      buildTransportEntry({
        id: `transport:pack:${String(row.id)}`,
        packBarcode,
        packName: String(row.bundle_name ?? packBarcode),
        fee,
        legDest,
        originLabel,
        originKey: ownerKey,
        occurredAt,
        paid,
        direction: isOutboundFromHere ? 'outbound' : 'inbound',
      }),
    );
  }

  return out;
}

function collectCloudTransportEntry(params: {
  pkg: {
    pack_barcode: string;
    pack_name: string;
    transport_fee: string;
    leg_destination_code: string;
    destination_code: string;
    origin_store_code: string;
    origin_store_name: string;
    truck_loaded_at: string | null;
    updated_at: string;
  };
  hub: string;
  currentStore: InventoryStoreSession;
  transportSeen: Set<string>;
  transportPaidBarcodes: Set<string>;
}): FinanceLedgerEntry | null {
  const { pkg, hub, currentStore, transportSeen, transportPaidBarcodes } = params;
  const legDest = normalizeDestinationCode(pkg.leg_destination_code || pkg.destination_code);
  if (!legDest) return null;

  const packBarcode = pkg.pack_barcode.trim().toUpperCase();
  if (!packBarcode || transportSeen.has(packBarcode)) return null;

  const currentKey = ownershipKeyFromStoreCode(currentStore.storeCode);
  const originKey = ownershipKeyFromStoreCode(pkg.origin_store_code);
  const isInboundLeg = destinationCodesMatch(legDest, hub);
  const isOutboundFromHere = originKey === currentKey && !destinationCodesMatch(legDest, hub);

  if (!isInboundLeg && !isOutboundFromHere) return null;

  transportSeen.add(packBarcode);
  const fee = parseAmount(pkg.transport_fee);
  const originLabel =
    pkg.origin_store_name.trim() || ownershipLabelFromKey(originKey);
  const paid = transportPaidBarcodes.has(packBarcode);

  return buildTransportEntry({
    id: `transport:cloud:${packBarcode}`,
    packBarcode: pkg.pack_barcode,
    packName: pkg.pack_name || pkg.pack_barcode,
    fee,
    legDest,
    originLabel,
    originKey,
    occurredAt: pkg.truck_loaded_at || pkg.updated_at,
    paid,
    direction: isOutboundFromHere ? 'outbound' : 'inbound',
  });
}

function buildStockOpEntry(movement: StockMovement): FinanceLedgerEntry {
  const typeLabel =
    movement.type === 'in' ? '入库' : movement.type === 'out' ? '出库' : '调整';
  return {
    id: `op:${movement.id}`,
    category: 'stock_op',
    title: `${typeLabel} · ${movement.item_name}`,
    subtitle: `${movement.barcode} · ${movement.operator}`,
    amount: null,
    amountDisplay:
      movement.type === 'out'
        ? `−${movement.qty}`
        : movement.type === 'in'
          ? `+${movement.qty}`
          : String(movement.qty),
    occurredAt: movement.created_at,
    barcode: movement.barcode,
    itemName: movement.item_name,
    destination: movement.destination,
    originLabel: movement.origin_store_name,
  };
}

function summarize(
  entries: FinanceLedgerEntry[],
  storeCode: string,
  hubCode: string,
): FinanceLedgerSummary {
  const reconciliation = buildStationReconciliationSummary(entries, storeCode, hubCode);
  let manualIncome = 0;
  let manualExpense = 0;
  for (const e of entries) {
    const amt = e.amount ?? 0;
    if (e.category === 'manual_income') manualIncome += amt;
    if (e.category === 'manual_expense') manualExpense += amt;
  }
  return {
    codPendingTotal: reconciliation.pendingInflowTotal,
    collectedTotal: reconciliation.collectedTotal,
    transportCostTotal: reconciliation.transportUnpaidTotal,
    transportPaidTotal: reconciliation.transportPaidTotal,
    transportUnpaidTotal: reconciliation.transportUnpaidTotal,
    pendingInflowTotal: reconciliation.pendingInflowTotal,
    agencyPayableTotal: reconciliation.agencyPayableTotal,
    manualIncomeTotal: Math.round(manualIncome),
    manualExpenseTotal: Math.round(manualExpense),
  };
}

async function fetchCloudCrossBorderManualEntries(): Promise<FinanceLedgerEntry[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase
      .from('cross_border_manual_entries')
      .select('id, entry_date, kind, amount, category, note, created_by, created_at')
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) return [];
    const out: FinanceLedgerEntry[] = [];
    for (const row of data || []) {
      const amount = Math.round(Number(row.amount) || 0);
      const isIncome = row.kind === 'income';
      const subtitle = [row.category, row.note]
        .map((s) => String(s || '').trim())
        .filter(Boolean)
        .join(' · ');
      out.push({
        id: `manual:${row.id}`,
        category: isIncome ? 'manual_income' : 'manual_expense',
        title: isIncome ? '其它收入' : '其它支出',
        subtitle: subtitle || 'Admin 登记',
        amount,
        amountDisplay: isIncome
          ? `+${formatMmk(amount)}`
          : amount > 0
            ? `−${formatMmk(amount)}`
            : '0 MMK',
        occurredAt: row.created_at || `${row.entry_date}T12:00:00.000Z`,
        barcode: '',
        itemName: String(row.category || '').trim() || (isIncome ? '其它收入' : '其它支出'),
        originLabel: String(row.created_by || '').trim() || 'Admin',
      });
    }
    return out;
  } catch {
    return [];
  }
}

function summarizeCrossBorder(
  entries: FinanceLedgerEntry[],
  storeCode: string,
  hubCode: string,
): FinanceLedgerSummary {
  const crossBorder = buildCrossBorderFinanceSummary(entries, storeCode, hubCode);
  return {
    codPendingTotal: crossBorder.pendingInflowTotal,
    collectedTotal: crossBorder.collectedTotal,
    transportCostTotal: crossBorder.transportUnpaidTotal,
    transportPaidTotal: crossBorder.transportPaidTotal,
    transportUnpaidTotal: crossBorder.transportUnpaidTotal,
    pendingInflowTotal: crossBorder.pendingInflowTotal,
    agencyPayableTotal: crossBorder.agencyPayableTotal,
    manualIncomeTotal: crossBorder.manualIncomeTotal,
    manualExpenseTotal: crossBorder.manualExpenseTotal,
  };
}

export async function listCrossBorderFinance(
  store: InventoryStoreSession,
  hubCode: string,
): Promise<FinanceLedgerResult> {
  const result = await listFinanceLedger(store, hubCode);
  const financeEntries = result.entries.filter((e) => {
    if (e.category === 'stock_op') return false;
    // 车费仅计入运达站：发站 outbound 不在跨境财务展示
    if (e.category === 'transport_cost' && e.transportDirection === 'outbound') return false;
    return true;
  });
  return {
    entries: financeEntries,
    summary: summarizeCrossBorder(financeEntries, store.storeCode, hubCode),
  };
}

export async function listFinanceLedger(
  store: InventoryStoreSession,
  hubCode: string,
): Promise<FinanceLedgerResult> {
  const hub = normalizeDestinationCode(hubCode);
  const db = await getDatabase();
  const entries: FinanceLedgerEntry[] = [];
  const transportSeen = new Set<string>();
  const orderSeen = new Set<string>();
  const transportPaidBarcodes = await getHubTransportFeePaidBarcodeSet();

  const inboundRows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT m.*, i.final_destination, i.recipient_name AS item_recipient_name,
            i.customer_signed_at
     FROM stock_movements m
     INNER JOIN inventory_items i ON i.id = m.item_id
     WHERE m.type = 'in'
       AND UPPER(i.barcode) NOT LIKE 'PKG%'
     ORDER BY m.created_at DESC
     LIMIT 500`,
  );

  for (const row of inboundRows) {
    const movement = movementRowToPartial(row);
    const finalDest = String(row.final_destination ?? movement.destination ?? '');
    const customerName =
      String(row.item_recipient_name ?? '').trim() || movement.recipient_name.trim();
    const customerSigned = Boolean(String(row.customer_signed_at ?? '').trim());

    if (isCrossStationInbound(movement, finalDest, store, hub)) {
      const entry = buildOrderLedgerEntry({
        movement,
        finalDestination: finalDest,
        customerSigned,
        customerName,
      });
      if (entry && !orderSeen.has(entry.barcode)) {
        orderSeen.add(entry.barcode);
        entries.push(entry);
      }
      continue;
    }

    const originEntry = buildLocalOriginInboundEntry(movement, store);
    if (originEntry && !orderSeen.has(originEntry.barcode)) {
      orderSeen.add(originEntry.barcode);
      entries.push(originEntry);
    }
  }

  const localTransport = await collectLocalTransportEntries({
    store,
    hub,
    transportSeen,
    transportPaidBarcodes,
  });
  entries.push(...localTransport);

  try {
    const cloudStatuses = ['in_transit', 'hub_received', 'completed', 'split_at_hub'] as const;
    const inboundPkgs = await listInboundPackages(hub, [...cloudStatuses]);
    const outboundPkgs = await listOutboundPackagesFromOrigin(store.storeCode, [...cloudStatuses]);

    for (const pkg of inboundPkgs) {
      const entry = collectCloudTransportEntry({
        pkg,
        hub,
        currentStore: store,
        transportSeen,
        transportPaidBarcodes,
      });
      if (entry) entries.push(entry);
    }

    for (const pkg of outboundPkgs) {
      const entry = collectCloudTransportEntry({
        pkg,
        hub,
        currentStore: store,
        transportSeen,
        transportPaidBarcodes,
      });
      if (entry) entries.push(entry);
    }

    const cloudOrderBarcodes: string[] = [];
    for (const pkg of inboundPkgs) {
      for (const order of pkg.orders) {
        if (!order.inbound_note?.trim()) continue;
        const parsed = parseInboundMovementNote(order.inbound_note);
        if (!parsed.totalFee && !parsed.paymentLabel) continue;
        const orderDest = order.destination_code || '';
        if (orderDest && !destinationCodesMatch(orderDest, hub)) continue;
        if (order.order_barcode) cloudOrderBarcodes.push(order.order_barcode);
      }
    }
    const cloudSignedMap = await loadCustomerSignedMap(cloudOrderBarcodes);

    for (const pkg of inboundPkgs) {
      for (const order of pkg.orders) {
        if (!order.inbound_note?.trim()) continue;
        const parsed = parseInboundMovementNote(order.inbound_note);
        if (!parsed.totalFee && !parsed.paymentLabel) continue;

        const orderDest = order.destination_code || '';
        if (orderDest && !destinationCodesMatch(orderDest, hub)) continue;
        if (orderSeen.has(order.order_barcode)) continue;

        const pseudoMovement: StockMovement = {
          id: `cloud-order:${order.id}`,
          item_id: order.id,
          barcode: order.order_barcode,
          item_name: order.order_name,
          type: 'in',
          qty: order.qty,
          qty_before: 0,
          qty_after: 1,
          operator: order.inbound_store_name,
          note: order.inbound_note,
          recipient_name: order.recipient_name,
          recipient_phone: order.recipient_phone,
          destination: orderDest,
          detail_address: order.detail_address,
          packaging: order.packaging,
          input_barcode: order.express_barcode,
          origin_store_id: pkg.origin_store_id ?? '',
          origin_store_code: pkg.origin_store_code,
          origin_store_name: pkg.origin_store_name,
          created_at: order.inbound_at || pkg.truck_loaded_at || pkg.created_at,
        };

        const signedKey = String(order.order_barcode ?? '').trim().toUpperCase();
        const customerSigned = cloudSignedMap.get(signedKey) ?? false;

        const entry = buildOrderLedgerEntry({
          movement: pseudoMovement,
          finalDestination: orderDest,
          customerSigned,
          customerName: order.recipient_name,
        });
        if (entry) {
          orderSeen.add(entry.barcode);
          entries.push({ ...entry, id: `cloud:${entry.id}` });
        }
      }
    }
  } catch {
    // 离线时仅展示本地流水
  }

  try {
    const manualEntries = await fetchCloudCrossBorderManualEntries();
    entries.push(...manualEntries);
  } catch {
    // 云端其它开销可选
  }

  const opRows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM stock_movements ORDER BY created_at DESC LIMIT 80`,
  );
  for (const row of opRows) {
    const movement = movementRowToPartial(row);
    if (movement.note.includes('装车出库') && movement.type === 'out') continue;
    entries.push(buildStockOpEntry(movement));
  }

  entries.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  return { entries, summary: summarize(entries, store.storeCode, hub) };
}
