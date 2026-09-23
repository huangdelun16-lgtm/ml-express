import { groupCustomerExpressItems } from './packagingStockInDisplay';

export type UnsignedInvoiceSource = {
  id: string;
  inboundBarcode: string;
  expressBarcode: string;
  destination: string;
  origin: string;
  weightKg: number;
  qty: number;
  fee: number;
  paymentLabel: string;
  paymentStatus: string;
  customerSigned?: boolean;
  transportStatus: string;
  packedBundleBarcode?: string | null;
};

export type UnsignedInvoiceOrderGroup = {
  kind: 'single' | 'packaging';
  expressNos: string[];
};

export type UnsignedCustomerInvoice = {
  groups: UnsignedInvoiceOrderGroup[];
  pieceCount: number;
  totalWeightKg: number;
  totalFeeMmk: number;
  destination: string;
  stationCodes: string[];
  packNo: string;
  payment: string;
};

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

function groupWeightKg(items: UnsignedInvoiceSource[]): number {
  const positive = items.map((item) => item.weightKg).filter((kg) => kg > 0);
  if (positive.length === 0) return 0;
  if (positive.length === 1) return positive[0];
  return positive.reduce((sum, kg) => sum + kg, 0);
}

/** 勾选的未签收订单合成一张发票。多个入库总费用只计一次；已签收的费用不再计入。 */
export function buildUnsignedCustomerInvoice(
  items: UnsignedInvoiceSource[],
  selectedIds: Iterable<string>,
): UnsignedCustomerInvoice {
  const selected = new Set(selectedIds);
  const groups = groupCustomerExpressItems(items);
  const orderGroups: UnsignedInvoiceOrderGroup[] = [];
  const weightParts: number[] = [];
  const packCodes: Array<string | null | undefined> = [];
  let totalFeeMmk = 0;
  const pickedItems: UnsignedInvoiceSource[] = [];

  for (const group of groups) {
    if (group.type === 'single') {
      const item = group.item;
      if (!selected.has(item.id) || !isUnsignedExpressItem(item)) continue;
      pickedItems.push(item);
      packCodes.push(item.packedBundleBarcode);
      orderGroups.push({
        kind: 'single',
        expressNos: uniqueLabels([item.expressBarcode]),
      });
      weightParts.push(item.weightKg > 0 ? item.weightKg : 0);
      if (item.fee > 0) totalFeeMmk += item.fee;
      continue;
    }

    const picked = group.items.filter((item) => selected.has(item.id) && isUnsignedExpressItem(item));
    if (!picked.length) continue;
    pickedItems.push(...picked);
    packCodes.push(...group.items.map((item) => item.packedBundleBarcode));
    orderGroups.push({
      kind: 'packaging',
      expressNos: uniqueLabels(picked.map((item) => item.expressBarcode)),
    });
    weightParts.push(groupWeightKg(picked));

    const anySigned = group.items.some((item) => !isUnsignedExpressItem(item));
    if (anySigned) {
      picked.forEach((item) => {
        if (item.fee > 0) totalFeeMmk += item.fee;
      });
    } else if (group.sharedFee > 0) {
      totalFeeMmk += group.sharedFee;
    }
  }

  const expressCount = orderGroups.reduce((sum, group) => sum + Math.max(group.expressNos.length, 1), 0);

  return {
    groups: orderGroups,
    pieceCount: expressCount,
    totalWeightKg: weightParts.reduce((sum, kg) => sum + kg, 0),
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
