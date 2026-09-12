import { matchesConsoleQuery, normalizeSearch } from './crossBorderConsoleSearch';

export type RegisteredCustomerMergeSource = {
  id: string;
  customer_name?: string | null;
  phone?: string | null;
  customer_code?: string | null;
  notify_method?: string | null;
  notify_account?: string | null;
  address_notes?: string | null;
  salesperson_employee_code?: string | null;
};

export type CustomerSummaryMergeSource = {
  customerKey: string;
  customerCode?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
};

export type UnifiedConsoleCustomer<
  R extends RegisteredCustomerMergeSource = RegisteredCustomerMergeSource,
  S extends CustomerSummaryMergeSource = CustomerSummaryMergeSource,
> = {
  key: string;
  kind: 'registered' | 'express';
  registered?: R;
  summary?: S;
};

export function mergeConsoleCustomers<
  R extends RegisteredCustomerMergeSource,
  S extends CustomerSummaryMergeSource,
>(registered: R[], summaries: S[]): UnifiedConsoleCustomer<R, S>[] {
  const byCode = new Map<string, S>();
  for (const summary of summaries) {
    const code = String(summary.customerCode || '').trim().toUpperCase();
    if (code) byCode.set(code, summary);
  }

  const used = new Set<string>();
  const rows: UnifiedConsoleCustomer<R, S>[] = [];

  for (const row of registered) {
    const code = String(row.customer_code || '').trim().toUpperCase();
    const summary = code ? byCode.get(code) : undefined;
    if (code && summary) used.add(code);
    rows.push({
      key: `reg:${row.id}`,
      kind: 'registered',
      registered: row,
      summary,
    });
  }

  for (const summary of summaries) {
    const code = String(summary.customerCode || '').trim().toUpperCase();
    if (code && used.has(code)) continue;
    rows.push({
      key: `exp:${summary.customerKey}`,
      kind: 'express',
      summary,
    });
  }

  return rows;
}

export function filterUnifiedCustomers<
  R extends RegisteredCustomerMergeSource,
  S extends CustomerSummaryMergeSource,
>(rows: UnifiedConsoleCustomer<R, S>[], query: string): UnifiedConsoleCustomer<R, S>[] {
  if (!normalizeSearch(query)) return rows;
  return rows.filter((row) => {
    const registered = row.registered;
    const summary = row.summary;
    return matchesConsoleQuery(
      query,
      registered?.customer_name,
      registered?.phone,
      registered?.customer_code,
      registered?.notify_account,
      registered?.address_notes,
      registered?.salesperson_employee_code,
      summary?.customerName,
      summary?.customerPhone,
      summary?.customerCode,
      summary?.customerKey,
    );
  });
}
