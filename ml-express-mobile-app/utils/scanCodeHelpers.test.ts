import { describe, expect, it } from 'vitest';
import { findPackageInListByScanCode } from './scanCodeHelpers';

const pkgs = [
  { id: 'PKG001', sender_code: 'SND-9', transfer_code: 'TCABC1234', store_receive_code: null },
  { id: 'PKG002', sender_code: null, transfer_code: null, store_receive_code: 'STORE_1_MDY' },
];

describe('findPackageInListByScanCode', () => {
  it('matches id, sender code, and transfer code from a cached list', () => {
    expect(findPackageInListByScanCode(pkgs, 'PKG001')?.id).toBe('PKG001');
    expect(findPackageInListByScanCode(pkgs, 'SND-9')?.id).toBe('PKG001');
    expect(findPackageInListByScanCode(pkgs, 'TCABC1234')?.id).toBe('PKG001');
  });

  it('returns null for store codes and unknown scans', () => {
    expect(findPackageInListByScanCode(pkgs, 'STORE_1_MDY')).toBeNull();
    expect(findPackageInListByScanCode(pkgs, 'NOPE')).toBeNull();
  });
});
