import { describe, expect, it } from 'vitest';
import { destinationFromCustomerCode, normalizePackDestination } from './destinationOptions';

describe('destinationFromCustomerCode', () => {
  it('reads the area prefix from a generated customer code', () => {
    expect(destinationFromCustomerCode('MDY2608241001')).toBe('MDY');
    expect(destinationFromCustomerCode('YGN2608242001')).toBe('YGN');
    expect(destinationFromCustomerCode('POL2608241002')).toBe('POL');
    expect(destinationFromCustomerCode('mdy2608241001')).toBe('MDY');
  });

  it('maps RUILI / MUSE prefixes to hub codes', () => {
    expect(destinationFromCustomerCode('RUILI2608241001')).toBe('RUI');
    expect(destinationFromCustomerCode('MUSE2608241001')).toBe('MSE');
  });

  it('returns empty when the code has no known area', () => {
    expect(destinationFromCustomerCode('')).toBe('');
    expect(destinationFromCustomerCode('12345')).toBe('');
  });
});

describe('normalizePackDestination', () => {
  it('keeps 3-letter hub codes', () => {
    expect(normalizePackDestination('MDY')).toBe('MDY');
    expect(normalizePackDestination('RUI')).toBe('RUI');
  });
});
