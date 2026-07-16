import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildCode128Svg,
  clearBarcodeDataUriCache,
  fetchBarcodeDataUri,
  getBarcodeDataUriCacheSize,
  getBarcodeImageUrl,
} from './barcodeImage';

describe('local Code128 barcode', () => {
  beforeEach(() => clearBarcodeDataUriCache());

  it('builds a self-contained SVG without an external URL', async () => {
    const svg = buildCode128Svg('PKG26YGN10001', { includeText: false });
    const uri = await fetchBarcodeDataUri('PKG26YGN10001');

    expect(svg).toContain('<svg');
    expect(svg).toContain('<rect');
    expect(uri).toMatch(/^data:image\/svg\+xml/);
    expect(uri).not.toContain('bwipjs');
    expect(uri).not.toContain('metafloor');
  });

  it('rejects characters unsupported by Code128-B', () => {
    expect(() => buildCode128Svg('包裹001')).toThrow('CODE128_UNSUPPORTED_CHARACTER');
  });

  it('keeps the data URI cache bounded', () => {
    for (let index = 0; index < 80; index += 1) {
      getBarcodeImageUrl(`ITEM-${index}`);
    }

    expect(getBarcodeDataUriCacheSize()).toBe(64);
  });
});
