export type SignedInvoiceDocument = {
  invoiceNo: string;
  meta: Array<{ label: string; value: string }>;
  lines: Array<{ title: string; expressNos: string[]; measure: string }>;
  totals: string[];
  payNote: string;
  contactLabel: string;
  contactPhoneLabel: string;
  contactPhones: string;
  contactKpay: string;
  contactSite: string;
};

export type SignedInvoiceListItem = {
  id: string;
  invoiceNo: string;
  issuedOn: string;
  customerName: string;
  phone: string;
  tripLabel: string;
  pieceCount: number;
  storeCode: string;
  totalFeeCny: number | null;
  totalFeeMmk: number;
  signedAt: string;
  document: SignedInvoiceDocument;
};

const STATION_LABELS = new Set(['收货站', 'Receiving station', 'လက်ခံဂိတ်']);

const TOTAL_LABELS: Array<{ kind: 'weight' | 'quote' | 'rate' | 'fee'; labels: string[] }> = [
  { kind: 'weight', labels: ['总重量', 'Total weight', 'စုစုပေါင်းအလေးချိန်'] },
  { kind: 'quote', labels: ['入库报价', 'Inbound quote', 'စာရင်းသွင်း ဈေး'] },
  { kind: 'rate', labels: ['汇率', 'Rate', 'ငွေလဲ'] },
  { kind: 'fee', labels: ['总费用', 'Total fee', 'စုစုပေါင်းခ'] },
];

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function asDocument(value: unknown, invoiceNo: string): SignedInvoiceDocument {
  const doc = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const meta = Array.isArray(doc.meta)
    ? doc.meta.flatMap((item) => {
        if (!item || typeof item !== 'object') return [];
        const row = item as { label?: unknown; value?: unknown };
        const label = text(row.label);
        if (!label) return [];
        return [{ label, value: text(row.value) }];
      })
    : [];
  const lines = Array.isArray(doc.lines)
    ? doc.lines.flatMap((item) => {
        if (!item || typeof item !== 'object') return [];
        const row = item as { title?: unknown; expressNos?: unknown; measure?: unknown };
        const expressNos = Array.isArray(row.expressNos) ? row.expressNos.map((no) => text(no)).filter(Boolean) : [];
        return [{ title: text(row.title), expressNos, measure: text(row.measure) }];
      })
    : [];
  return {
    invoiceNo: text(doc.invoiceNo) || invoiceNo,
    meta,
    lines,
    totals: Array.isArray(doc.totals) ? doc.totals.map((line) => text(line)).filter(Boolean) : [],
    payNote: text(doc.payNote),
    contactLabel: text(doc.contactLabel),
    contactPhoneLabel: text(doc.contactPhoneLabel),
    contactPhones: text(doc.contactPhones),
    contactKpay: text(doc.contactKpay),
    contactSite: text(doc.contactSite),
  };
}

export function normalizeSignedInvoiceRow(raw: unknown): SignedInvoiceListItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const id = text(row.id);
  const invoiceNo = text(row.invoice_no);
  if (!id || !invoiceNo) return null;
  const cny = Number(row.total_fee_cny);
  const mmk = Number(row.total_fee_mmk);
  return {
    id,
    invoiceNo,
    issuedOn: text(row.issued_on).slice(0, 10),
    customerName: text(row.customer_name),
    phone: text(row.phone),
    tripLabel: text(row.trip_label),
    pieceCount: Number.isFinite(Number(row.piece_count)) && Number(row.piece_count) > 0 ? Math.round(Number(row.piece_count)) : 0,
    storeCode: text(row.store_code),
    totalFeeCny: Number.isFinite(cny) && cny > 0 ? cny : null,
    totalFeeMmk: Number.isFinite(mmk) && mmk > 0 ? mmk : 0,
    signedAt: text(row.signed_at),
    document: asDocument(row.document, invoiceNo),
  };
}

export function signedInvoiceAmountLabel(row: Pick<SignedInvoiceListItem, 'totalFeeCny' | 'totalFeeMmk'>): string {
  if (row.totalFeeCny != null && row.totalFeeCny > 0) {
    return `¥${row.totalFeeCny.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  }
  if (row.totalFeeMmk > 0) return `${Math.round(row.totalFeeMmk).toLocaleString('en-US')} MMK`;
  return '—';
}

export function signedInvoiceStation(row: SignedInvoiceListItem): string {
  const named = row.document.meta.find((item) => STATION_LABELS.has(item.label))?.value.trim() || '';
  return named || row.storeCode;
}

export function signedInvoiceMatches(row: SignedInvoiceListItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const extras = [
    ...row.document.meta.map((item) => item.value),
    ...row.document.lines.flatMap((line) => line.expressNos),
  ];
  return [row.invoiceNo, row.customerName, row.phone, row.tripLabel, row.issuedOn, row.storeCode, signedInvoiceStation(row), ...extras]
    .join(' ')
    .toLowerCase()
    .includes(q);
}

export function splitSignedInvoiceTotals(
  lines: string[],
): Array<{ kind: 'weight' | 'quote' | 'rate' | 'fee'; label: string; value: string }> {
  const labels = TOTAL_LABELS.flatMap((group) => group.labels.map((label) => ({ kind: group.kind, label }))).sort(
    (a, b) => b.label.length - a.label.length,
  );
  const out: Array<{ kind: 'weight' | 'quote' | 'rate' | 'fee'; label: string; value: string }> = [];
  for (const line of lines) {
    const textLine = line.trim();
    if (!textLine || /KG\s*=/i.test(textLine)) continue;
    const matched = labels.find((item) => textLine === item.label || textLine.startsWith(item.label));
    if (!matched) continue;
    out.push({
      kind: matched.kind,
      label: matched.label,
      value: textLine.slice(matched.label.length).trim() || '—',
    });
  }
  return out;
}
