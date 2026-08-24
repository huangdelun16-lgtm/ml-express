import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildCode128Svg,
  clearBarcodeDataUriCache,
  fetchBarcodeDataUri,
  getBarcodeDataUriCacheSize,
  getBarcodeImageUrl,
  getCode128ModuleRuns,
  getCode128PrintModuleRuns,
  getCode128PrintModules,
  getCode128TotalModules,
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

  it('builds real module runs for inbound barcodes like MDY…', () => {
    const code = 'MDY505211140726';
    const runs = getCode128ModuleRuns(code);
    const total = getCode128TotalModules(code);

    expect(runs.length).toBeGreaterThan(10);
    expect(runs[0]).toEqual({ black: false, modules: 10 });
    expect(runs[runs.length - 1]).toEqual({ black: false, modules: 10 });
    expect(total).toBeGreaterThan(100);
    expect(getCode128PrintModules(code)).toBe(total - 20);
    expect(getCode128PrintModules(code)).toBeGreaterThan(80);
    expect(runs.some((run) => run.black)).toBe(true);
    const printRuns = getCode128PrintModuleRuns(code);
    expect(printRuns[0]?.black).toBe(true);
    expect(printRuns.reduce((sum, run) => sum + run.modules, 0)).toBe(getCode128PrintModules(code));
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
