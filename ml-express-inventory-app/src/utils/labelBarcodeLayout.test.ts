import { describe, expect, it } from 'vitest';
import {
  adjustLayoutElement,
  applyLayoutAlignment,
  buildDefaultCenteredLayout,
  centerAllLabelElements,
  mergeAndCenterLabelLayout,
  centerTextLabelElement,
  clampLabelBarcodeLayout,
  DEFAULT_LABEL_BARCODE_LAYOUT,
  getBarcodePrintMetrics,
  getEffectiveElementWidthDots,
  normalizeLabelBarcodeLayout,
  setLayoutElementPosition,
} from '../constants/labelBarcodeLayout';
import { buildTsplInboundLabel } from '../services/tsplLabelBuilder';

const SAMPLE_CONTENT = {
  expressNo: '67499191994',
  barcode: 'MDY060400290726',
  inboundCode: 'MDY060400290726',
};

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

  it('scales barcode width and height together', () => {
    const scaled = adjustLayoutElement(DEFAULT_LABEL_BARCODE_LAYOUT, 'barcode', 'scale', 1);
    const metrics = getBarcodePrintMetrics(scaled);
    expect(scaled.barcode.scale).toBe(2);
    expect(metrics.narrow).toBe(6);
    expect(metrics.wide).toBe(12);
    expect(metrics.height).toBe(Math.min(160, DEFAULT_LABEL_BARCODE_LAYOUT.barcode.height * 2));
  });

  it('sets element position directly', () => {
    const next = setLayoutElementPosition(DEFAULT_LABEL_BARCODE_LAYOUT, 'barcode', {
      x: 20,
      y: 55,
      height: 90,
    });
    expect(next.barcode).toEqual({ x: 20, y: 55, height: 90, scale: 1 });
  });

  it('centers default layout horizontally for sample label content', () => {
    const layout = buildDefaultCenteredLayout(SAMPLE_CONTENT);
    const labelW = 464;

    expect(layout.expressNo.x).toBe(
      Math.round((labelW - getEffectiveElementWidthDots(layout, 'expressNo', SAMPLE_CONTENT)) / 2),
    );
    expect(layout.barcode.x).toBe(
      Math.round((labelW - getEffectiveElementWidthDots(layout, 'barcode', SAMPLE_CONTENT)) / 2),
    );
    expect(layout.inboundCode.x).toBe(
      Math.round((labelW - getEffectiveElementWidthDots(layout, 'inboundCode', SAMPLE_CONTENT)) / 2),
    );
  });

  it('aligns selected element to horizontal center', () => {
    const leftAligned = {
      ...DEFAULT_LABEL_BARCODE_LAYOUT,
      expressNo: { x: 4, y: DEFAULT_LABEL_BARCODE_LAYOUT.expressNo.y },
    };
    const centered = applyLayoutAlignment(
      leftAligned,
      'expressNo',
      { horizontal: 'center' },
      SAMPLE_CONTENT,
    );
    expect(centered.expressNo.x).toBeGreaterThan(leftAligned.expressNo.x);
  });

  it('centers all three elements horizontally', () => {
    const shifted = clampLabelBarcodeLayout({
      ...DEFAULT_LABEL_BARCODE_LAYOUT,
      expressNo: { x: 4, y: DEFAULT_LABEL_BARCODE_LAYOUT.expressNo.y },
      barcode: { ...DEFAULT_LABEL_BARCODE_LAYOUT.barcode, x: 4 },
      inboundCode: { x: 4, y: DEFAULT_LABEL_BARCODE_LAYOUT.inboundCode.y },
    });
    const centered = centerAllLabelElements(shifted, SAMPLE_CONTENT);
    expect(centered.expressNo.x).toBeGreaterThan(4);
    expect(centered.barcode.x).toBeGreaterThan(4);
    expect(centered.inboundCode.x).toBeGreaterThan(4);
  });

  it('merge and center stacks all elements on the label', () => {
    const shifted = clampLabelBarcodeLayout({
      ...DEFAULT_LABEL_BARCODE_LAYOUT,
      expressNo: { x: 0, y: 180 },
      barcode: { x: 0, y: 40, height: 96 },
      inboundCode: { x: 0, y: 250 },
    });
    const merged = mergeAndCenterLabelLayout(shifted, SAMPLE_CONTENT);
    expect(merged.barcode.x).toBeGreaterThan(0);
    expect(merged.expressNo.y).toBeLessThan(merged.barcode.y);
    expect(merged.barcode.y).toBeLessThan(merged.inboundCode.y);
    expect(merged.expressNo.x).toBe(
      Math.round((464 - getEffectiveElementWidthDots(merged, 'expressNo', SAMPLE_CONTENT)) / 2),
    );
  });

  it('adjusts text scale for express number', () => {
    const next = adjustLayoutElement(DEFAULT_LABEL_BARCODE_LAYOUT, 'expressNo', 'scale', 1);
    expect(next.expressNo.scale).toBe(2);
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

    expect(payload).toContain(`TEXT ${layout.expressNo.x},${layout.expressNo.y},"2"`);
    expect(payload).toContain('BARCODE 24,60,"128",88,0,0,3,6');
    expect(payload).toContain('TEXT 24,170,"2"');
    expect(payload.match(/TEXT .*67499191994/g)?.length).toBe(1);
    expect(payload.match(/TEXT .*MDY060400290726/g)?.length).toBe(1);
  });

  it('applies barcode scale to TSPL module width and height', () => {
    const layout = clampLabelBarcodeLayout({
      ...DEFAULT_LABEL_BARCODE_LAYOUT,
      barcode: { x: 24, y: 60, height: 80, scale: 2 },
      inboundCode: { x: 24, y: 170 },
    });
    const payload = buildTsplInboundLabel({
      barcode: 'MDY060400290726',
      sheetKind: 'barcode',
      layout,
    });
    expect(payload).toContain('BARCODE 24,60,"128",160,0,0,6,12');
  });

  it('does not print human-readable text under barcode when inbound text is separate', () => {
    const payload = buildTsplInboundLabel({
      barcode: 'MDY060400290726',
      sheetKind: 'barcode',
    });
    expect(payload).toContain('"128",');
    expect(payload).not.toMatch(/BARCODE [^,\n]+,[^,\n]+,"128",\d+,1,/);
  });
});
