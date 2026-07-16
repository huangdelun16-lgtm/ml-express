import type { FinanceLedgerEntry, FinanceLedgerSummary } from '../types/financeLedger';
import { destinationCodesMatch, normalizeDestinationCode } from './destinationCode';
import { ownershipKeyFromStoreCode } from './storeOwnership';
import {
  buildCrossBorderFinanceSummary,
  buildStationReconciliationSummary,
} from './stationReconciliation';

export type FinanceItemRow = {
  id: string;
  barcode: string;
  final_destination?: string | null;
  recipient_name?: string | null;
  customer_signed_at?: string | null;
};

export type FinanceMovementRow = {
  id: string;
  item_id?: string | null;
  barcode: string;
  item_name?: string | null;
  type: 'in' | 'out' | 'adjust';
  qty?: number | string | null;
  operator?: string | null;
  note?: string | null;
  destination?: string | null;
  origin_store_code?: string | null;
  origin_store_name?: string | null;
  recipient_name?: string | null;
  created_at?: string | null;
};

export type FinancePackageRow = {
  pack_barcode: string;
  pack_name?: string | null;
  origin_store_code?: string | null;
  origin_store_name?: string | null;
  destination_code?: string | null;
  leg_destination_code?: string | null;
  transport_fee?: string | number | null;
  truck_loaded_at?: string | null;
  updated_at?: string | null;
};

export type FinanceOrderRow = {
  pack_barcode: string;
  order_barcode: string;
  order_name?: string | null;
  destination_code?: string | null;
  inbound_note?: string | null;
  inbound_at?: string | null;
  recipient_name?: string | null;
};

export type FinanceManualRow = {
  id: string;
  entry_date: string;
  kind: 'income' | 'expense';
  amount: number | string;
  category?: string | null;
  note?: string | null;
  created_by?: string | null;
  created_at?: string | null;
};

export type FinanceDataset = {
  items: FinanceItemRow[];
  movements: FinanceMovementRow[];
  packages: FinancePackageRow[];
  orders: FinanceOrderRow[];
  paidTransportBarcodes: Set<string>;
  manualEntries: FinanceManualRow[];
};

export function parseFinanceAmount(raw: unknown): number {
  if (raw == null) return 0;
  const value = Number(String(raw).trim().replace(/[^\d.]/g, ''));
  return Number.isFinite(value) ? value : 0;
}

export function parseInboundFinanceNote(note: unknown): {
  totalFee?: string;
  paymentLabel?: '预付' | '到付';
} {
  const parts = String(note ?? '')
    .trim()
    .split(' · ')
    .map((part) => part.trim())
    .filter(Boolean);
  let totalFee: string | undefined;
  let paymentLabel: '预付' | '到付' | undefined;
  for (const part of parts) {
    const fee = part.match(/^总费用\s+([\d.]+)\s*MMK$/i);
    if (fee) totalFee = fee[1];
    if (part === '预付' || part === '到付') paymentLabel = part;
  }
  return { totalFee, paymentLabel };
}

function formatMmk(amount: number): string {
  return `${amount % 1 === 0 ? amount : amount.toFixed(2)} MMK`;
}

function ownerLabel(key: string, fallback = ''): string {
  return fallback.trim() || key || '—';
}

function orderEntry(
  movement: FinanceMovementRow,
  item: FinanceItemRow | undefined,
  currentKey: string,
): FinanceLedgerEntry | null {
  const parsed = parseInboundFinanceNote(movement.note);
  const amount = parseFinanceAmount(parsed.totalFee);
  const destination = String(item?.final_destination || movement.destination || '').trim();
  const originKey = ownershipKeyFromStoreCode(movement.origin_store_code || '') || currentKey;
  const originLabel = ownerLabel(originKey, String(movement.origin_store_name || ''));
  const barcode = String(movement.barcode || '').trim();
  const itemName = String(movement.item_name || barcode).trim();
  const customer = String(item?.recipient_name || movement.recipient_name || '').trim() || '—';
  const base = {
    occurredAt: String(movement.created_at || ''),
    barcode,
    itemName,
    destination,
    originKey,
    originLabel,
  };

  if (parsed.paymentLabel === '预付') {
    return {
      ...base,
      id: `order:prepaid:${barcode}`,
      category: 'order_prepaid',
      title: '订单 · 已付款',
      subtitle: `${customer} · ${originLabel} → ${destination} · 预付`,
      amount,
      amountDisplay: amount > 0 ? `+${formatMmk(amount)}` : '已付款',
    };
  }
  if (parsed.paymentLabel === '到付') {
    const collected = Boolean(String(item?.customer_signed_at || '').trim());
    return {
      ...base,
      id: `order:${collected ? 'collected' : 'cod'}:${barcode}`,
      category: collected ? 'order_collected' : 'order_income_cod',
      title: collected ? '订单收入 · 已签收收款' : '订单收入 · 到付待收',
      subtitle: `${customer} · ${originLabel} → ${destination} · 到付`,
      amount,
      amountDisplay: amount > 0 ? `+${formatMmk(amount)}` : collected ? '已收款' : '到付待收',
    };
  }
  if (amount > 0 && destination) {
    return {
      ...base,
      id: `order:fee:${barcode}`,
      category: 'order_income_cod',
      title: '订单费用',
      subtitle: `${customer} · ${originLabel} → ${destination}`,
      amount,
      amountDisplay: `+${formatMmk(amount)}`,
    };
  }
  return null;
}

function stockEntry(row: FinanceMovementRow): FinanceLedgerEntry {
  const qty = Number(row.qty) || 0;
  const barcode = String(row.barcode || '').trim();
  return {
    id: `op:${row.id}`,
    category: 'stock_op',
    title: `${row.type === 'in' ? '入库' : row.type === 'out' ? '出库' : '调整'} · ${row.item_name || barcode}`,
    subtitle: `${barcode} · ${row.operator || '—'}`,
    amount: null,
    amountDisplay: row.type === 'out' ? `−${qty}` : row.type === 'in' ? `+${qty}` : String(qty),
    occurredAt: String(row.created_at || ''),
    barcode,
    itemName: String(row.item_name || barcode),
    destination: String(row.destination || ''),
    originLabel: String(row.origin_store_name || ''),
  };
}

function manualEntry(row: FinanceManualRow): FinanceLedgerEntry {
  const income = row.kind === 'income';
  const amount = Math.round(parseFinanceAmount(row.amount));
  const category = String(row.category || '').trim();
  const note = String(row.note || '').trim();
  return {
    id: `manual:${row.id}`,
    manualEntryId: row.id,
    category: income ? 'manual_income' : 'manual_expense',
    title: income ? '其它收入' : '其它支出',
    subtitle: [category, note].filter(Boolean).join(' · ') || '—',
    amount,
    amountDisplay: `${income ? '+' : '−'}${formatMmk(amount)}`,
    occurredAt: String(row.created_at || `${row.entry_date}T12:00:00.000Z`),
    barcode: '',
    itemName: category || (income ? '其它收入' : '其它支出'),
    deletable: true,
  };
}

export function buildFinanceLedgerEntries(
  storeCode: string,
  hubCode: string,
  dataset: FinanceDataset,
): FinanceLedgerEntry[] {
  const currentKey = ownershipKeyFromStoreCode(storeCode);
  const itemById = new Map(dataset.items.map((item) => [item.id, item]));
  const itemByBarcode = new Map(
    dataset.items.map((item) => [String(item.barcode || '').trim().toUpperCase(), item]),
  );
  const entries: FinanceLedgerEntry[] = [];
  const orderSeen = new Set<string>();

  for (const movement of dataset.movements) {
    const barcode = String(movement.barcode || '').trim().toUpperCase();
    if (movement.type !== 'in' || barcode.startsWith('PKG')) continue;
    const item = (movement.item_id && itemById.get(movement.item_id)) || itemByBarcode.get(barcode);
    const entry = orderEntry(movement, item, currentKey);
    if (entry && !orderSeen.has(barcode)) {
      orderSeen.add(barcode);
      entries.push(entry);
    }
  }

  const packagesByBarcode = new Map(
    dataset.packages.map((pkg) => [String(pkg.pack_barcode || '').trim().toUpperCase(), pkg]),
  );
  for (const order of dataset.orders) {
    const barcode = String(order.order_barcode || '').trim().toUpperCase();
    if (!barcode || orderSeen.has(barcode) || !String(order.inbound_note || '').trim()) continue;
    const pkg = packagesByBarcode.get(String(order.pack_barcode || '').trim().toUpperCase());
    if (!pkg) continue;
    const destination = String(order.destination_code || '').trim();
    if (destination && !destinationCodesMatch(destination, hubCode)) continue;
    const pseudoMovement: FinanceMovementRow = {
      id: `cloud:${barcode}`,
      barcode: order.order_barcode,
      item_name: order.order_name,
      type: 'in',
      note: order.inbound_note,
      destination,
      origin_store_code: pkg.origin_store_code,
      origin_store_name: pkg.origin_store_name,
      recipient_name: order.recipient_name,
      created_at: order.inbound_at,
    };
    const entry = orderEntry(pseudoMovement, itemByBarcode.get(barcode), currentKey);
    if (entry) {
      orderSeen.add(barcode);
      entries.push({ ...entry, id: `cloud:${entry.id}` });
    }
  }

  const transportSeen = new Set<string>();
  for (const pkg of dataset.packages) {
    const packBarcode = String(pkg.pack_barcode || '').trim().toUpperCase();
    const legDestination = normalizeDestinationCode(
      String(pkg.leg_destination_code || pkg.destination_code || ''),
    );
    if (
      !packBarcode ||
      transportSeen.has(packBarcode) ||
      !destinationCodesMatch(legDestination, hubCode)
    ) {
      continue;
    }
    transportSeen.add(packBarcode);
    const fee = parseFinanceAmount(pkg.transport_fee);
    const paid = dataset.paidTransportBarcodes.has(packBarcode);
    const originKey = ownershipKeyFromStoreCode(pkg.origin_store_code || '');
    const originLabel = ownerLabel(originKey, String(pkg.origin_store_name || ''));
    entries.push({
      id: `transport:${packBarcode}`,
      category: 'transport_cost',
      title: '运输成本 · 装车车费',
      subtitle: `${originLabel} → ${legDestination} · ${packBarcode}`,
      amount: paid ? 0 : fee,
      amountDisplay: paid ? '已支付' : fee > 0 ? `−${formatMmk(fee)}` : '待登记车费',
      transportFee: fee,
      paid,
      occurredAt: String(pkg.truck_loaded_at || pkg.updated_at || ''),
      barcode: packBarcode,
      itemName: String(pkg.pack_name || packBarcode),
      destination: legDestination,
      originKey,
      originLabel,
      transportDirection: 'inbound',
    });
  }

  entries.push(...dataset.manualEntries.map(manualEntry));
  entries.push(
    ...dataset.movements
      .filter((row) => !String(row.note || '').includes('装车出库'))
      .map(stockEntry),
  );
  return entries.sort(
    (a, b) => new Date(b.occurredAt || 0).getTime() - new Date(a.occurredAt || 0).getTime(),
  );
}

export function filterCrossBorderFinanceEntries(
  entries: FinanceLedgerEntry[],
): FinanceLedgerEntry[] {
  return entries.filter(
    (entry) =>
      entry.category !== 'stock_op' &&
      !(entry.category === 'transport_cost' && entry.transportDirection === 'outbound'),
  );
}

export function buildFinanceLedgerSummary(
  entries: FinanceLedgerEntry[],
  storeCode: string,
  hubCode: string,
  crossBorder = false,
): FinanceLedgerSummary {
  const station = crossBorder
    ? buildCrossBorderFinanceSummary(entries, storeCode, hubCode)
    : buildStationReconciliationSummary(entries, storeCode, hubCode);
  const codPendingTotal = entries.reduce(
    (total, entry) =>
      total + (entry.category === 'order_income_cod' ? Number(entry.amount) || 0 : 0),
    0,
  );
  return {
    codPendingTotal: Math.round(codPendingTotal),
    collectedTotal: station.collectedTotal,
    transportCostTotal: station.transportUnpaidTotal,
    transportPaidTotal: station.transportPaidTotal,
    transportUnpaidTotal: station.transportUnpaidTotal,
    pendingInflowTotal: station.pendingInflowTotal,
    agencyPayableTotal: station.agencyPayableTotal,
    manualIncomeTotal:
      'manualIncomeTotal' in station ? Number(station.manualIncomeTotal) || 0 : 0,
    manualExpenseTotal:
      'manualExpenseTotal' in station ? Number(station.manualExpenseTotal) || 0 : 0,
  };
}
