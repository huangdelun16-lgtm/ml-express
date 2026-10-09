export type PackagingStockInBarcode = {
  base: string;
  total: number;
  index: number;
};

export function parsePackagingStockInLineBarcode(
  barcode: string,
): PackagingStockInBarcode | null {
  const trimmed = String(barcode || '').trim();
  const match = trimmed.match(/^(.+)\((\d+)-(\d+)\)$/);
  if (!match) return null;
  const total = Number(match[2]);
  const index = Number(match[3]);
  if (!Number.isFinite(total) || !Number.isFinite(index) || total < 1 || index < 1 || index > total) {
    return null;
  }
  return { base: match[1], total, index };
}

export type PackagingDisplayItem = {
  id: string;
  inboundBarcode: string;
  fee: number;
};

export type CustomerExpressDisplayGroup<T extends PackagingDisplayItem> =
  | { type: 'single'; item: T }
  | {
      type: 'packaging';
      base: string;
      declaredTotal: number;
      items: T[];
      sharedFee: number;
    };

/** 客户明细只列出有快递单号的订单。包装外壳没有快递单，不进这张表。 */
export function hasCustomerExpressNo(expressBarcode: string | null | undefined): boolean {
  const code = String(expressBarcode || '').trim();
  return Boolean(code && code !== '—' && code !== '-');
}

/** 客户快递明细：同一基础入库号合成一组，总费用只取一次 */
export function groupCustomerExpressItems<T extends PackagingDisplayItem>(
  items: T[],
): CustomerExpressDisplayGroup<T>[] {
  const used = new Set<string>();
  const groups: CustomerExpressDisplayGroup<T>[] = [];

  for (const item of items) {
    if (used.has(item.id)) continue;
    const parsed = parsePackagingStockInLineBarcode(item.inboundBarcode);
    if (!parsed) {
      used.add(item.id);
      groups.push({ type: 'single', item });
      continue;
    }

    const siblings = items
      .filter((row) => parsePackagingStockInLineBarcode(row.inboundBarcode)?.base === parsed.base)
      .sort((a, b) => {
        const ia = parsePackagingStockInLineBarcode(a.inboundBarcode)?.index ?? 99;
        const ib = parsePackagingStockInLineBarcode(b.inboundBarcode)?.index ?? 99;
        return ia - ib;
      });
    siblings.forEach((row) => used.add(row.id));

    if (siblings.length === 1 && parsed.total <= 1) {
      groups.push({ type: 'single', item });
      continue;
    }

    groups.push({
      type: 'packaging',
      base: parsed.base,
      declaredTotal: parsed.total,
      items: siblings,
      sharedFee: Math.max(0, ...siblings.map((row) => Number(row.fee) || 0)),
    });
  }

  return groups;
}

type PackagingWeightRow = {
  weight: string;
  weightKg: number;
  fee: number;
  quoteCny?: number;
  packWeightKg?: number;
};

function formatPackKg(kg: number): string {
  const n = Math.round(kg * 100) / 100;
  return `${n} Kg`;
}

/**
 * 多个入库的整包重量在包裹本体上，明细行自己的重量是空的。
 * 只写在记下费用的那一单上，同批其余件仍保持空，避免每件都看起来有一份总重。
 */
export function packagingFeeRowWeight<T extends PackagingWeightRow>(item: T, siblings: T[]): string {
  const own = String(item.weight || '').trim();
  if (item.weightKg > 0 && own && own !== '—') return own;
  const carriesFee = (Number(item.fee) || 0) > 0 || (Number(item.quoteCny) || 0) > 0;
  if (!carriesFee) return own || '—';
  let pack = Number(item.packWeightKg) || 0;
  for (const row of siblings) {
    const kg = Number(row.packWeightKg) || 0;
    if (kg > pack) pack = kg;
  }
  if (pack > 0) return formatPackKg(pack);
  return own || '—';
}
