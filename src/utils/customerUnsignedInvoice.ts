import {
  groupCustomerExpressItems,
  parsePackagingStockInLineBarcode,
} from './packagingStockInDisplay';

export type UnsignedInvoiceSource = {
  id: string;
  inboundBarcode: string;
  expressBarcode: string;
  destination: string;
  origin: string;
  weightKg: number;
  /** 多个入库包裹本体上的总重。明细行自己的 weightKg 通常是 0。 */
  packWeightKg?: number;
  qty: number;
  fee: number;
  /** 入库锁定的人民币。没有这个字段时，从 inboundNote 的「报价 X CNY」读取。 */
  quoteCny?: number;
  inboundNote?: string;
  paymentLabel: string;
  paymentStatus: string;
  customerSigned?: boolean;
  transportStatus: string;
  packedBundleBarcode?: string | null;
};

export type UnsignedInvoiceOrderGroup = {
  kind: 'single' | 'packaging';
  expressNos: string[];
  /** 单个入库是这一单的重量；多个入库是整个包裹的总重，只记一次。 */
  weightKg: number;
  /** 这一单或这一包的入库人民币，多个入库只记一次。 */
  quoteCny: number;
};

export type UnsignedCustomerInvoice = {
  groups: UnsignedInvoiceOrderGroup[];
  pieceCount: number;
  totalWeightKg: number;
  totalQuoteCny: number;
  /** 没有人民币报价时沿用的旧缅币。有报价时由汇率现算，不用这个数。 */
  totalFeeMmk: number;
  destination: string;
  stationCodes: string[];
  packNo: string;
  payment: string;
};

/** 勾选多个入库中的一件时，同一批未签收订单一起选上。已签收的不进选择。 */
export function packagingBatchSelectionIds<
  T extends { id: string; inboundBarcode: string; customerSigned?: boolean; transportStatus?: string | null },
>(items: T[], id: string): string[] {
  const target = items.find((item) => item.id === id);
  if (!target || !isUnsignedExpressItem(target)) return [];
  const parsed = parsePackagingStockInLineBarcode(target.inboundBarcode);
  if (!parsed || parsed.total <= 1) return [id];
  const siblings = items.filter((item) => {
    const row = parsePackagingStockInLineBarcode(item.inboundBarcode);
    return row?.base === parsed.base && isUnsignedExpressItem(item);
  });
  return siblings.length ? siblings.map((item) => item.id) : [id];
}

export function isUnsignedExpressItem(item: {
  customerSigned?: boolean;
  transportStatus?: string | null;
}): boolean {
  if (item.customerSigned) return false;
  return String(item.transportStatus || '').trim() !== '已签收';
}

function uniqueLabels(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const text = String(raw || '').trim();
    if (!text || text === '—' || seen.has(text.toUpperCase())) continue;
    seen.add(text.toUpperCase());
    out.push(text);
  }
  return out;
}

const QUOTE_CNY_PATTERN = /(?:报价|Quote)\s+([\d.]+)\s*CNY/i;

function groupWeightKg(items: UnsignedInvoiceSource[]): number {
  const positive = items.map((item) => item.weightKg).filter((kg) => kg > 0);
  if (positive.length === 0) return 0;
  if (positive.length === 1) return positive[0];
  return positive.reduce((sum, kg) => sum + kg, 0);
}

function readPackWeightKg(items: UnsignedInvoiceSource[]): number {
  for (const item of items) {
    const kg = Number(item.packWeightKg);
    if (Number.isFinite(kg) && kg > 0) return kg;
  }
  return 0;
}

function packShellCodes(items: UnsignedInvoiceSource[]): Set<string> {
  const codes = new Set<string>();
  for (const item of items) {
    const code = String(item.packedBundleBarcode || '').trim().toUpperCase();
    if (code) codes.add(code);
  }
  return codes;
}

function isPackShell(item: UnsignedInvoiceSource, shells: Set<string>): boolean {
  const code = String(item.inboundBarcode || '').trim().toUpperCase();
  return Boolean(code && shells.has(code));
}

/** 多个入库：优先用包裹本体总重；否则把同一批各行的重量合成一次。 */
function packagingWeightKg(items: UnsignedInvoiceSource[], allItems: UnsignedInvoiceSource[]): number {
  const pack = readPackWeightKg(items);
  if (pack > 0) return pack;
  const shells = packShellCodes(items);
  for (const item of allItems) {
    const code = String(item.inboundBarcode || '').trim().toUpperCase();
    if (code && shells.has(code) && item.weightKg > 0) return item.weightKg;
  }
  return groupWeightKg(items);
}

export function readUnsignedQuoteCny(item: UnsignedInvoiceSource): number {
  const direct = Number(item.quoteCny);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const match = String(item.inboundNote || '').match(QUOTE_CNY_PATTERN);
  if (!match) return 0;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

/**
 * 多个入库的报价写在每一行备注里，账单只收一次。
 * 这一批都还没签收：选中任意一件就收这一次。
 * 第一件已经签收：报价算在第一件上，不再向剩下的件收取。
 */
function packagingQuoteCny(
  items: UnsignedInvoiceSource[],
  picked: UnsignedInvoiceSource[],
): number {
  const shared = Math.max(0, ...items.map((item) => readUnsignedQuoteCny(item)));
  if (!(shared > 0) || !picked.length) return 0;
  const anySigned = items.some((item) => !isUnsignedExpressItem(item));
  if (!anySigned) return shared;
  const primary = items[0];
  return primary && picked.some((item) => item.id === primary.id) ? shared : 0;
}

/** 勾选的未签收订单合成一张发票。多个入库总费用只计一次；已签收的费用不再计入。 */
export function buildUnsignedCustomerInvoice(
  items: UnsignedInvoiceSource[],
  selectedIds: Iterable<string>,
): UnsignedCustomerInvoice {
  const selected = new Set(selectedIds);
  const shells = packShellCodes(items);
  const groups = groupCustomerExpressItems(items);
  const orderGroups: UnsignedInvoiceOrderGroup[] = [];
  const weightParts: number[] = [];
  const packCodes: Array<string | null | undefined> = [];
  let totalFeeMmk = 0;
  let totalQuoteCny = 0;
  const pickedItems: UnsignedInvoiceSource[] = [];

  for (const group of groups) {
    if (group.type === 'single') {
      const item = group.item;
      if (!selected.has(item.id) || !isUnsignedExpressItem(item) || isPackShell(item, shells)) continue;
      pickedItems.push(item);
      packCodes.push(item.packedBundleBarcode);
      const quoteCny = readUnsignedQuoteCny(item);
      const weightKg = item.weightKg > 0 ? item.weightKg : 0;
      orderGroups.push({
        kind: 'single',
        expressNos: uniqueLabels([item.expressBarcode]),
        weightKg,
        quoteCny,
      });
      weightParts.push(weightKg);
      totalQuoteCny += quoteCny;
      if (item.fee > 0) totalFeeMmk += item.fee;
      continue;
    }

    const picked = group.items.filter((item) => selected.has(item.id) && isUnsignedExpressItem(item));
    if (!picked.length) continue;
    pickedItems.push(...picked);
    packCodes.push(...group.items.map((item) => item.packedBundleBarcode));
    const quoteCny = packagingQuoteCny(group.items, picked);
    const weightKg = packagingWeightKg(group.items, items);
    orderGroups.push({
      kind: 'packaging',
      expressNos: uniqueLabels(picked.map((item) => item.expressBarcode)),
      weightKg,
      quoteCny,
    });
    weightParts.push(weightKg);
    totalQuoteCny += quoteCny;

    const anySigned = group.items.some((item) => !isUnsignedExpressItem(item));
    if (anySigned) {
      for (let i = 0; i < picked.length; i += 1) {
        if (picked[i].fee > 0) totalFeeMmk += picked[i].fee;
      }
    } else if (group.sharedFee > 0) {
      totalFeeMmk += group.sharedFee;
    }
  }

  const expressCount = orderGroups.reduce((sum, group) => sum + Math.max(group.expressNos.length, 1), 0);

  return {
    groups: orderGroups,
    pieceCount: expressCount,
    totalWeightKg: weightParts.reduce((sum, kg) => sum + kg, 0),
    totalQuoteCny,
    totalFeeMmk,
    destination: uniqueLabels(pickedItems.map((item) => item.destination)).join(' · '),
    stationCodes: uniqueLabels(pickedItems.map((item) => item.destination)),
    packNo: uniqueLabels(packCodes).join(' · '),
    payment: uniqueLabels(pickedItems.map((item) => item.paymentLabel || item.paymentStatus)).join(' · '),
  };
}

export function formatUnsignedInvoiceWeight(kg: number): string {
  if (!(kg > 0)) return '';
  const n = kg % 1 === 0 ? String(kg) : String(Math.round(kg * 100) / 100);
  return `${n} Kg`;
}

export function formatUnsignedInvoiceFee(mmk: number, freeLabel: string): string {
  if (!(mmk > 0)) return `0 MMK · ${freeLabel}`;
  return `${Math.round(mmk).toLocaleString('en-US')} MMK`;
}

export function formatUnsignedInvoiceQuote(cny: number): string {
  if (!(cny > 0) || !Number.isFinite(cny)) return '';
  const text = cny.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return `¥${text}`;
}

export function formatUnsignedInvoiceRate(rate: number | null): string {
  if (rate == null || !(rate > 0) || !Number.isFinite(rate)) return '';
  const rounded = Math.round(rate * 100) / 100;
  const text = rounded.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return `1 CNY = ${text} MMK`;
}

/** 有入库人民币时，缅币 = 报价 × 总部汇率。没有报价才沿用旧的缅币。没有汇率就不能结算。 */
export function settleUnsignedInvoice(
  quoteCny: number,
  rate: number | null,
  legacyFeeMmk: number,
): { feeMmk: number; missingRate: boolean } {
  if (quoteCny > 0) {
    if (rate == null || !(rate > 0) || !Number.isFinite(rate)) {
      return { feeMmk: 0, missingRate: true };
    }
    return { feeMmk: Math.round(quoteCny * rate), missingRate: false };
  }
  return {
    feeMmk: legacyFeeMmk > 0 ? Math.round(legacyFeeMmk) : 0,
    missingRate: false,
  };
}
