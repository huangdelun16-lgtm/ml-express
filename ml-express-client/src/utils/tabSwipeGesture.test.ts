import { describe, expect, it } from 'vitest';
import {
  clampIndex,
  isTabSwipeEdgeStart,
  resolveTabSwipeIndex,
  rubberbandDx,
  shouldCaptureTabSwipeOnRoute,
  shouldClaimTabSwipe,
  tabSwipeTranslateX,
} from './tabSwipeGesture';

describe('tabSwipeGesture', () => {
  it('claims a clear horizontal move and ignores vertical scroll', () => {
    expect(shouldClaimTabSwipe(-16, 4)).toBe(true);
    expect(shouldClaimTabSwipe(16, 4)).toBe(true);
    expect(shouldClaimTabSwipe(-8, 2)).toBe(false);
    expect(shouldClaimTabSwipe(-16, 20)).toBe(false);
  });

  it('captures only from the screen edges', () => {
    expect(isTabSwipeEdgeStart(12, 360)).toBe(true);
    expect(isTabSwipeEdgeStart(340, 360)).toBe(true);
    expect(isTabSwipeEdgeStart(180, 360)).toBe(false);
    expect(shouldCaptureTabSwipeOnRoute('Home', 12, 360, -16, 3)).toBe(true);
    expect(shouldCaptureTabSwipeOnRoute('Home', 180, 360, -16, 3)).toBe(false);
    expect(shouldCaptureTabSwipeOnRoute('Home', 180, 360, -60, 8)).toBe(true);
    expect(shouldCaptureTabSwipeOnRoute('PlaceOrder', 180, 360, -60, 8)).toBe(false);
    expect(shouldCaptureTabSwipeOnRoute('PlaceOrder', 10, 360, -16, 3)).toBe(true);
  });

  it('rubber-bands at the first and last page', () => {
    expect(rubberbandDx(40, 0, 7)).toBeCloseTo(12.8);
    expect(rubberbandDx(-40, 6, 7)).toBeCloseTo(-12.8);
    expect(rubberbandDx(-40, 0, 7)).toBe(-40);
  });

  it('follows the finger and snaps only to the adjacent page', () => {
    expect(tabSwipeTranslateX(0, -80, 360, 7)).toBe(-80);
    expect(resolveTabSwipeIndex({ startIndex: 0, dx: -80, vx: 0, width: 360, count: 7 })).toBe(1);
    expect(resolveTabSwipeIndex({ startIndex: 1, dx: 80, vx: 0, width: 360, count: 7 })).toBe(0);
    expect(resolveTabSwipeIndex({ startIndex: 0, dx: -20, vx: 0, width: 360, count: 7 })).toBe(0);
    expect(resolveTabSwipeIndex({ startIndex: 0, dx: -24, vx: -0.8, width: 360, count: 7 })).toBe(1);
    expect(resolveTabSwipeIndex({ startIndex: 0, dx: -400, vx: -3, width: 360, count: 7 })).toBe(1);
    expect(resolveTabSwipeIndex({ startIndex: 0, dx: 90, vx: 1, width: 360, count: 7 })).toBe(0);
    expect(clampIndex(9, 7)).toBe(6);
  });
});
