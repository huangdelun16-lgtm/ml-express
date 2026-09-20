import { describe, expect, it } from 'vitest';
import {
  clamp01,
  progressFromDrag,
  resolveFinanceSummarySnap,
  shouldClaimFinanceSummaryPan,
} from './financeSummarySheet';

describe('financeSummarySheet', () => {
  it('clamps drag progress between 0 and 1', () => {
    expect(clamp01(-0.2)).toBe(0);
    expect(clamp01(1.4)).toBe(1);
    expect(progressFromDrag(0, 100, 200)).toBe(0.5);
    expect(progressFromDrag(1, -80, 200)).toBe(0.6);
    expect(progressFromDrag(0, 800, 200)).toBe(1);
  });

  it('claims pull-down when closed and pull-up when open', () => {
    expect(shouldClaimFinanceSummaryPan({ open: false, dx: 0, dy: 20 })).toBe(true);
    expect(shouldClaimFinanceSummaryPan({ open: false, dx: 0, dy: -20 })).toBe(false);
    expect(shouldClaimFinanceSummaryPan({ open: true, dx: 0, dy: -20 })).toBe(true);
    expect(shouldClaimFinanceSummaryPan({ open: true, dx: 0, dy: 20 })).toBe(false);
    expect(shouldClaimFinanceSummaryPan({ open: true, dx: 40, dy: -10 })).toBe(false);
  });

  it('treats a short movement as a tap', () => {
    expect(resolveFinanceSummarySnap({ startProgress: 0, dy: 4, vy: 0 })).toBe('tap');
  });

  it('opens on a downward flick and closes on an upward flick', () => {
    expect(resolveFinanceSummarySnap({ startProgress: 0, dy: 90, vy: 0.4 })).toBe('open');
    expect(resolveFinanceSummarySnap({ startProgress: 1, dy: -90, vy: -0.4 })).toBe('close');
    expect(resolveFinanceSummarySnap({ startProgress: 1, dy: -50, vy: 0 })).toBe('close');
  });
});
