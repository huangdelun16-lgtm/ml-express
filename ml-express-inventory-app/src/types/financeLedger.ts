export type FinanceLedgerCategory =
  | 'order_income_cod'
  | 'order_prepaid'
  | 'order_collected'
  | 'transport_cost'
  | 'stock_op';

export interface FinanceLedgerEntry {
  id: string;
  category: FinanceLedgerCategory;
  title: string;
  subtitle: string;
  amount: number | null;
  amountDisplay: string;
  occurredAt: string;
  barcode: string;
  itemName: string;
  destination?: string;
  originLabel?: string;
}

export interface FinanceLedgerSummary {
  /** 到付待收（目的站尚未签收） */
  codPendingTotal: number;
  /** 预付 / 到付已签收 */
  collectedTotal: number;
  /** 本站应付运输成本（装车车费） */
  transportCostTotal: number;
}

export interface FinanceLedgerResult {
  entries: FinanceLedgerEntry[];
  summary: FinanceLedgerSummary;
}
