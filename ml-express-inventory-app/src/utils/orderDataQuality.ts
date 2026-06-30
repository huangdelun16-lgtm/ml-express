import type { OrderDataIssue, OrderDataIssueCode } from '../types/opsHealth';

export function detectOrderDataIssueCodes(input: {
  customer_name?: string;
  recipient_name?: string;
  recipient_phone?: string;
  destination?: string;
  final_destination?: string;
  customer_signed_at?: string;
  stocked_in?: boolean;
}): OrderDataIssueCode[] {
  if (input.customer_signed_at?.trim()) return [];

  const name = (input.customer_name ?? input.recipient_name ?? '').trim();
  const phone = (input.recipient_phone ?? '').trim();
  const dest = (input.final_destination ?? input.destination ?? '').trim();
  const issues: OrderDataIssueCode[] = [];

  if (!name) issues.push('missing_customer');
  if (!phone) issues.push('missing_phone');
  if (!dest) issues.push('missing_destination');

  return issues;
}

export function buildOrderDataIssues(
  rows: Array<{
    id: string;
    barcode: string;
    name: string;
    customer_name?: string;
    recipient_name?: string;
    recipient_phone?: string;
    destination?: string;
    final_destination?: string;
    customer_signed_at?: string;
    stocked_in?: boolean;
  }>,
): OrderDataIssue[] {
  const out: OrderDataIssue[] = [];
  for (const row of rows) {
    if (!row.stocked_in) continue;
    const issues = detectOrderDataIssueCodes(row);
    if (issues.length === 0) continue;
    out.push({
      itemId: row.id,
      barcode: row.barcode,
      name: row.name,
      issues,
    });
  }
  return out;
}
