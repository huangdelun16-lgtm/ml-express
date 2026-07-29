import { describe, expect, it } from 'vitest';
import {
  adjustLayoutElement,
  clampLabelBarcodeLayout,
  DEFAULT_LABEL_BARCODE_LAYOUT,
  normalizeLabelBarcodeLayout,
} from '../constants/labelBarcodeLayout';
import { buildTsplInboundLabel } from '../services/tsplLabelBuilder';

describe('labelBarcodeLayout', () => {
  it('normalizes and clamps saved layout', () => {
    const parsed = normalizeLabelBarcodeLayout({
      version: 1,
      expressNo: { x: 9999, y: -5 },
      barcode: { x: 20, y: 50, height: 200 },
      inboundCode: { x: 10, y: 160 },
    });
    expect(parsed?.expressNo.x).toBeLessThan(500);
    expect(parsed?.expressNo.y).toBeGreaterThanOrEqual(0);
    expect(parsed?.barcode.height).toBeLessThanOrEqual(160);
  });

  it('adjusts element positions in dots', () => {
    const next = adjustLayoutElement(DEFAULT_LABEL_BARCODE_LAYOUT, 'barcode', 'y', 8);
    expect(next.barcode.y).toBe(DEFAULT_LABEL_BARCODE_LAYOUT.barcode.y + 8);
  });
});

describe('buildTsplInboundLabel with layout', () => {
  it('uses custom layout coordinates for barcode sheet', () => {
    const layout = clampLabelBarcodeLayout({
      ...DEFAULT_LABEL_BARCODE_LAYOUT,
      barcode: { x: 24, y: 60, height: 88 },
      inboundCode: { x: 24, y: 170 },
    });
    const payload = buildTsplInboundLabel({
      barcode: 'MDY060400290726',
      sheetKind: 'barcode',
      layout,
      extras: { inputBarcode: '67499191994' },
    });

    expect(payload).toContain('TEXT 12,8,"2"');
    expect(payload).toContain('BARCODE 24,60,"128",88');
    expect(payload).toContain('TEXT 24,170,"2"');
  });
});
