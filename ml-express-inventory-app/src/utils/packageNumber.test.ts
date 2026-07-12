import { describe, expect, it } from 'vitest';
import {
  buildPackageNumberBody,
  isPackageBarcode,
  normalizePackageOriginPrefix,
  packDestinationFromBarcode,
  packOriginFromBarcode,
  parsePackageBarcode,
} from './packageNumber';

describe('packageNumber', () => {
  it('uses origin hub prefix instead of PKG for RUILI', () => {
    expect(buildPackageNumberBody('MDY', 4, 'RUILI001', new Date('2026-06-01'))).toBe('RUI26MDY4');
    expect(normalizePackageOriginPrefix('RUILI001')).toBe('RUI');
  });

  it('uses MSE for MUSE origin', () => {
    expect(buildPackageNumberBody('MDY', 2, 'MUSE001', new Date('2026-06-01'))).toBe('MSE26MDY2');
  });

  it('parses legacy PKG and new origin prefixes', () => {
    expect(parsePackageBarcode('PKG26MDY20004')).toEqual({
      origin: 'PKG',
      destination: 'MDY',
      pieceCount: 2,
      sequence: '0004',
    });
    expect(parsePackageBarcode('RUI26MDY40004')).toEqual({
      origin: 'RUI',
      destination: 'MDY',
      pieceCount: 4,
      sequence: '0004',
    });
    expect(packOriginFromBarcode('RUI26MDY40004')).toBe('RUI');
    expect(packDestinationFromBarcode('RUI26MDY40004')).toBe('MDY');
  });

  it('does not treat inbound barcodes as package barcodes', () => {
    expect(isPackageBarcode('MDY071122080726')).toBe(false);
    expect(isPackageBarcode('RUI26MDY40004')).toBe(true);
    expect(isPackageBarcode('PKG26YGN10001')).toBe(true);
  });
});
