import { describe, expect, it } from 'vitest';
import { inboundNoteHasFeeOrPayment, parseInboundMovementNote } from './inboundMovementNote';

describe('parseInboundMovementNote', () => {
  it('parses Chinese fee and prepaid', () => {
    const parsed = parseInboundMovementNote('总费用 5000 MMK · 预付 · 备注');
    expect(parsed.totalFee).toBe('5000');
    expect(parsed.paymentLabel).toBe('预付');
    expect(parsed.userNote).toBe('备注');
  });

  it('parses English fee and COD', () => {
    const parsed = parseInboundMovementNote('Total fee 12000 MMK · COD');
    expect(parsed.totalFee).toBe('12000');
    expect(parsed.paymentLabel).toBe('到付');
  });

  it('detects fee or payment in note', () => {
    expect(inboundNoteHasFeeOrPayment('Total fee 100 MMK · Prepaid')).toBe(true);
    expect(inboundNoteHasFeeOrPayment('仅备注')).toBe(false);
  });
});
