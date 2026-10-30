import { fmt } from '../i18n/format';
import { formatInvoiceUnitPrice, formatInvoiceWeight } from './batchSignInvoice';
import { formatCnyAmount, cnyToMmk } from './crossBorderFx';

export type FrozenInvoiceLineInput = {
  kind: 'single' | 'packaging';
  expressNos: string[];
  weightKg: number;
  cnyPerKg?: number | null;
};

export type FrozenSignedInvoiceLine = {
  title: string;
  expressNos: string[];
  measure: string;
};

export type FrozenSignedInvoiceDocument = {
  invoiceNo?: string;
  customerName: string;
  phone: string;
  destination: string;
  station: string;
  trip: string;
  packNo: string;
  pieceCount: number;
  payment: string;
  issuedOn: string;
  meta: Array<{ label: string; value: string }>;
  lines: FrozenSignedInvoiceLine[];
  totals: string[];
  totalFeeCny: number | null;
  totalFeeMmk: number;
  extraFeeCny?: number | null;
  extraFeeReason?: string;
  extraFeeMmk?: number;
  payNote: string;
  contactLabel: string;
  contactPhoneLabel: string;
  contactPhones: string;
  contactKpay: string;
  contactSite: string;
};

export type FrozenInvoiceHandoff = {
  document: FrozenSignedInvoiceDocument;
  itemIds: string[];
};

type MeasureTemplates = {
  lineMeasure: string;
  lineWeight: string;
  packMeasure: string;
  packWeight: string;
};

export function invoiceLineMeasure(line: FrozenInvoiceLineInput, templates: MeasureTemplates): string {
  const weightText = formatInvoiceWeight(line.weightKg);
  if (!weightText) return '';
  const unitPrice =
    line.cnyPerKg != null && line.cnyPerKg >= 0 ? formatInvoiceUnitPrice(line.cnyPerKg) : '';
  const template = unitPrice
    ? line.kind === 'packaging'
      ? templates.packMeasure
      : templates.lineMeasure
    : line.kind === 'packaging'
      ? templates.packWeight
      : templates.lineWeight;
  return fmt(template, { weight: weightText, price: unitPrice });
}

export function buildFrozenSignedInvoiceDocument(input: {
  customerName: string;
  phone: string;
  destination: string;
  station: string;
  trip: string;
  notLoadedLabel: string;
  packNo: string;
  pieceCount: number;
  payment: string;
  issuedOn: string;
  labels: {
    customer: string;
    phone: string;
    destination: string;
    station: string;
    trip: string;
    packNo: string;
    pieces: string;
    payment: string;
    date: string;
    totalWeight: string;
    totalFee: string;
    waybill: string;
    orderNos: string;
  };
  lines: Array<FrozenInvoiceLineInput & { title?: string }>;
  measureTemplates: MeasureTemplates;
  totalWeight: string;
  totalQuote: string;
  totalRate: string;
  unitRates: string[];
  totalFee: string;
  totalFeeCny: number | null;
  totalFeeMmk: number;
  extraFeeCny?: number | null;
  extraFeeReason?: string;
  extraFeeMmk?: number;
  extraFeeLabel?: string;
  payNote: string;
  contactLabel: string;
  contactPhoneLabel: string;
  contactPhones: string;
  contactKpay: string;
  contactSite: string;
}): FrozenSignedInvoiceDocument {
  const trip = input.trip.trim() || input.notLoadedLabel;
  const meta: Array<{ label: string; value: string }> = [
    { label: input.labels.customer, value: input.customerName.trim() || '—' },
  ];
  if (input.phone.trim()) meta.push({ label: input.labels.phone, value: input.phone.trim() });
  if (input.destination.trim()) {
    meta.push({ label: input.labels.destination, value: input.destination.trim() });
  }
  if (input.station.trim()) meta.push({ label: input.labels.station, value: input.station.trim() });
  meta.push({ label: input.labels.trip, value: trip });
  if (input.packNo.trim()) meta.push({ label: input.labels.packNo, value: input.packNo.trim() });
  meta.push({ label: input.labels.pieces, value: String(input.pieceCount) });
  if (input.payment.trim()) meta.push({ label: input.labels.payment, value: input.payment.trim() });
  meta.push({ label: input.labels.date, value: input.issuedOn });

  const totals = [
    `${input.labels.totalWeight} ${input.totalWeight || '—'}`,
    ...[input.totalQuote, ...input.unitRates, input.totalRate].map((line) => line.trim()).filter(Boolean),
  ];
  const extraCny = input.extraFeeCny != null && input.extraFeeCny > 0 ? input.extraFeeCny : 0;
  const extraReason = input.extraFeeReason?.trim() || '';
  if (extraCny > 0 && extraReason) {
    totals.push(
      `${input.extraFeeLabel || '附加费'} ${extraReason} ¥${formatCnyAmount(extraCny)}`,
    );
  }
  totals.push(`${input.labels.totalFee} ${input.totalFee || '—'}`);

  return {
    customerName: input.customerName.trim(),
    phone: input.phone.trim(),
    destination: input.destination.trim(),
    station: input.station.trim(),
    trip,
    packNo: input.packNo.trim(),
    pieceCount: input.pieceCount,
    payment: input.payment.trim(),
    issuedOn: input.issuedOn,
    meta,
    lines: input.lines.map((line) => ({
      title: line.title?.trim() || (line.kind === 'packaging' ? input.labels.orderNos : input.labels.waybill),
      expressNos: line.expressNos.length ? line.expressNos : ['—'],
      measure: invoiceLineMeasure(line, input.measureTemplates),
    })),
    totals,
    totalFeeCny: input.totalFeeCny != null && input.totalFeeCny > 0 ? input.totalFeeCny : null,
    totalFeeMmk: input.totalFeeMmk > 0 ? input.totalFeeMmk : 0,
    extraFeeCny: extraCny > 0 ? extraCny : null,
    extraFeeReason: extraCny > 0 ? extraReason : '',
    extraFeeMmk: extraCny > 0 ? input.extraFeeMmk || 0 : 0,
    payNote: input.payNote,
    contactLabel: input.contactLabel,
    contactPhoneLabel: input.contactPhoneLabel,
    contactPhones: input.contactPhones,
    contactKpay: input.contactKpay,
    contactSite: input.contactSite,
  };
}

export type InvoiceExtraFeeInput = {
  active: boolean;
  cny: number;
  reason: string;
  invalidAmount: boolean;
  missingReason: boolean;
};

/** 没填金额就当没有附加费。填了金额就必须有原因。 */
export function readInvoiceExtraFee(amountRaw: string, reasonRaw: string): InvoiceExtraFeeInput {
  const amountText = amountRaw.trim();
  const reason = reasonRaw.trim();
  if (!amountText) {
    return { active: false, cny: 0, reason: '', invalidAmount: false, missingReason: false };
  }
  const cny = Number(amountText);
  if (!Number.isFinite(cny) || cny <= 0) {
    return { active: false, cny: 0, reason, invalidAmount: true, missingReason: false };
  }
  if (!reason) {
    return { active: false, cny, reason: '', invalidAmount: false, missingReason: true };
  }
  return { active: true, cny, reason, invalidAmount: false, missingReason: false };
}

/** 附加费按发票上的汇率折成缅币，加进总费用。没有汇率时不能开票。 */
export function invoiceTotalsWithExtra(input: {
  freightCny: number | null;
  freightMmk: number;
  rate: number | null;
  extraCny: number;
}): { totalFeeCny: number | null; totalFeeMmk: number; extraMmk: number; missingRate: boolean } {
  if (!(input.extraCny > 0)) {
    return {
      totalFeeCny: input.freightCny,
      totalFeeMmk: input.freightMmk,
      extraMmk: 0,
      missingRate: false,
    };
  }
  if (input.rate == null || input.rate <= 0) {
    return { totalFeeCny: input.freightCny, totalFeeMmk: input.freightMmk, extraMmk: 0, missingRate: true };
  }
  const extraMmk = cnyToMmk(input.extraCny, input.rate) ?? 0;
  const freightCny = input.freightCny != null && input.freightCny > 0 ? input.freightCny : 0;
  return {
    totalFeeCny: freightCny + input.extraCny,
    totalFeeMmk: input.freightMmk + extraMmk,
    extraMmk,
    missingRate: false,
  };
}
