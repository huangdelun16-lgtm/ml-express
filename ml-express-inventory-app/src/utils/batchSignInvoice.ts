import { normalizePackDestination } from '../constants/destinationOptions';
import { parsePackagingStockInLineBarcode } from './inboundBarcode';
import { cnyToMmk, formatCnyInput, mmkToCny } from './crossBorderFx';
import { normalizeDestinationCode } from './destinationCode';
import { formatWeight, parseWeightKg } from './itemFieldFormat';

function parseFeeMmk(raw: string | number | null | undefined): number {
  const n = Number(String(raw ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export type BatchSignInvoiceSource = {
  id: string;
  barcode: string;
  input_barcode?: string | null;
  weight?: string | null;
  total_fee?: string | null;
  /** 入库锁定的人民币。有报价时，缅币按传入汇率现算，不用旧的总费用。 */
  quote_cny?: string | null;
  /** 运达站读不到包装商品时，用车次追踪上的整包重量 */
  tracked_pack_weight?: string | null;
  owner_store_code?: string | null;
  final_destination?: string | null;
  customer_code?: string | null;
  pack?: {
    weight?: string | null;
    items?: Array<{ item_id?: string; input_barcode?: string | null }>;
  } | null;
};

export type BatchSignInvoiceRoute = {
  originCode: string;
  destinationCode: string;
  customerCode: string;
};

export type BatchSignInvoiceLine = {
  kind: 'single' | 'packaging';
  expressNos: string[];
  weightKg: number;
  feeMmk: number;
  /** 客户定价里这条路线。发站和终点对不上时为 null。 */
  route: BatchSignInvoiceRoute | null;
};

export type InvoiceRateLookup = {
  perKgMmk: number;
  mmkPerCny: number | null;
  fromRouteMatrix: boolean;
};

export type BatchSignInvoiceModel = {
  lines: BatchSignInvoiceLine[];
  totalWeightKg: number;
  totalFeeMmk: number;
  /** 入库锁定人民币。没有报价时为 null，沿用已写入的缅币。 */
  totalFeeCny: number | null;
  /** 总部设置里最后保存的汇率。1 CNY = rate MMK */
  rate: number | null;
  /** 有人民币报价但没有汇率，不能打出缅币 */
  missingRate: boolean;
};

function uniqueExpressNos(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const code = String(raw || '').trim();
    if (!code) continue;
    const key = code.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(code);
  }
  return out;
}

function packBelongsToGroup(
  group: BatchSignInvoiceSource[],
  pack: NonNullable<BatchSignInvoiceSource['pack']>,
): boolean {
  const groupIds = new Set(group.map((row) => row.id));
  const packIds = (pack.items ?? [])
    .map((line) => line.item_id)
    .filter((id): id is string => Boolean(id));
  if (packIds.length === 0) return true;
  return packIds.every((id) => groupIds.has(id));
}

function packagingWeightKg(group: BatchSignInvoiceSource[]): number {
  const pack = group.find((row) => row.pack)?.pack ?? null;
  if (pack && packBelongsToGroup(group, pack)) {
    const packWeight = parseWeightKg(pack.weight ?? '');
    if (packWeight > 0) return packWeight;
  }
  const tracked = group
    .map((row) => parseWeightKg(row.tracked_pack_weight ?? ''))
    .find((kg) => kg > 0);
  if (tracked) return tracked;
  return group.map((row) => parseWeightKg(row.weight ?? '')).find((kg) => kg > 0) ?? 0;
}

function packagingExpressNos(group: BatchSignInvoiceSource[]): string[] {
  const groupIds = new Set(group.map((row) => row.id));
  const fromItems = group
    .slice()
    .sort((a, b) => {
      const ia = parsePackagingStockInLineBarcode(a.barcode)?.index ?? 0;
      const ib = parsePackagingStockInLineBarcode(b.barcode)?.index ?? 0;
      return ia - ib;
    })
    .map((row) => row.input_barcode);
  const fromPack = group.flatMap(
    (row) =>
      row.pack?.items
        ?.filter((line) => !line.item_id || groupIds.has(line.item_id))
        .map((line) => line.input_barcode) ?? [],
  );
  return uniqueExpressNos([...fromItems, ...fromPack]);
}

export function formatInvoiceWeight(kg: number): string {
  if (!(kg > 0)) return '';
  const n = kg % 1 === 0 ? String(kg) : String(Math.round(kg * 100) / 100);
  return formatWeight({ n });
}

export function formatInvoiceExpressNos(codes: string[], emptyLabel = '—'): string {
  return codes.length ? codes.join(' · ') : emptyLabel;
}

function hubCodeOf(raw: string | null | undefined): string {
  const text = String(raw ?? '').trim();
  if (!text) return '';
  return normalizePackDestination(text) || normalizeDestinationCode(text);
}

function routeFromGroup(group: BatchSignInvoiceSource[]): BatchSignInvoiceRoute | null {
  let originCode = '';
  let destinationCode = '';
  let customerCode = '';
  for (const row of group) {
    if (!originCode) originCode = hubCodeOf(row.owner_store_code);
    if (!destinationCode) destinationCode = hubCodeOf(row.final_destination);
    if (!customerCode) customerCode = String(row.customer_code ?? '').trim().toUpperCase();
  }
  if (!originCode || !destinationCode || originCode === destinationCode) return null;
  return { originCode, destinationCode, customerCode };
}

/** 客户定价单价。同一价格只写一行，顺序跟发票上的路线一致。 */
export function formatInvoiceUnitRateLines(cnyPerKg: number[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of cnyPerKg) {
    if (!Number.isFinite(raw) || raw < 0) continue;
    const label = `1KG=${formatCnyInput(raw)}RMB`;
    if (seen.has(label)) continue;
    seen.add(label);
    out.push(label);
  }
  return out;
}

export async function resolveInvoiceUnitRateLabels(
  lines: BatchSignInvoiceLine[],
  fallbackRate: number | null,
  lookup: (route: BatchSignInvoiceRoute) => Promise<InvoiceRateLookup | null>,
): Promise<string[]> {
  const prices: number[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const route = line.route;
    if (!route) continue;
    const key = `${route.originCode}|${route.destinationCode}|${route.customerCode}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const found = await lookup(route);
    if (!found?.fromRouteMatrix) continue;
    const cny = mmkToCny(found.perKgMmk, found.mmkPerCny ?? fallbackRate);
    if (cny == null || cny < 0) continue;
    prices.push(cny);
  }
  return formatInvoiceUnitRateLines(prices);
}

function parseQuoteCny(raw?: string | null): number | null {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return null;
  const n = Number(trimmed.replace(/[^\d.]/g, ''));
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function settledFee(
  quotes: Array<number | null>,
  legacyMmk: number[],
  rate: number | null,
): { cny: number | null; mmk: number; missingRate: boolean } {
  const known = quotes.filter((quote): quote is number => quote != null);
  if (!known.length) {
    return { cny: null, mmk: Math.max(0, ...legacyMmk, 0), missingRate: false };
  }
  const cny = Math.max(0, ...known);
  if (cny > 0 && (rate == null || rate <= 0)) {
    return { cny, mmk: 0, missingRate: true };
  }
  return { cny, mmk: cnyToMmk(cny, rate) ?? 0, missingRate: false };
}

export function buildBatchSignInvoice(
  details: BatchSignInvoiceSource[],
  rate: number | null = null,
): BatchSignInvoiceModel {
  const seen = new Set<string>();
  const lines: BatchSignInvoiceLine[] = [];
  let totalFeeCny = 0;
  let sawQuote = false;
  let missingRate = false;

  for (const row of details) {
    const base = parsePackagingStockInLineBarcode(row.barcode)?.base ?? null;
    const groupKey = base ?? `single:${row.id}`;
    if (seen.has(groupKey)) continue;
    seen.add(groupKey);

    const group = base
      ? details.filter((item) => parsePackagingStockInLineBarcode(item.barcode)?.base === base)
      : [row];
    const money = settledFee(
      group.map((item) => parseQuoteCny(item.quote_cny)),
      group.map((item) => parseFeeMmk(item.total_fee)),
      rate,
    );
    if (money.cny != null) {
      sawQuote = true;
      totalFeeCny += money.cny;
    }
    if (money.missingRate) missingRate = true;

    if (!base) {
      const expressNos = uniqueExpressNos([row.input_barcode]);
      lines.push({
        kind: 'single',
        expressNos,
        weightKg: parseWeightKg(row.weight ?? ''),
        feeMmk: money.mmk,
        route: routeFromGroup(group),
      });
      continue;
    }

    lines.push({
      kind: 'packaging',
      expressNos: packagingExpressNos(group),
      weightKg: packagingWeightKg(group),
      feeMmk: money.mmk,
      route: routeFromGroup(group),
    });
  }

  return {
    lines,
    totalWeightKg: lines.reduce((sum, line) => sum + line.weightKg, 0),
    totalFeeMmk: lines.reduce((sum, line) => sum + line.feeMmk, 0),
    totalFeeCny: sawQuote ? totalFeeCny : null,
    rate: rate != null && rate > 0 ? rate : null,
    missingRate,
  };
}
