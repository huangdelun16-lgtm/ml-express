import { describe, expect, it } from 'vitest';
import { hasInboundScanDraft } from './inboundLeaveDraft';

describe('hasInboundScanDraft', () => {
  it('empty wizard does not confirm', () => {
    expect(hasInboundScanDraft({})).toBe(false);
    expect(hasInboundScanDraft({ scanCode: '  ', scannedLineCount: 0 })).toBe(false);
  });

  it('scanned barcode or matched item needs confirm', () => {
    expect(hasInboundScanDraft({ scanCode: 'SF123' })).toBe(true);
    expect(hasInboundScanDraft({ hasMatchedItem: true })).toBe(true);
  });

  it('packaging scan lines need confirm', () => {
    expect(hasInboundScanDraft({ scannedLineCount: 3 })).toBe(true);
  });
});
