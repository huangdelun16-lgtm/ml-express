import { formatMmk } from './crossBorderFinanceTabs';

function mmkToCny(mmk: number, rate: number | null): number | null {
  if (rate == null || rate <= 0 || !Number.isFinite(rate) || !Number.isFinite(mmk)) return null;
  return mmk / rate;
}

function formatCnyAmount(cny: number): string {
  if (!Number.isFinite(cny)) return '—';
  return cny.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatMmkAmount(mmk: number): string {
  if (!Number.isFinite(mmk)) return '—';
  return Math.round(mmk).toLocaleString('en-US');
}

export type FinanceHeroSummary = {
  collectedTotal: number;
  transportUnpaidTotal: number;
  transportPaidTotal: number;
  pendingInflowTotal: number;
  manualIncomeTotal: number;
  manualExpenseTotal: number;
};

export type DualAmount = {
  value: string;
  subValue: string | null;
};

export type FinanceHeroView = {
  customerLedgerMmk: number;
  myanmarLedgerMmk: number;
  customerCny: number | null;
  collected: DualAmount;
  pending: DualAmount;
  manualIncome: DualAmount;
};

export type FinanceCapsuleLine =
  | { kind: 'split'; customerCny: number; myanmarLedgerMmk: number }
  | { kind: 'net'; netBalance: number };

function customerMetric(mmk: number, rate: number | null): DualAmount {
  const cny = mmkToCny(mmk, rate);
  if (cny == null) {
    return { value: `${formatMmk(mmk)} MMK`, subValue: null };
  }
  return {
    value: `¥${formatCnyAmount(cny)}`,
    subValue: `${formatMmkAmount(mmk)} MMK`,
  };
}

function customerMetricFromCny(mmk: number, cny: number | null): DualAmount {
  if (cny == null) {
    return { value: `${formatMmk(mmk)} MMK`, subValue: null };
  }
  return {
    value: `¥${formatCnyAmount(cny)}`,
    subValue: `${formatMmkAmount(mmk)} MMK`,
  };
}

export function buildFinanceHeroView(
  summary: FinanceHeroSummary,
  settledCny: number | null,
  rate: number | null,
): FinanceHeroView {
  const customerLedgerMmk =
    summary.collectedTotal + summary.pendingInflowTotal + summary.manualIncomeTotal;
  const myanmarLedgerMmk =
    summary.transportUnpaidTotal + summary.transportPaidTotal + summary.manualExpenseTotal;
  const pendingCny = mmkToCny(summary.pendingInflowTotal, rate);
  const manualCny = mmkToCny(summary.manualIncomeTotal, rate);
  const collectedReady = summary.collectedTotal <= 0 || settledCny != null;
  const floatingReady = summary.pendingInflowTotal + summary.manualIncomeTotal <= 0 || rate != null;
  const customerCny =
    collectedReady && floatingReady
      ? (summary.collectedTotal > 0 ? settledCny ?? 0 : 0) + (pendingCny ?? 0) + (manualCny ?? 0)
      : null;

  return {
    customerLedgerMmk,
    myanmarLedgerMmk,
    customerCny,
    collected: customerMetricFromCny(summary.collectedTotal, settledCny),
    pending: customerMetric(summary.pendingInflowTotal, rate),
    manualIncome: customerMetric(summary.manualIncomeTotal, rate),
  };
}

export function buildFinanceCapsuleLine(view: FinanceHeroView, netBalance: number): FinanceCapsuleLine {
  if (view.customerCny != null) {
    return {
      kind: 'split',
      customerCny: view.customerCny,
      myanmarLedgerMmk: view.myanmarLedgerMmk,
    };
  }
  return { kind: 'net', netBalance };
}
