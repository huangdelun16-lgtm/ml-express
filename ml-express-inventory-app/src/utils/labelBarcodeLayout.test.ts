import { describe, expect, it } from 'vitest';
import {
  adjustLayoutElement,
  adjustGroupTextScale,
  applyLayoutAlignment,
  alignLabelGroup,
  buildDefaultCenteredLayout,
  canAdjustElementSize,
  canAdjustGroupTextScale,
  centerAllLabelElements,
  getGroupTextScaleMul,
  getLabelGroupBounds,
  mergeAndCenterLabelLayout,
  MERGE_CENTER_BARCODE_TEXT_GAP,
  MERGE_CENTER_EXPRESS_BARCODE_GAP,
  moveLabelGroup,
  clampLabelBarcodeLayout,
  DEFAULT_LABEL_BARCODE_LAYOUT,
  getBarcodePrintMetrics,
  getEffectiveElementWidthDots,
  getElementDimensions,
  mmDeltaToLayoutDots,
  mmToLayoutDots,
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
    const next = adjustLayoutElement(
      DEFAULT_LABEL_BARCODE_LAYOUT,
      'barcode',
      'y',
      8,
      SAMPLE_CONTENT,
    );
    expect(next.barcode.y).toBe(DEFAULT_LABEL_BARCODE_LAYOUT.barcode.y + 8);
  });

  it('adjusts barcode width and height independently', () => {
    const shortContent = {
      expressNo: '12345',
      barcode: 'MDY123',
      inboundCode: 'MDY123',
    };
    const base = clampLabelBarcodeLayout({
      ...DEFAULT_LABEL_BARCODE_LAYOUT,
      barcode: { ...DEFAULT_LABEL_BARCODE_LAYOUT.barcode, widthDots: 120, height: 120 },
    });
    const before = getElementDimensions(base, 'barcode', shortContent);
    const wider = adjustLayoutElement(
      base,
      'barcode',
      'width',
      mmToLayoutDots(2),
      shortContent,
    );
    const taller = adjustLayoutElement(
      base,
      'barcode',
      'height',
      mmToLayoutDots(2),
      shortContent,
    );
    const widerDims = getElementDimensions(wider, 'barcode', shortContent);
    const tallerDims = getElementDimensions(taller, 'barcode', shortContent);
    expect(widerDims.widthDots).toBeGreaterThan(before.widthDots);
    expect(tallerDims.heightDots).toBeGreaterThan(before.heightDots);
  });

  it('sets element position directly', () => {
    const next = setLayoutElementPosition(DEFAULT_LABEL_BARCODE_LAYOUT, 'barcode', {
      x: 20,
      y: 55,
      height: 90,
    });
    expect(next.barcode).toEqual({ x: 20, y: 55, height: 90 });
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
    const labelW = 464;

    expect(merged.barcode.x).toBeGreaterThan(0);
    expect(merged.expressNo.y).toBeLessThan(merged.barcode.y);
    expect(merged.barcode.y).toBeLessThan(merged.inboundCode.y);
    expect(merged.inboundCode.y).toBe(
      merged.barcode.y + merged.barcode.height + MERGE_CENTER_BARCODE_TEXT_GAP,
    );
    expect(merged.expressNo.y).toBe(
      merged.barcode.y - MERGE_CENTER_EXPRESS_BARCODE_GAP - getElementDimensions(
        merged,
        'expressNo',
        SAMPLE_CONTENT,
      ).heightDots,
    );

    const barcodeWidth = getEffectiveElementWidthDots(merged, 'barcode', SAMPLE_CONTENT);
    const barcodeCenter =
      merged.barcode.x + barcodeWidth / 2;
    const expressCenter =
      merged.expressNo.x + merged.expressNo.widthDots! / 2;
    const inboundCenter =
      merged.inboundCode.x + merged.inboundCode.widthDots! / 2;
    expect(Math.round(expressCenter)).toBe(Math.round(barcodeCenter));
    expect(Math.round(inboundCenter)).toBe(Math.round(barcodeCenter));
  });

  it('merge and center aligns text to barcode width when barcode is narrower than label', () => {
    const narrowBarcode = clampLabelBarcodeLayout({
      ...DEFAULT_LABEL_BARCODE_LAYOUT,
      barcode: { ...DEFAULT_LABEL_BARCODE_LAYOUT.barcode, widthDots: 180, height: 72 },
    });
    const merged = mergeAndCenterLabelLayout(narrowBarcode, SAMPLE_CONTENT, 58, 40);
    const barcodeCenter =
      merged.barcode.x + getEffectiveElementWidthDots(merged, 'barcode', SAMPLE_CONTENT, 58) / 2;
    const expressCenter =
      merged.expressNo.x + getEffectiveElementWidthDots(merged, 'expressNo', SAMPLE_CONTENT, 58) / 2;
    const inboundCenter =
      merged.inboundCode.x +
      getEffectiveElementWidthDots(merged, 'inboundCode', SAMPLE_CONTENT, 58) / 2;
    expect(Math.round(expressCenter)).toBe(Math.round(barcodeCenter));
    expect(Math.round(inboundCenter)).toBe(Math.round(barcodeCenter));
    expect(merged.barcode.x).toBeGreaterThan(0);
  });

  it('merge and center ignores stale text widthDots when aligning to barcode', () => {
    const bloated = clampLabelBarcodeLayout({
      ...DEFAULT_LABEL_BARCODE_LAYOUT,
      expressNo: { ...DEFAULT_LABEL_BARCODE_LAYOUT.expressNo, widthDots: 400 },
      inboundCode: { ...DEFAULT_LABEL_BARCODE_LAYOUT.inboundCode, widthDots: 400 },
    });
    const merged = mergeAndCenterLabelLayout(bloated, SAMPLE_CONTENT, 58, 40);
    const barcodeWidth = getEffectiveElementWidthDots(merged, 'barcode', SAMPLE_CONTENT, 58);
    const expressPrintW = merged.expressNo.widthDots ?? 0;
    const inboundPrintW = merged.inboundCode.widthDots ?? 0;
    expect(merged.expressNo.x).toBe(
      Math.round(merged.barcode.x + (barcodeWidth - expressPrintW) / 2),
    );
    expect(merged.inboundCode.x).toBe(
      Math.round(merged.barcode.x + (barcodeWidth - inboundPrintW) / 2),
    );
    expect(expressPrintW).toBeLessThan(400);
  });

  it('preserves sign when converting mm layout deltas', () => {
    expect(mmDeltaToLayoutDots(-0.5)).toBeLessThan(0);
    expect(mmDeltaToLayoutDots(0.5)).toBeGreaterThan(0);
    expect(mmDeltaToLayoutDots(-0.5)).toBe(-mmDeltaToLayoutDots(0.5));
  });

  it('adjusts text width and height for express number', () => {
    const before = getElementDimensions(DEFAULT_LABEL_BARCODE_LAYOUT, 'expressNo', SAMPLE_CONTENT);
    const next = adjustLayoutElement(
      DEFAULT_LABEL_BARCODE_LAYOUT,
      'expressNo',
      'height',
      mmDeltaToLayoutDots(0.5),
      SAMPLE_CONTENT,
    );
    const after = getElementDimensions(next, 'expressNo', SAMPLE_CONTENT);
    expect(after.heightDots).toBeGreaterThan(before.heightDots);
    expect(canAdjustElementSize(next, 'expressNo', 'height', -1, SAMPLE_CONTENT)).toBe(true);
  });

  it('adjusts barcode width by narrow steps on wide paper', () => {
    const shortContent = {
      expressNo: '12345',
      barcode: 'MDY123',
      inboundCode: 'MDY123',
    };
    const base = clampLabelBarcodeLayout({
      ...DEFAULT_LABEL_BARCODE_LAYOUT,
      barcode: { ...DEFAULT_LABEL_BARCODE_LAYOUT.barcode, widthDots: 120, height: 72 },
    });
    const before = getBarcodePrintMetrics(base, shortContent, 58);
    expect(before.narrow).toBeGreaterThanOrEqual(2);
    const wider = adjustLayoutElement(base, 'barcode', 'width', 4, shortContent, 58);
    const after = getBarcodePrintMetrics(wider, shortContent, 58);
    expect(after.narrow).toBeGreaterThanOrEqual(before.narrow);
    expect(after.widthDots).toBeGreaterThanOrEqual(before.widthDots);
  });

  it('locks barcode width on narrow paper when code is full width', () => {
    expect(
      canAdjustElementSize(
        DEFAULT_LABEL_BARCODE_LAYOUT,
        'barcode',
        'width',
        1,
        SAMPLE_CONTENT,
        40,
      ),
    ).toBe(false);
    expect(
      canAdjustElementSize(
        DEFAULT_LABEL_BARCODE_LAYOUT,
        'barcode',
        'width',
        -1,
        SAMPLE_CONTENT,
        40,
      ),
    ).toBe(false);
  });

  it('moves and aligns label content as one group', () => {
    const shifted = moveLabelGroup(DEFAULT_LABEL_BARCODE_LAYOUT, 8, 4, SAMPLE_CONTENT);
    expect(shifted.expressNo.x).toBe(DEFAULT_LABEL_BARCODE_LAYOUT.expressNo.x + 8);
    expect(shifted.barcode.x).toBe(DEFAULT_LABEL_BARCODE_LAYOUT.barcode.x + 8);
    expect(shifted.inboundCode.y).toBe(DEFAULT_LABEL_BARCODE_LAYOUT.inboundCode.y + 4);

    const centered = alignLabelGroup(shifted, { horizontal: 'center' }, SAMPLE_CONTENT);
    const bounds = getLabelGroupBounds(centered, SAMPLE_CONTENT);
    expect(bounds.x).toBeGreaterThan(0);
  });

  it('adjusts group text scale in 0.2 steps up to x2', () => {
    expect(getGroupTextScaleMul(DEFAULT_LABEL_BARCODE_LAYOUT, SAMPLE_CONTENT)).toBe(1);
    const step1 = adjustGroupTextScale(DEFAULT_LABEL_BARCODE_LAYOUT, 1, SAMPLE_CONTENT);
    expect(getGroupTextScaleMul(step1, SAMPLE_CONTENT)).toBe(1.2);
    const step2 = adjustGroupTextScale(step1, 1, SAMPLE_CONTENT);
    expect(getGroupTextScaleMul(step2, SAMPLE_CONTENT)).toBe(1.4);
    const atMax = adjustGroupTextScale(step2, 1, SAMPLE_CONTENT);
    expect(getGroupTextScaleMul(atMax, SAMPLE_CONTENT)).toBe(1.6);
    expect(canAdjustGroupTextScale(atMax, 1, SAMPLE_CONTENT)).toBe(true);
    let current = atMax;
    current = adjustGroupTextScale(current, 1, SAMPLE_CONTENT);
    current = adjustGroupTextScale(current, 1, SAMPLE_CONTENT);
    expect(getGroupTextScaleMul(current, SAMPLE_CONTENT)).toBe(2);
    expect(canAdjustGroupTextScale(current, 1, SAMPLE_CONTENT)).toBe(false);
  });

  it('migrates legacy scale to width and height dots', () => {
    const parsed = normalizeLabelBarcodeLayout({
      version: 1,
      expressNo: { x: 0, y: 0, scale: 2 },
      barcode: { x: 0, y: 0, height: 80, scale: 2 },
      inboundCode: { x: 0, y: 0, scale: 2 },
    }, SAMPLE_CONTENT);
    expect(parsed?.expressNo.widthDots).toBeDefined();
    expect(parsed?.expressNo.heightDots).toBeDefined();
    expect(parsed?.barcode.widthDots).toBeDefined();
    expect(parsed?.barcode.height).toBe(160);
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
    expect(payload).toContain('BARCODE 24,60,"128",104,0,0,');
    expect(payload).toContain('TEXT 24,170,"2"');
    expect(payload.match(/TEXT .*67499191994/g)?.length).toBe(1);
    expect(payload.match(/TEXT .*MDY060400290726/g)?.length).toBe(1);
  });

  it('applies barcode width dots to TSPL module width', () => {
    const layout = clampLabelBarcodeLayout({
      ...DEFAULT_LABEL_BARCODE_LAYOUT,
      barcode: { x: 24, y: 60, height: 80, widthDots: 400 },
      inboundCode: { x: 24, y: 170 },
    });
    const metrics = getBarcodePrintMetrics(layout, SAMPLE_CONTENT);
    const payload = buildTsplInboundLabel({
      barcode: 'MDY060400290726',
      sheetKind: 'barcode',
      layout,
    });
    expect(payload).toContain(
      `BARCODE 24,60,"128",104,0,0,${metrics.narrow},${metrics.wide}`,
    );
    expect(metrics.widthDots).toBeGreaterThan(200);
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
