import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  Vibration: { vibrate: vi.fn() },
}));

import { extractScanPayload, normalizeScanCode } from './barcodeScan';

describe('barcodeScan', () => {
  it('normalizes scan codes to uppercase without control chars', () => {
    expect(normalizeScanCode('  mdy123\n')).toBe('MDY123');
  });

  it('prefers the longest candidate between data and raw', () => {
    expect(extractScanPayload('MDY123', 'MDY123456789')).toBe('MDY123456789');
  });

  it('falls back to data when raw is empty', () => {
    expect(extractScanPayload('YT114562896', '')).toBe('YT114562896');
  });
});
