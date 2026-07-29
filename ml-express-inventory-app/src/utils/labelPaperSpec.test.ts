import { describe, expect, it } from 'vitest';
import {
  clampLabelPaperSpec,
  DEFAULT_LABEL_PAPER,
  normalizeLabelPaperSpec,
  paperSpecsEqual,
} from '../constants/labelPaperSpec';
import { buildTsplInboundLabel } from '../services/tsplLabelBuilder';

describe('labelPaperSpec', () => {
  it('clamps paper dimensions', () => {
    expect(
      clampLabelPaperSpec({ widthMm: 999, heightMm: -1, gapMm: 20 }),
    ).toEqual({ widthMm: 80, heightMm: 10, gapMm: 10 });
  });

  it('normalizes valid paper spec', () => {
    expect(normalizeLabelPaperSpec({ widthMm: 40, heightMm: 30, gapMm: 2 })).toEqual({
      widthMm: 40,
      heightMm: 30,
      gapMm: 2,
    });
  });

  it('compares paper specs', () => {
    expect(paperSpecsEqual(DEFAULT_LABEL_PAPER, { ...DEFAULT_LABEL_PAPER })).toBe(true);
    expect(paperSpecsEqual(DEFAULT_LABEL_PAPER, { widthMm: 40, heightMm: 30, gapMm: 2 })).toBe(
      false,
    );
  });
});

describe('buildTsplInboundLabel paper spec', () => {
  it('uses custom paper size in TSPL SIZE/GAP commands', () => {
    const payload = buildTsplInboundLabel({
      barcode: 'MDY060400290726',
      sheetKind: 'barcode',
      widthMm: 40,
      heightMm: 30,
      gapMm: 3,
    });
    expect(payload).toContain('SIZE 40 mm, 30 mm');
    expect(payload).toContain('GAP 3 mm, 0 mm');
  });
});
