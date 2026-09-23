import { parsePackagingStockInLineBarcode } from './inboundBarcode';
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
  /** 运达站读不到包装商品时，用车次追踪上的整包重量 */
  tracked_pack_weight?: string | null;
  pack?: {
    weight?: string | null;
    items?: Array<{ item_id?: string; input_barcode?: string | null }>;
  } | null;
};

export type BatchSignInvoiceLine = {
  kind: 'single' | 'packaging';
  expressNos: string[];
  weightKg: number;
  feeMmk: number;
};

export type BatchSignInvoiceModel = {
  lines: BatchSignInvoiceLine[];
  totalWeightKg: number;
  totalFeeMmk: number;
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

export function buildBatchSignInvoice(details: BatchSignInvoiceSource[]): BatchSignInvoiceModel {
  const seen = new Set<string>();
  const lines: BatchSignInvoiceLine[] = [];

  for (const row of details) {
    const base = parsePackagingStockInLineBarcode(row.barcode)?.base ?? null;
    const groupKey = base ?? `single:${row.id}`;
    if (seen.has(groupKey)) continue;
    seen.add(groupKey);

    if (!base) {
      const expressNos = uniqueExpressNos([row.input_barcode]);
      lines.push({
        kind: 'single',
        expressNos,
        weightKg: parseWeightKg(row.weight ?? ''),
        feeMmk: parseFeeMmk(row.total_fee),
      });
      continue;
    }

    const group = details.filter(
      (item) => parsePackagingStockInLineBarcode(item.barcode)?.base === base,
    );
    lines.push({
      kind: 'packaging',
      expressNos: packagingExpressNos(group),
      weightKg: packagingWeightKg(group),
      feeMmk: Math.max(0, ...group.map((item) => parseFeeMmk(item.total_fee))),
    });
  }

  return {
    lines,
    totalWeightKg: lines.reduce((sum, line) => sum + line.weightKg, 0),
    totalFeeMmk: lines.reduce((sum, line) => sum + line.feeMmk, 0),
  };
}
