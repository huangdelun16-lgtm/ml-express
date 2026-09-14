export type HubReceiveScanLine = {
  id: string;
  barcode: string;
  name: string;
  customerCode: string;
  customerName: string;
  canSign: boolean;
  alreadySigned: boolean;
  hub_arrived_at?: string | null;
  customer_signed_at?: string | null;
  final_destination?: string | null;
  destination?: string | null;
  owner_store_code?: string | null;
};

export type HubReceiveScanGroup = {
  key: string;
  customerCode: string;
  customerName: string;
  lines: HubReceiveScanLine[];
  signable: HubReceiveScanLine[];
};

export function normalizeCustomerSignCode(raw?: string | null): string {
  return String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

export function hubReceiveScanGroupKey(line: HubReceiveScanLine): string {
  if (line.customerCode) return `code:${line.customerCode}`;
  return `solo:${line.id}`;
}

export function upsertHubReceiveScanLine(
  lines: HubReceiveScanLine[],
  next: HubReceiveScanLine,
): { lines: HubReceiveScanLine[]; duplicate: boolean } {
  if (lines.some((row) => row.id === next.id || row.barcode === next.barcode)) {
    return { lines, duplicate: true };
  }
  return { lines: [...lines, next], duplicate: false };
}

export function removeHubReceiveScanIds(
  lines: HubReceiveScanLine[],
  ids: Iterable<string>,
): HubReceiveScanLine[] {
  const drop = new Set(ids);
  return lines.filter((row) => !drop.has(row.id));
}

/** 有客户编码的订单并成一组；没有编码的各算一单，避免误并。 */
export function groupHubReceiveScanLines(lines: HubReceiveScanLine[]): HubReceiveScanGroup[] {
  const groups = new Map<string, HubReceiveScanGroup>();
  for (const line of lines) {
    const key = hubReceiveScanGroupKey(line);
    const existing = groups.get(key);
    if (existing) {
      existing.lines.push(line);
      if (line.canSign && !line.alreadySigned) existing.signable.push(line);
      if (!existing.customerName && line.customerName) existing.customerName = line.customerName;
      continue;
    }
    groups.set(key, {
      key,
      customerCode: line.customerCode,
      customerName: line.customerName,
      lines: [line],
      signable: line.canSign && !line.alreadySigned ? [line] : [],
    });
  }
  return [...groups.values()];
}
