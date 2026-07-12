import type { InventoryStoreSession } from './authService';
import type { FinanceLedgerEntry, FinanceLedgerResult } from '../types/financeLedger';
import { listMovements } from './inventoryService';

const empty = { codPendingTotal: 0, collectedTotal: 0, transportCostTotal: 0, transportPaidTotal: 0, transportUnpaidTotal: 0, pendingInflowTotal: 0, agencyPayableTotal: 0, manualIncomeTotal: 0, manualExpenseTotal: 0 };
/** Finance rows are derived directly from Supabase-backed stock movements. */
export async function listFinanceLedger(_store: InventoryStoreSession, _hubCode: string): Promise<FinanceLedgerResult> {
  const entries: FinanceLedgerEntry[] = (await listMovements(500)).map((movement) => ({
    id: `op:${movement.id}`, category: 'stock_op', title: `${movement.type === 'in' ? '入库' : movement.type === 'out' ? '出库' : '调整'} · ${movement.item_name}`,
    subtitle: `${movement.barcode} · ${movement.operator}`, amount: null,
    amountDisplay: `${movement.type === 'out' ? '−' : '+'}${movement.qty}`, occurredAt: movement.created_at,
    barcode: movement.barcode, itemName: movement.item_name, destination: movement.destination, originLabel: movement.origin_store_name,
  }));
  return { entries, summary: empty };
}
export async function listCrossBorderFinance(store: InventoryStoreSession, hubCode: string): Promise<FinanceLedgerResult> {
  const result = await listFinanceLedger(store, hubCode);
  return { ...result, entries: result.entries.filter((entry) => entry.category !== 'stock_op') };
}
