import type { FinanceLedgerEntry } from '../types/financeLedger';
import { destinationCodesMatch } from './destinationCode';
import { ownershipKeyFromStoreCode } from './storeOwnership';

export type StationReconciliationSummary = {
  collectedTotal: number;
  transportUnpaidTotal: number;
  transportPaidTotal: number;
  pendingInflowTotal: number;
  agencyPayableTotal: number;
};

/** 跨境财务页汇总（与中转站流水页规则不同） */
export type CrossBorderFinanceSummary = StationReconciliationSummary & {
  manualIncomeTotal: number;
  manualExpenseTotal: number;
};

function classifyLedgerEntry(
  entry: FinanceLedgerEntry,
  storeCode: string,
  hubCode: string,
): { bucket: string; amount: number } | null {
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
    return { bucket: 'dest_pending_agency', amount: amt };
  }

  if (entry.category === 'order_income_cod' && destHere && originHere) {
    return { bucket: 'dest_pending_local', amount: amt };
  }

  if (
    (entry.category === 'order_collected' || entry.category === 'order_prepaid') &&
    destHere &&
    agency
  ) {
    return { bucket: 'dest_agency_collected', amount: amt };
  }

  if (entry.category === 'order_collected' && destHere && originHere) {
    return { bucket: 'dest_local_collected', amount: amt };
  }

  return null;
}

/** 与 Admin「中转站」表格及 inventoryFinanceAggregate 同源逻辑 */
export function buildStationReconciliationSummary(
  entries: FinanceLedgerEntry[],
  storeCode: string,
  hubCode: string,
): StationReconciliationSummary {
  const buckets: Record<string, number> = {
    origin_prepaid: 0,
    dest_local_collected: 0,
    dest_pending_local: 0,
    dest_pending_agency: 0,
    dest_agency_collected: 0,
    transport_out: 0,
    transport_in_unpaid: 0,
    transport_in_paid: 0,
    transport_out_paid: 0,
  };

  for (const entry of entries) {
    const cls = classifyLedgerEntry(entry, storeCode, hubCode);
    if (!cls) continue;
    buckets[cls.bucket] = (buckets[cls.bucket] ?? 0) + cls.amount;
  }

  const round = (n: number) => Math.round(n);
  const collectedTotal = round(buckets.origin_prepaid + buckets.dest_local_collected);
  const transportUnpaidTotal = round(buckets.transport_out + buckets.transport_in_unpaid);
  const transportPaidTotal = round(buckets.transport_in_paid + buckets.transport_out_paid);
  const pendingInflowTotal = round(buckets.dest_pending_local + buckets.dest_pending_agency);
  const agencyPayableTotal = round(buckets.dest_agency_collected);

  return {
    collectedTotal,
    transportUnpaidTotal,
    transportPaidTotal,
    pendingInflowTotal,
    agencyPayableTotal,
  };
}

/**
 * 跨境财务页汇总：
 * - 已收：本站预付 + 本站已签收（含代收签收）
 * - 待付/已付车费：仅运达站（装车出库所选目的地账号），不含发站 outbound
 * - 待入账：其它地区入库后装车发往本站的到付待收（不含始发站、不含本站始发）
 */
export function buildCrossBorderFinanceSummary(
  entries: FinanceLedgerEntry[],
  storeCode: string,
  hubCode: string,
): CrossBorderFinanceSummary {
  const buckets: Record<string, number> = {
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

  const round = (n: number) => Math.round(n);

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
