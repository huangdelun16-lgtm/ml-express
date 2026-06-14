const SPEC_RE = /^\s*(\S*)\s*x\s*(\S*)\s*x\s*(\S*)\s*cm\s*$/i;
const UNIT_RE = /^\s*(\S*)\s*Pcs\s*$/i;
const WEIGHT_RE = /^\s*(\S*)\s*Kg\s*$/i;

export type SpecParts = { l: string; w: string; h: string };
export type UnitPart = { n: string };
export type WeightPart = { n: string };

export function sanitizeNumberInput(raw: string): string {
  return raw.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
}

export function parseSpec(value: string): SpecParts {
  const trimmed = value.trim();
  if (!trimmed) return { l: '', w: '', h: '' };
  const m = trimmed.match(SPEC_RE);
  if (m) return { l: m[1], w: m[2], h: m[3] };
  return { l: '', w: '', h: '' };
}

export function formatSpec(parts: SpecParts): string {
  const { l, w, h } = parts;
  if (!l && !w && !h) return '';
  return `${l || '0'} x ${w || '0'} x ${h || '0'} cm`;
}

export function parseUnit(value: string): UnitPart {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '件') return { n: '1' };
  const m = trimmed.match(UNIT_RE);
  if (m) return { n: m[1] || '1' };
  if (/^Pcs$/i.test(trimmed)) return { n: '1' };
  return { n: '1' };
}

export function formatUnit(parts: UnitPart): string {
  const n = parts.n.trim() || '1';
  return `${n} Pcs`;
}

export function parseWeight(value: string): WeightPart {
  const trimmed = value.trim();
  if (!trimmed) return { n: '' };
  const m = trimmed.match(WEIGHT_RE);
  if (m) return { n: m[1] };
  return { n: sanitizeNumberInput(trimmed) };
}

export function formatWeight(parts: WeightPart): string {
  const n = parts.n.trim();
  if (!n) return '';
  return `${n} Kg`;
}

/** 库存展示用：固定 Pcs */
export function stockUnitLabel(): string {
  return 'Pcs';
}

export function isCustomerSignedItem(item: {
  customer_signed?: boolean;
  customer_signed_at?: string;
}): boolean {
  return item.customer_signed || Boolean(item.customer_signed_at?.trim());
}

/** 列表卡片右上角数量：
 * - 已签收 → 0（客户已取走）
 * - 已到站待签收 → 1（可交付，即使在快递包内）
 * - 已打包未到站 → 0（已装包待发）
 * - 其余按库存/入库件数
 */
export function resolveItemCardQty(item: {
  qty_on_hand: number;
  unit?: string;
  stocked_in?: boolean;
  packed?: boolean;
  packed_at?: string;
  hub_arrived?: boolean;
  customer_signed?: boolean;
  customer_signed_at?: string;
}): number {
  if (isCustomerSignedItem(item)) return 0;

  if (item.hub_arrived) {
    if (item.qty_on_hand > 0) return item.qty_on_hand;
    return 1;
  }

  if (item.packed || Boolean(item.packed_at?.trim())) return 0;

  if (item.qty_on_hand > 0) return item.qty_on_hand;

  // 库存为 0 时不读 unit 字段（unit 表示订单规格「1 Pcs」，不是当前可交付件数）
  return 0;
}

/** 快递包内含订单件数：优先包内明细行，其次包裹 unit 字段（如 2 Pcs） */
export function resolvePackOrderCount(pack: { items: { qty?: number }[]; unit?: string }): number {
  let fromLines = 0;
  for (const line of pack.items) {
    fromLines += Math.max(1, Number(line.qty) || 0);
  }
  if (fromLines > 0) return fromLines;
  const unitN = Number(parseUnit(pack.unit ?? '').n);
  if (Number.isFinite(unitN) && unitN > 0) return unitN;
  return 0;
}

export function parseWeightKg(value: string): number {
  const n = parseWeight(value).n;
  if (!n) return 0;
  const num = Number(n);
  return Number.isFinite(num) ? num : 0;
}

export function sumPackageWeightsKg(weights: string[]): string {
  const total = weights.reduce((acc, w) => acc + parseWeightKg(w), 0);
  if (total <= 0) return '';
  return total % 1 === 0 ? String(total) : total.toFixed(2);
}
