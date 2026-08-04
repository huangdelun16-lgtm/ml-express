import { describe, expect, it, beforeEach } from 'vitest';
import {
  claimTripFeeAnchorIfUnset,
  clearTripFeeAnchorCache,
} from './tripFeeAnchor';

describe('tripFeeAnchor', () => {
  beforeEach(() => {
    clearTripFeeAnchorCache();
  });

  it('remembers first opened pack in a trip group', () => {
    const group = 'trip:RUI0008';
    expect(claimTripFeeAnchorIfUnset(group, 'RUI26MDY30002')).toBe('RUI26MDY30002');
    expect(claimTripFeeAnchorIfUnset(group, 'RUI26MDY30001')).toBe('RUI26MDY30002');
  });

  it('single-pack group always uses current pack', () => {
    expect(claimTripFeeAnchorIfUnset('pack:PKG-A', 'PKG-A')).toBe('PKG-A');
    expect(claimTripFeeAnchorIfUnset('pack:PKG-A', 'PKG-B')).toBe('PKG-B');
  });
});
