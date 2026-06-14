import { getHubTransportFeePaidBarcodeSet } from './hubTransportFeeService';
import type { InventoryStoreSession } from './authService';
import { getDatabase } from './database';
import { listInboundPackages } from './trackingService';
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
  occurredAt: string;
  paid?: boolean;
}): FinanceLedgerEntry {
  return {
    id: params.id,
    category: 'transport_cost',
    title: '运输成本 · 装车车费',
    subtitle: `${params.originLabel} → ${params.legDest} · ${params.packBarcode}`,
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
  };
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

function summarize(entries: FinanceLedgerEntry[]): FinanceLedgerSummary {
  let codPendingTotal = 0;
  let collectedTotal = 0;
  let transportCostTotal = 0;

  for (const e of entries) {
    const amt = e.amount ?? 0;
    if (e.category === 'order_income_cod') codPendingTotal += amt;
    if (e.category === 'order_prepaid' || e.category === 'order_collected') collectedTotal += amt;
    if (e.category === 'transport_cost') transportCostTotal += amt;
  }

  return { codPendingTotal, collectedTotal, transportCostTotal };
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

  const transportRows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT m.id, m.item_name, m.operator, m.note, m.created_at, m.destination,
            p.bundle_barcode, p.bundle_name, p.transport_fee, p.truck_leg_destination,
            p.owner_store_code
     FROM stock_movements m
     INNER JOIN packed_shipments p ON p.bundle_item_id = m.item_id
     WHERE m.type = 'out' AND m.note LIKE '%装车出库%'
     ORDER BY m.created_at DESC
     LIMIT 200`,
  );

  for (const row of transportRows) {
    const legDest = normalizeDestinationCode(
      String(row.truck_leg_destination ?? row.destination ?? ''),
    );
    if (!legDest || !destinationCodesMatch(legDest, hub)) continue;

    const packBarcode = String(row.bundle_barcode ?? '').trim().toUpperCase();
    if (!packBarcode || transportSeen.has(packBarcode)) continue;
    transportSeen.add(packBarcode);

    const feeFromCol = parseAmount(String(row.transport_fee ?? ''));
    const feeFromNote = parseAmount(parseTransportFeeFromLoadNote(String(row.note ?? '')));
    const fee = feeFromCol > 0 ? feeFromCol : feeFromNote;
    const originKey = ownershipKeyFromStoreCode(String(row.owner_store_code ?? ''));
    const originLabel = ownershipLabelFromKey(originKey);
    const paid = transportPaidBarcodes.has(packBarcode);

    entries.push(
      buildTransportEntry({
        id: `transport:local:${String(row.id)}`,
        packBarcode,
        packName: String(row.bundle_name ?? row.item_name ?? packBarcode),
        fee,
        legDest,
        originLabel,
        occurredAt: String(row.created_at),
        paid,
      }),
    );
  }

  try {
    const cloudPkgs = await listInboundPackages(hub, [
      'in_transit',
      'hub_received',
      'completed',
    ]);
    for (const pkg of cloudPkgs) {
      const legDest = normalizeDestinationCode(
        pkg.leg_destination_code || pkg.destination_code,
      );
      if (!destinationCodesMatch(legDest, hub)) continue;

      const packBarcode = pkg.pack_barcode.trim().toUpperCase();
      if (!packBarcode || transportSeen.has(packBarcode)) continue;
      transportSeen.add(packBarcode);

      const fee = parseAmount(pkg.transport_fee);
      const originLabel =
        pkg.origin_store_name.trim() ||
        ownershipLabelFromKey(ownershipKeyFromStoreCode(pkg.origin_store_code));
      const paid = transportPaidBarcodes.has(packBarcode);

      entries.push(
        buildTransportEntry({
          id: `transport:cloud:${packBarcode}`,
          packBarcode: pkg.pack_barcode,
          packName: pkg.pack_name || pkg.pack_barcode,
          fee,
          legDest,
          originLabel,
          occurredAt: pkg.truck_loaded_at || pkg.updated_at,
          paid,
        }),
      );

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

        const localItem = await db.getFirstAsync<{ customer_signed_at: string }>(
          'SELECT customer_signed_at FROM inventory_items WHERE barcode = ?',
          [order.order_barcode],
        );
        const customerSigned = Boolean(localItem?.customer_signed_at?.trim());

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

  const opRows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM stock_movements ORDER BY created_at DESC LIMIT 80`,
  );
  for (const row of opRows) {
    const movement = movementRowToPartial(row);
    if (movement.note.includes('装车出库') && movement.type === 'out') continue;
    entries.push(buildStockOpEntry(movement));
  }

  entries.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  return { entries, summary: summarize(entries) };
}
