export type FinanceLedgerCategory =
  | 'order_income_cod'
  | 'order_prepaid'
  | 'order_collected'
  | 'transport_cost'
  | 'manual_income'
  | 'manual_expense'
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
  originKey?: string;
  transportFee?: number;
  paid?: boolean;
  transportDirection?: 'inbound' | 'outbound';
}

export interface FinanceLedgerSummary {
  /** 到付待收（本站目的待收，与 Admin 待入账一致） */
  codPendingTotal: number;
  /** 已收（预付 + 本站签收，与 Admin 已收 MMK 一致） */
  collectedTotal: number;
  /** 待支付运输成本（未付装车车费） */
  transportCostTotal: number;
  /** 已支付运输成本 */
  transportPaidTotal: number;
  transportUnpaidTotal: number;
  /** 本站待收订单款（不含发站在途到付） */
  pendingInflowTotal: number;
  /** 代收应转给发站（对账单明细，不计入待支付车费） */
  agencyPayableTotal: number;
  manualIncomeTotal: number;
  manualExpenseTotal: number;
}

export interface FinanceLedgerResult {
  entries: FinanceLedgerEntry[];
  summary: FinanceLedgerSummary;
}
