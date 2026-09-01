import type { FinanceLedgerEntry, FinanceLedgerSummary } from '../types/financeLedger';
import { destinationCodesMatch, normalizeDestinationCode } from './destinationCode';
import {
  normalizePaymentLabel,
  parseInboundMovementNote,
} from './inboundMovementNote';
import { parsePackagingStockInLineBarcode } from './inboundBarcode';
import { ownershipKeyFromStoreCode } from './storeOwnership';
import {
  buildCrossBorderFinanceSummary,
  buildStationReconciliationSummary,
} from './stationReconciliation';
import {
  buildTripFeeGroupMap,
  isTripTransportFeePaid,
  tripTransportGroupKey,
} from './tripTransportFee';
import { yangonNoonIsoFromYmd } from './yangonFinancePeriod';

export type FinanceItemRow = {
  id: string;
  barcode: string;
  final_destination?: string | null;
  recipient_name?: string | null;
  customer_signed_at?: string | null;
  packed_bundle_barcode?: string | null;
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
  trip_number?: string | null;
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
  store_code?: string | null;
  hub_code?: string | null;
};

export type FinanceRemittanceRow = {
  id: string;
  from_store_id?: string | null;
  from_store_code?: string | null;
  from_hub_code?: string | null;
  to_origin_key: string;
  to_store_code?: string | null;
  amount: number | string;
  remitted_at?: string | null;
  note?: string | null;
  created_at?: string | null;
};

export type FinanceDataset = {
  items: FinanceItemRow[];
  movements: FinanceMovementRow[];
  packages: FinancePackageRow[];
  orders: FinanceOrderRow[];
  paidTransportBarcodes: Set<string>;
  manualEntries: FinanceManualRow[];
  remittances?: FinanceRemittanceRow[];
  /** 快递包 note（多个入库总费用写在包备注上） */
  packNotesByBarcode?: Record<string, string>;
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
  const parsed = parseInboundMovementNote(String(note ?? ''));
  const payment = normalizePaymentLabel(parsed.paymentLabel);
  return {
    totalFee: parsed.totalFee,
    paymentLabel: payment === '预付' || payment === '到付' ? payment : undefined,
  };
}

function extractPackedBundleFromNote(note: string): string {
  const match = String(note || '').match(/打包入\s+([A-Z0-9()_-]+)/i);
  return match?.[1]?.trim().toUpperCase() || '';
}

/** 行 note 缺总费用时，从多个入库快递包 note 补齐（同一包仅允许补一次，避免重复计入） */
export function enrichInboundNoteWithPackFee(
  note: string,
  packedBundleBarcode: string | undefined,
  packNotesByBarcode: Record<string, string> | undefined,
  packFeeAssigned?: Set<string>,
): string {
  const trimmed = String(note || '').trim();
  const parsed = parseInboundFinanceNote(trimmed);
  if (parsed.totalFee) return trimmed;

  const bundle =
    String(packedBundleBarcode || '').trim().toUpperCase() ||
    extractPackedBundleFromNote(trimmed) ||
    '';
  if (!bundle || !packNotesByBarcode) return trimmed;

  const packNote = packNotesByBarcode[bundle];
  if (!packNote) return trimmed;
  const packParsed = parseInboundFinanceNote(packNote);
  if (!packParsed.totalFee) return trimmed;

  if (packFeeAssigned?.has(bundle)) {
    // 同包其它行只补付款方式，不重复补金额
    if (parsed.paymentLabel || !packParsed.paymentLabel) return trimmed;
    return trimmed ? `${packParsed.paymentLabel} · ${trimmed}` : packParsed.paymentLabel;
  }
  packFeeAssigned?.add(bundle);

  const feePart = `总费用 ${packParsed.totalFee} MMK`;
  if (!trimmed) {
    return packParsed.paymentLabel ? `${feePart} · ${packParsed.paymentLabel}` : feePart;
  }
  return `${feePart} · ${trimmed}`;
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
  packNotesByBarcode?: Record<string, string>,
  packFeeAssigned?: Set<string>,
): FinanceLedgerEntry | null {
  const enrichedNote = enrichInboundNoteWithPackFee(
    String(movement.note || ''),
    item?.packed_bundle_barcode || undefined,
    packNotesByBarcode,
    packFeeAssigned,
  );
  const parsed = parseInboundFinanceNote(enrichedNote);
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
    occurredAt:
      yangonNoonIsoFromYmd(String(row.entry_date || '')) ||
      String(row.created_at || `${row.entry_date}T12:00:00.000Z`),
    barcode: '',
    itemName: category || (income ? '其它收入' : '其它支出'),
    deletable: true,
  };
}

function remittanceEntry(row: FinanceRemittanceRow, storeCode: string): FinanceLedgerEntry {
  const fromCode = String(row.from_store_code || '').trim().toUpperCase();
  const isPayer = fromCode === String(storeCode || '').trim().toUpperCase();
  const amount = Math.round(parseFinanceAmount(row.amount));
  const originKey = String(row.to_origin_key || '').trim().toUpperCase();
  const note = String(row.note || '').trim();
  return {
    id: `remit:${row.id}:${isPayer ? 'out' : 'in'}`,
    remittanceId: row.id,
    category: 'agency_remit',
    remitDirection: isPayer ? 'out' : 'in',
    title: isPayer ? '已汇给发站' : '收到代转汇款',
    subtitle: [originKey, note].filter(Boolean).join(' · ') || '—',
    amount,
    amountDisplay: `${isPayer ? '−' : '+'}${formatMmk(amount)}`,
    occurredAt:
      yangonNoonIsoFromYmd(String(row.remitted_at || '')) || String(row.created_at || ''),
    barcode: '',
    itemName: originKey || '代转',
    originKey,
    originLabel: originKey,
    paid: true,
  };
}

/** 多个入库共享总费用：同一基础入库号只计一次（取最大金额；任一行签收即已收） */
export function collapsePackagingStockInOrderEntries(
  entries: FinanceLedgerEntry[],
): FinanceLedgerEntry[] {
  const groups = new Map<string, FinanceLedgerEntry[]>();
  const rest: FinanceLedgerEntry[] = [];

  for (const entry of entries) {
    const isOrder =
      entry.category === 'order_prepaid' ||
      entry.category === 'order_collected' ||
      entry.category === 'order_income_cod';
    const parsed = isOrder ? parsePackagingStockInLineBarcode(entry.barcode) : null;
    if (!parsed) {
      rest.push(entry);
      continue;
    }
    const list = groups.get(parsed.base) ?? [];
    list.push(entry);
    groups.set(parsed.base, list);
  }

  for (const [base, list] of groups) {
    const amount = Math.max(0, ...list.map((row) => Number(row.amount) || 0));
    const anyCollected = list.some((row) => row.category === 'order_collected');
    const anyPrepaid = list.some((row) => row.category === 'order_prepaid');
    const category = anyCollected
      ? 'order_collected'
      : anyPrepaid
        ? 'order_prepaid'
        : 'order_income_cod';
    const primary =
      list.find((row) => parsePackagingStockInLineBarcode(row.barcode)?.index === 1) ?? list[0];
    const title =
      category === 'order_prepaid'
        ? '订单 · 已付款'
        : category === 'order_collected'
          ? '订单收入 · 已签收收款'
          : '订单收入 · 到付待收';
    rest.push({
      ...primary,
      id: `order:pack:${base}`,
      category,
      title,
      amount,
      amountDisplay:
        amount > 0
          ? category === 'order_prepaid'
            ? `+${formatMmk(amount)}`
            : `+${formatMmk(amount)}`
          : category === 'order_collected'
            ? '已收款'
            : category === 'order_prepaid'
              ? '已付款'
              : '到付待收',
      barcode: primary.barcode || `${base}(1-1)`,
    });
  }

  return rest;
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
  const packNotes = dataset.packNotesByBarcode ?? {};
  const packFeeAssigned = new Set<string>();

  // 先按条码排序，保证同包「补费用」落在稳定的第一行
  const inboundMovements = dataset.movements
    .filter((movement) => {
      const barcode = String(movement.barcode || '').trim().toUpperCase();
      return movement.type === 'in' && !barcode.startsWith('PKG');
    })
    .slice()
    .sort((a, b) =>
      String(a.barcode || '')
        .trim()
        .toUpperCase()
        .localeCompare(String(b.barcode || '').trim().toUpperCase()),
    );

  for (const movement of inboundMovements) {
    const barcode = String(movement.barcode || '').trim().toUpperCase();
    const item = (movement.item_id && itemById.get(movement.item_id)) || itemByBarcode.get(barcode);
    const entry = orderEntry(movement, item, currentKey, packNotes, packFeeAssigned);
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
    const item = itemByBarcode.get(barcode);
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
    const entry = orderEntry(pseudoMovement, item, currentKey, packNotes, packFeeAssigned);
    if (entry) {
      orderSeen.add(barcode);
      entries.push({ ...entry, id: `cloud:${entry.id}` });
    }
  }

  const collapsedOrders = collapsePackagingStockInOrderEntries(
    entries.filter(
      (entry) =>
        entry.category === 'order_prepaid' ||
        entry.category === 'order_collected' ||
        entry.category === 'order_income_cod',
    ),
  );
  const nonOrderEntries = entries.filter(
    (entry) =>
      entry.category !== 'order_prepaid' &&
      entry.category !== 'order_collected' &&
      entry.category !== 'order_income_cod',
  );
  entries.length = 0;
  entries.push(...collapsedOrders, ...nonOrderEntries);

  const transportSeen = new Set<string>();
  const transportTripSeen = new Set<string>();
  const tripGroupMap = buildTripFeeGroupMap(dataset.packages);
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

    const tripNumber = String(pkg.trip_number || '').trim().toUpperCase();
    const tripKey = tripTransportGroupKey(tripNumber, packBarcode, pkg);
    if (transportTripSeen.has(tripKey)) continue;

    const group = tripGroupMap.get(tripKey);
    const packBarcodes = group?.packBarcodes ?? [packBarcode];
    for (const code of packBarcodes) transportSeen.add(code);
    transportTripSeen.add(tripKey);

    const fee = group?.fee ?? parseFinanceAmount(pkg.transport_fee);
    const paid = isTripTransportFeePaid(packBarcodes, dataset.paidTransportBarcodes);
    const originKey = ownershipKeyFromStoreCode(pkg.origin_store_code || '');
    const originLabel = ownerLabel(originKey, String(pkg.origin_store_name || ''));
    const packCount = group?.packCount ?? 1;
    const subtitle =
      tripNumber && packCount > 1
        ? `${originLabel} → ${legDestination} · 车次 ${tripNumber} · ${packCount} 包`
        : tripNumber
          ? `${originLabel} → ${legDestination} · 车次 ${tripNumber} · ${packBarcode}`
          : `${originLabel} → ${legDestination} · ${packBarcode}`;

    entries.push({
      id: tripNumber ? `transport:trip:${tripNumber}` : `transport:${packBarcode}`,
      category: 'transport_cost',
      title: '运输成本 · 装车车费',
      subtitle,
      amount: paid ? 0 : fee,
      amountDisplay: paid ? '已支付' : fee > 0 ? `−${formatMmk(fee)}` : '待登记车费',
      transportFee: fee,
      paid,
      occurredAt: String(pkg.truck_loaded_at || pkg.updated_at || ''),
      barcode: group?.primaryPackBarcode || packBarcode,
      itemName: String(pkg.pack_name || packBarcode),
      destination: legDestination,
      originKey,
      originLabel,
      transportDirection: 'inbound',
    });
  }

  entries.push(...dataset.manualEntries.map(manualEntry));
  entries.push(
    ...(dataset.remittances ?? []).map((row) => remittanceEntry(row, storeCode)),
  );
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
    agencyRemittedTotal:
      'agencyRemittedTotal' in station ? Number(station.agencyRemittedTotal) || 0 : 0,
    manualIncomeTotal:
      'manualIncomeTotal' in station ? Number(station.manualIncomeTotal) || 0 : 0,
    manualExpenseTotal:
      'manualExpenseTotal' in station ? Number(station.manualExpenseTotal) || 0 : 0,
  };
}
