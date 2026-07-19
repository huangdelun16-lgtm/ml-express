import {
  isStoreCodeTaken,
  resolveNextStoreCodeForPrefix,
  resolveNextStoreCodeFromPrefix,
} from './merchantStoreCode';

describe('merchantStoreCode', () => {
  it('starts at 001 when no codes exist', () => {
    expect(resolveNextStoreCodeFromPrefix('MDY', [])).toBe('MDY001');
  });

  it('uses max suffix + 1 instead of count + 1', () => {
    expect(resolveNextStoreCodeFromPrefix('MDY', ['MDY002'])).toBe('MDY003');
    expect(resolveNextStoreCodeFromPrefix('MDY', ['MDY001', 'MDY003'])).toBe('MDY004');
  });

  it('is case-insensitive', () => {
    expect(resolveNextStoreCodeFromPrefix('MDY', ['mdy002', 'Mdy001'])).toBe('MDY003');
  });

  it('ignores codes with different prefix', () => {
    expect(resolveNextStoreCodeFromPrefix('MDY', ['YGN002', 'MDY002'])).toBe('MDY003');
  });

  it('collects prefix codes from store rows', () => {
    const stores = [{ store_code: 'MDY002' }, { store_code: 'YGN001' }, { store_code: 'MDY010' }];
    expect(resolveNextStoreCodeForPrefix('MDY', stores)).toBe('MDY011');
  });

  it('detects taken codes', () => {
    const stores = [{ store_code: 'MDY002' }];
    expect(isStoreCodeTaken('MDY002', stores)).toBe(true);
    expect(isStoreCodeTaken('mdy002', stores)).toBe(true);
    expect(isStoreCodeTaken('MDY003', stores)).toBe(false);
  });
});
