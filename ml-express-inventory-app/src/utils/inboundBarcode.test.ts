import { describe, expect, it } from 'vitest';
import {
  formatPackagingStockInLineBarcode,
  generateInboundBarcode,
  generatePackagingStockInLineBarcodes,
  parsePackagingStockInLineBarcode,
  splitPackagingStockInLineBarcodeDisplay,
} from './inboundBarcode';

describe('packaging stock-in barcodes', () => {
  const at = new Date('2026-08-04T12:14:13.000+06:30');

  it('generates shared base with per-line suffix', () => {
    expect(generateInboundBarcode('MDY', at)).toBe('MDY131412040826');
    expect(formatPackagingStockInLineBarcode('MDY131412040826', 3, 2)).toBe('MDY131412040826(3-2)');
  });

  it('parses suffix from line barcode', () => {
    expect(parsePackagingStockInLineBarcode('MDY131412040826(3-2)')).toEqual({
      base: 'MDY131412040826',
      total: 3,
      index: 2,
    });
    expect(parsePackagingStockInLineBarcode('MDY131412040826')).toBeNull();
  });

  it('splits display parts for styled rendering', () => {
    expect(splitPackagingStockInLineBarcodeDisplay('MDY131412040826(3-2)')).toEqual({
      base: 'MDY131412040826',
      suffix: '(3-2)',
    });
    expect(splitPackagingStockInLineBarcodeDisplay('MDY131412040826')).toEqual({
      base: 'MDY131412040826',
      suffix: null,
    });
  });

  it('generates unique barcodes for each line in batch', async () => {
    const taken = new Set<string>();
    const codes = await generatePackagingStockInLineBarcodes('MDY', 3, at, async (code) => taken.has(code));
    expect(codes).toEqual([
      'MDY131412040826(3-1)',
      'MDY131412040826(3-2)',
      'MDY131412040826(3-3)',
    ]);
  });

  it('bumps base when batch barcodes collide', async () => {
    const taken = new Set(['MDY131412040826(3-1)', 'MDY131412040826(3-2)', 'MDY131412040826(3-3)']);
    const codes = await generatePackagingStockInLineBarcodes('MDY', 3, at, async (code) => taken.has(code));
    expect(codes[0]).toMatch(/^MDY1314120408260\(3-1\)$/);
    expect(codes).toHaveLength(3);
  });
});
