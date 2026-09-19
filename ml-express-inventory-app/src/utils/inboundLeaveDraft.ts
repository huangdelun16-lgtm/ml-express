export function hasInboundScanDraft(input: {
  scanCode?: string | null;
  hasMatchedItem?: boolean;
  scannedLineCount?: number;
}): boolean {
  if ((input.scannedLineCount ?? 0) > 0) return true;
  if (input.hasMatchedItem) return true;
  return Boolean(input.scanCode?.trim());
}
