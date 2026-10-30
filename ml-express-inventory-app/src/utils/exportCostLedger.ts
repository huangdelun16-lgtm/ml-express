import type { FinanceLedgerEntry } from '../types/financeLedger';

export type ExportCostLedgerSource = {
  id: string;
  displayBarcode: string;
  customerName: string;
  legDestination: 'MSE' | 'LSO';
  weightKg: number;
  unitPriceCny: number;
  totalCny: number;
  totalMmk: number;
  payCurrency: 'CNY' | 'MMK';
  tripNumber: string;
  createdAt: string;
};

function moneyText(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const rounded = Math.round(value * 100) / 100;
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(2);
}

function legName(code: string): string {
  if (code === 'MSE') return '木姐';
  if (code === 'LSO') return '腊戌';
  return code;
}

/** 已保存的出口成本变成瑞丽跨境会计里的一笔支出。人民币和缅币保持原币，不互相折算。 */
export function exportCostLedgerEntry(row: ExportCostLedgerSource): FinanceLedgerEntry {
  const mmk = row.payCurrency === 'MMK';
  const totalCny = Math.round(row.totalCny * 100) / 100;
  const totalMmk = Math.round(row.totalMmk);
  const dest = legName(row.legDestination);
  const barcode = row.displayBarcode.trim() || row.id;
  return {
    id: `export:${row.id}`,
    category: 'export_cost',
    title: barcode,
    subtitle: [
      `瑞丽 → ${dest}`,
      `${moneyText(row.weightKg)} Kg × ¥${moneyText(row.unitPriceCny)}`,
      row.tripNumber ? `车次 ${row.tripNumber}` : '',
      row.customerName.trim(),
    ]
      .filter(Boolean)
      .join(' · '),
    amount: mmk ? totalMmk : totalCny,
    amountDisplay: mmk ? `${totalMmk.toLocaleString('en-US')} MMK` : `¥${moneyText(totalCny)}`,
    occurredAt: row.createdAt,
    barcode,
    itemName: barcode,
    destination: row.legDestination,
    paid: true,
    paidCurrency: mmk ? 'MMK' : 'CNY',
    paidCny: mmk ? 0 : totalCny,
  };
}

export function sumExportCostTotals(entries: FinanceLedgerEntry[]): { cny: number; mmk: number } {
  let cny = 0;
  let mmk = 0;
  for (const entry of entries) {
    if (entry.category !== 'export_cost') continue;
    if (entry.paidCurrency === 'CNY') cny += entry.paidCny || 0;
    else mmk += entry.amount || 0;
  }
  return { cny: Math.round(cny * 100) / 100, mmk: Math.round(mmk) };
}
