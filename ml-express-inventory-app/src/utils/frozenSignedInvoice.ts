import { fmt } from '../i18n/format';
import { formatInvoiceUnitPrice, formatInvoiceWeight } from './batchSignInvoice';

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
    `${input.labels.totalFee} ${input.totalFee || '—'}`,
  ];

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
    payNote: input.payNote,
    contactLabel: input.contactLabel,
    contactPhoneLabel: input.contactPhoneLabel,
    contactPhones: input.contactPhones,
    contactKpay: input.contactKpay,
    contactSite: input.contactSite,
  };
}
