import { describe, expect, it } from 'vitest';
import { PACKAGE_STATUS } from '../constants/packageStatus';
import {
  isActiveCourierTaskStatus,
  normalizePackageStatusZh,
} from './packageStatusNormalize';

describe('normalizePackageStatusZh', () => {
  it('maps 派送中 to 配送中 so transfer-claim orders stay in My Tasks', () => {
    expect(normalizePackageStatusZh('派送中')).toBe(PACKAGE_STATUS.IN_TRANSIT);
    expect(isActiveCourierTaskStatus(normalizePackageStatusZh('派送中'))).toBe(true);
  });

  it('keeps 配送中 and 待派送 as in-transit', () => {
    expect(normalizePackageStatusZh('配送中')).toBe(PACKAGE_STATUS.IN_TRANSIT);
    expect(normalizePackageStatusZh('待派送')).toBe(PACKAGE_STATUS.IN_TRANSIT);
  });
});
