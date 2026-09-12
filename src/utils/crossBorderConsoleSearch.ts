export function normalizeSearch(value: string): string {
  return String(value || '').trim().toLowerCase();
}

export function digitsOnly(value: string): string {
  return String(value || '').replace(/\D/g, '');
}

export function compactSearch(value: string): string {
  return normalizeSearch(value).replace(/[\s\-_.]/g, '');
}

export function matchesConsoleQuery(
  query: string,
  ...fields: Array<string | null | undefined>
): boolean {
  const q = normalizeSearch(query);
  if (!q) return true;

  const parts = fields
    .map((field) => String(field || '').trim())
    .filter(Boolean);
  const text = parts.join(' ');
  const norm = normalizeSearch(text);
  const compactQ = compactSearch(q);

  if (q.length < 3) {
    return parts.some((field) => {
      const n = normalizeSearch(field);
      const c = compactSearch(n);
      return n === q || n.startsWith(q) || (compactQ && (c === compactQ || c.startsWith(compactQ)));
    });
  }

  if (norm.includes(q)) return true;
  if (compactQ.length >= 3 && compactSearch(norm).includes(compactQ)) return true;

  const digitsQ = digitsOnly(q);
  if (digitsQ.length >= 3 && digitsOnly(text).includes(digitsQ)) return true;

  return false;
}

export type RegisteredCustomerSearchable = {
  customer_name?: string | null;
  phone?: string | null;
  customer_code?: string | null;
  notify_account?: string | null;
  address_notes?: string | null;
  salesperson_employee_code?: string | null;
};

export type CustomerSummarySearchable = {
  customerKey?: string | null;
  customerCode?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
};

export type PackSearchable = {
  pack_barcode?: string | null;
  pack_name?: string | null;
  trip_number?: string | null;
  origin_store_code?: string | null;
  destination_code?: string | null;
  leg_destination_code?: string | null;
};

export type OrderSearchable = {
  order_barcode?: string | null;
  express_barcode?: string | null;
  pack_barcode?: string | null;
  order_name?: string | null;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  destination_code?: string | null;
};

export function filterRegisteredCustomers<T extends RegisteredCustomerSearchable>(
  rows: T[],
  query: string,
): T[] {
  if (!normalizeSearch(query)) return rows;
  return rows.filter((row) =>
    matchesConsoleQuery(
      query,
      row.customer_name,
      row.phone,
      row.customer_code,
      row.notify_account,
      row.address_notes,
      row.salesperson_employee_code,
    ),
  );
}

export function filterCustomerSummaries<T extends CustomerSummarySearchable>(
  rows: T[],
  query: string,
): T[] {
  if (!normalizeSearch(query)) return rows;
  return rows.filter((row) =>
    matchesConsoleQuery(
      query,
      row.customerKey,
      row.customerCode,
      row.customerName,
      row.customerPhone,
    ),
  );
}

export function filterPacks<T extends PackSearchable>(rows: T[], query: string): T[] {
  if (!normalizeSearch(query)) return rows;
  return rows.filter((row) => {
    const leg = row.leg_destination_code || row.destination_code || '';
    return matchesConsoleQuery(
      query,
      row.pack_barcode,
      row.pack_name,
      row.trip_number,
      row.origin_store_code,
      row.destination_code,
      row.leg_destination_code,
      row.origin_store_code && leg ? `${row.origin_store_code} → ${leg}` : '',
    );
  });
}

export function filterOrders<T extends OrderSearchable>(rows: T[], query: string): T[] {
  if (!normalizeSearch(query)) return rows;
  return rows.filter((row) =>
    matchesConsoleQuery(
      query,
      row.order_barcode,
      row.express_barcode,
      row.pack_barcode,
      row.order_name,
      row.recipient_name,
      row.recipient_phone,
      row.destination_code,
    ),
  );
}
