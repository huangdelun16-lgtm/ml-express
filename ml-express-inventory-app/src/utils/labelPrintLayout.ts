import { XPRINTER_P203A } from '../constants/xprinterP203a';
import type { LabelPrintPayload } from '../services/printerService';

export type NormalizedLabelContent = {
  barcode: string;
  inputBarcode?: string;
  productName?: string;
  destination?: string;
  customerName?: string;
};

export function normalizeLabelContent(
  barcode: string,
  extras?: Partial<LabelPrintPayload>,
): NormalizedLabelContent {
  return {
    barcode: barcode.trim(),
    inputBarcode: extras?.inputBarcode?.trim() || undefined,
    productName: extras?.productName?.trim() || extras?.name?.trim() || undefined,
    destination: extras?.destination?.trim() || undefined,
    customerName: extras?.customerName?.trim() || undefined,
  };
}

export function truncateLabelText(text: string, maxLen: number): string {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, Math.max(0, maxLen - 1))}…`;
}

export function mmToDots(mm: number, dpi = XPRINTER_P203A.dpi): number {
  return Math.max(1, Math.round((mm / 25.4) * dpi));
}

export function labelWidthDots(widthMm: number): number {
  return mmToDots(widthMm);
}

export function labelHeightDots(heightMm: number): number {
  return mmToDots(heightMm);
}
