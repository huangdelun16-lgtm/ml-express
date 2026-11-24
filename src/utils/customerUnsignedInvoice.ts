import {
  groupCustomerExpressItems,
  parsePackagingStockInLineBarcode,
} from './packagingStockInDisplay';
import { heavierVolumetricFromSpec } from './volumetricWeight';

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
  /** 装车车次。发票抬头用来找这一张单。 */
  tripNumber?: string | null;
  /** 客户定价窗口里的人民币/公斤。发票「定价」用这个，不把整包总价当成单价。 */
  unitCnyPerKg?: number | null;
  /** 这一件自己的规格。多个入库的明细行通常是空的。 */
  spec?: string;
  /** 多个入库包裹本体的规格。体积重量按这一包算一次。 */
  packSpec?: string;
  /** 入库时记下的收费方式。没记下时，体积更大就按体积公斤收费。 */
  chargeBasis?: 'volume' | 'weight' | '';
  /** 入库时记下的收费公斤。 */
  chargeWeightKg?: number;
};

export type UnsignedInvoiceOrderGroup = {
  kind: 'single' | 'packaging';
  expressNos: string[];
  /** 单个入库是这一单的重量；多个入库是整个包裹的总重，只记一次。 */
  weightKg: number;
  /** 这一单或这一包的入库人民币，多个入库只记一次。 */
  quoteCny: number;
  /** 每公斤人民币。多个入库的重量在包裹上，单价仍要单独写出来。 */
  unitCnyPerKg?: number;
  /** 体积重量比这一行的实际重量大时才有。发票多写一行，不改实际重量。 */
  volumetricKg?: number;
  /** 用来乘单价的公斤。只在和实际重量不同时带上。 */
  chargeKg?: number;
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
  /** 勾选订单上的车次，多个车次用「 · 」连起来。没装车则为空。 */
  tripNo: string;
  /** 勾选里还有没装车的订单。抬头要同时写出车次和未装车。 */
  tripIncomplete: boolean;
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

function roundCny(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function noteCharge(item: UnsignedInvoiceSource): { basis?: 'volume' | 'weight'; kg?: number } {
  const text = String(item.inboundNote || '');
  const match = text.match(/收费(体积|重量)\s+([\d.]+)\s*Kg/i);
  if (match) {
    const kg = Number(match[2]);
    return {
      basis: match[1] === '体积' ? 'volume' : 'weight',
      ...(Number.isFinite(kg) && kg > 0 ? { kg } : {}),
    };
  }
  if (/收费体积/.test(text)) return { basis: 'volume' };
  if (/收费重量/.test(text)) return { basis: 'weight' };
  return {};
}

/** 有单价时按收费公斤算。体积更大，或入库记了按体积，就不用秤上的重量。 */
function billableKg(
  actualKg: number,
  volumetricKg: number | undefined,
  items: UnsignedInvoiceSource[],
): number {
  const noted = items.map(noteCharge);
  const basis =
    items.map((item) => item.chargeBasis).find((value) => value === 'volume' || value === 'weight') ||
    noted.map((row) => row.basis).find((value) => value === 'volume' || value === 'weight');
  if (basis === 'weight') return actualKg;
  const stored = items
    .map((item) => Number(item.chargeWeightKg))
    .find((kg) => Number.isFinite(kg) && kg > 0);
  const notedKg = noted.map((row) => row.kg).find((kg) => kg != null && kg > 0);
  if (basis === 'volume') {
    if (stored != null && stored > 0) return stored;
    if (notedKg != null && notedKg > 0) return notedKg;
  }
  if (volumetricKg != null && volumetricKg > actualKg) return volumetricKg;
  return actualKg;
}

function chargeQuoteCny(unitCnyPerKg: number, chargeKg: number, storedQuote: number): number {
  if (unitCnyPerKg > 0 && chargeKg > 0) return roundCny(unitCnyPerKg * chargeKg);
  return storedQuote > 0 ? storedQuote : 0;
}

export function formatCustomerChargeKgText(kg: number): string {
  if (!(kg > 0)) return '—';
  const n = Math.round(kg * 100) / 100;
  return `${n % 1 === 0 ? String(n) : String(n)} Kg`;
}

/** 客户名单上用来收费的公斤。多个入库按整包算一次。 */
export function customerListedChargeKg(
  item: UnsignedInvoiceSource,
  siblings: UnsignedInvoiceSource[] = [],
): number {
  const group = siblings.length ? siblings : [item];
  const pack = Math.max(0, ...group.map((row) => Number(row.packWeightKg) || 0));
  const actual = pack > 0 ? pack : item.weightKg > 0 ? item.weightKg : 0;
  const spec = pack > 0
    ? group.map((row) => String(row.packSpec || '').trim()).find(Boolean) || ''
    : String(item.spec || '').trim();
  return billableKg(actual, volumetricKgFor(spec, actual), group);
}

/** 多个入库只在记下费用的那一行写出收费公斤。 */
export function packagingListedChargeText(
  item: UnsignedInvoiceSource,
  siblings: UnsignedInvoiceSource[],
): string {
  const carries = (Number(item.fee) || 0) > 0 || (Number(item.quoteCny) || 0) > 0;
  if (!carries) return '—';
  return formatCustomerChargeKgText(customerListedChargeKg(item, siblings));
}

function groupUnitCny(items: UnsignedInvoiceSource[]): number {
  for (const item of items) {
    const n = Number(item.unitCnyPerKg);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function readSpec(items: UnsignedInvoiceSource[], packaged: boolean): string {
  if (packaged) {
    for (const item of items) {
      const spec = String(item.packSpec || item.spec || '').trim();
      if (spec) return spec;
    }
    return '';
  }
  return String(items[0]?.spec || '').trim();
}

function volumetricKgFor(spec: string, actualKg: number): number | undefined {
  if (!(actualKg > 0) || !spec) return undefined;
  return heavierVolumetricFromSpec(spec, String(actualKg))?.kg;
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

export function readUnsignedQuoteCny(item: { quoteCny?: number; inboundNote?: string }): number {
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
      const unitCnyPerKg = groupUnitCny([item]);
      const weightKg = item.weightKg > 0 ? item.weightKg : 0;
      const volumetricKg = volumetricKgFor(readSpec([item], false), weightKg);
      const chargeKg = billableKg(weightKg, volumetricKg, [item]);
      const quoteCny = chargeQuoteCny(unitCnyPerKg, chargeKg, readUnsignedQuoteCny(item));
      orderGroups.push({
        kind: 'single',
        expressNos: uniqueLabels([item.expressBarcode]),
        weightKg,
        quoteCny,
        ...(unitCnyPerKg > 0 ? { unitCnyPerKg } : {}),
        ...(volumetricKg != null ? { volumetricKg } : {}),
        ...(chargeKg > 0 && chargeKg !== weightKg ? { chargeKg } : {}),
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
    const weightKg = packagingWeightKg(group.items, items);
    const volumetricKg = volumetricKgFor(readSpec(group.items, true), weightKg);
    const unitCnyPerKg = groupUnitCny(group.items);
    const chargeKg = billableKg(weightKg, volumetricKg, group.items);
    const quoteCny = chargeQuoteCny(
      unitCnyPerKg,
      chargeKg,
      packagingQuoteCny(group.items, picked),
    );
    orderGroups.push({
      kind: 'packaging',
      expressNos: uniqueLabels(picked.map((item) => item.expressBarcode)),
      weightKg,
      quoteCny,
      ...(unitCnyPerKg > 0 ? { unitCnyPerKg } : {}),
      ...(volumetricKg != null ? { volumetricKg } : {}),
      ...(chargeKg > 0 && chargeKg !== weightKg ? { chargeKg } : {}),
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
    tripNo: uniqueLabels(pickedItems.map((item) => item.tripNumber?.trim().toUpperCase())).join(' · '),
    tripIncomplete: pickedItems.some((item) => !String(item.tripNumber || '').trim()),
    payment: uniqueLabels(pickedItems.map((item) => item.paymentLabel || item.paymentStatus)).join(' · '),
  };
}

/** 同一张开票内容得到同一个发票号：有车次用日期-车次，没装车用日期-目的地-件数。 */
export function formatInvoiceDocumentNo(input: {
  issuedOn: string;
  trips: string[];
  destination: string;
  pieceCount: number;
}): string {
  const day = input.issuedOn.replace(/\D/g, '').slice(0, 8);
  const trips = uniqueLabels(input.trips.map((trip) => trip.trim().toUpperCase())).map((trip) =>
    trip.replace(/[^A-Z0-9]/g, ''),
  ).filter(Boolean);
  if (trips.length) return [day, ...trips].filter(Boolean).join('-');
  const dest = (input.destination.split('·')[0] || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase() || 'ML';
  const pieces = input.pieceCount > 0 ? String(input.pieceCount) : '0';
  return [day, dest, pieces].filter(Boolean).join('-');
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

/** 发票行上的定价是每公斤单价，不是这一单的总价。 */
export function formatUnsignedInvoiceUnitPrice(quoteCny: number, weightKg: number): string {
  if (!(quoteCny > 0) || !(weightKg > 0) || !Number.isFinite(quoteCny) || !Number.isFinite(weightKg)) {
    return '';
  }
  const unit = quoteCny / weightKg;
  const text =
    Math.abs(unit - Math.round(unit)) < 1e-6
      ? String(Math.round(unit))
      : String(Number(unit.toFixed(4)));
  return `¥${text}/Kg`;
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
