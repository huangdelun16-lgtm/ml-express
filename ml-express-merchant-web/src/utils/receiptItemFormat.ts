import type { MerchantReceiptItem } from './merchantReceiptTemplate';

const SUMMARY_ITEM_LABELS = new Set(['COD Collect', 'Item Cost', '代收款 COD', '商品费用']);

export function isReceiptSummaryItem(item: MerchantReceiptItem): boolean {
  return SUMMARY_ITEM_LABELS.has(item.label.trim());
}

export function getReceiptItemUnitPrice(item: MerchantReceiptItem): number | undefined {
  if (item.unitPrice != null && item.unitPrice > 0) return item.unitPrice;
  if (item.price != null && item.qty > 0 && !isReceiptSummaryItem(item)) {
    return Math.round(item.price / item.qty);
  }
  return undefined;
}

export type ReceiptItemDisplay = {
  lineText: string;
  amountText: string;
  isSummary: boolean;
};

export function formatReceiptItemDisplay(
  item: MerchantReceiptItem,
  productIndex: number | null,
  labelForPrint?: (label: string) => string,
): ReceiptItemDisplay {
  const label = labelForPrint ? labelForPrint(item.label) : item.label;
  const isSummary = isReceiptSummaryItem(item);

  if (isSummary) {
    return {
      lineText: `${label} x${item.qty}`,
      amountText: item.price != null ? `${item.price.toLocaleString()} MMK` : '-',
      isSummary: true,
    };
  }

  const prefix = productIndex != null ? `${productIndex}. ` : '';
  const unitPrice = getReceiptItemUnitPrice(item);
  return {
    lineText: `${prefix}${label} x${item.qty}`,
    amountText: unitPrice != null ? unitPrice.toLocaleString() : '-',
    isSummary: false,
  };
}

export function buildReceiptItemDisplays(
  items: MerchantReceiptItem[],
  labelForPrint?: (label: string) => string,
): ReceiptItemDisplay[] {
  let productIndex = 0;
  return items
    .filter((item) => item.label.trim())
    .map((item) => {
      if (isReceiptSummaryItem(item)) {
        return formatReceiptItemDisplay(item, null, labelForPrint);
      }
      productIndex += 1;
      return formatReceiptItemDisplay(item, productIndex, labelForPrint);
    });
}

export function formatReceiptItemEscPosLine(
  display: ReceiptItemDisplay,
  maxChars: number,
): string {
  const amount = display.amountText === '-' ? '' : display.amountText.replace(/\s*MMK$/, '');
  const base = display.lineText;
  if (!amount) return base;
  const gap = Math.max(1, maxChars - base.length - amount.length);
  const combined = `${base}${' '.repeat(Math.min(gap, 8))}${amount}`;
  if (combined.length <= maxChars) return combined;
  return `${base} ${amount}`.slice(0, maxChars);
}
