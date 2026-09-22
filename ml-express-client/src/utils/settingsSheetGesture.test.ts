import { describe, expect, it } from 'vitest';
import {
  overlayOpacityFromDrag,
  shouldClaimSettingsSheetPan,
  shouldCloseSettingsSheet,
} from './settingsSheetGesture';

describe('settingsSheetGesture', () => {
  it('dims the overlay as the sheet is dragged down', () => {
    expect(overlayOpacityFromDrag(0, 400)).toBe(1);
    expect(overlayOpacityFromDrag(200, 400)).toBe(0.5);
    expect(overlayOpacityFromDrag(800, 400)).toBe(0);
  });

  it('only claims a downward pull', () => {
    expect(shouldClaimSettingsSheetPan(0, 20)).toBe(true);
    expect(shouldClaimSettingsSheetPan(0, -20)).toBe(false);
    expect(shouldClaimSettingsSheetPan(40, 10)).toBe(false);
  });

  it('closes on a long pull or a downward flick', () => {
    expect(shouldCloseSettingsSheet(80, 0)).toBe(true);
    expect(shouldCloseSettingsSheet(20, 0.8)).toBe(true);
    expect(shouldCloseSettingsSheet(20, 0.1)).toBe(false);
  });
});
