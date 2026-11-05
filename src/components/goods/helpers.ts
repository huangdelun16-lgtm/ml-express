import type { GoodsHolding, GoodsParty, GoodsProduct } from '../../services/goodsTradeService';

export type Tab = 'home' | 'products' | 'purchase' | 'consign' | 'sale' | 'parties';
export type ConsignMode = 'send' | 'recall';
export type StockFilter = 'all' | 'empty' | 'supplier';
export type Editor =
  | null
  | { kind: 'product'; product?: GoodsProduct }
  | { kind: 'supplier' | 'customer'; party?: GoodsParty };
export type Copy = (zh: string, enText: string, myText?: string) => string;

export const GOODS_UNITS = ['个数', '件数', '公斤'] as const;

export function mmk(n: number): string {
  return `${Math.round(n).toLocaleString('en-US')} MMK`;
}

export function today(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function explain(err: unknown, missing: string, fallback: string): string {
  const raw = err instanceof Error ? err.message : '';
  if (/goods_products|goods_supplier_stock|goods_movement_totals|schema cache/i.test(raw)) return missing;
  return raw || fallback;
}

export function holdingQty(holdings: GoodsHolding[], productId: string, supplierId: string): number {
  return holdings.find((row) => row.product_id === productId && row.supplier_id === supplierId)?.qty ?? 0;
}

export function readQty(raw: string): number | null {
  if (!/^[1-9]\d*$/.test(raw.trim())) return null;
  return Number(raw.trim());
}

export function readMoney(raw: string): number | null {
  const cleaned = raw.replace(/[,\s]/g, '');
  if (cleaned === '' || !/^\d+$/.test(cleaned)) return null;
  return Number(cleaned);
}

export function stockState(row: GoodsProduct): 'empty' | 'supplier' | 'ok' {
  const total = row.qty_on_hand + row.qty_with_supplier;
  if (total <= 0) return 'empty';
  if (row.qty_on_hand <= 0) return 'supplier';
  return 'ok';
}
