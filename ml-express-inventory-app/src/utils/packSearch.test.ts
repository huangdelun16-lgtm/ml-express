import { describe, expect, it } from 'vitest';
import { packMatchesKeyword } from './packSearch';

const pack = {
  bundle_barcode: 'RUI26MDY200004',
  bundle_name: 'MDY 20件',
  operator: 'AMT',
  note: '',
  items: [
    {
      item_barcode: 'MDY105600261026',
      input_barcode: '777448827423866',
      item_name: '777448827423866',
      customer_name: 'Ko Mg',
    },
  ],
};

describe('packMatchesKeyword', () => {
  it('matches pack barcode, name, operator, and an order inside the pack', () => {
    expect(packMatchesKeyword(pack, 'RUI26')).toBe(true);
    expect(packMatchesKeyword(pack, '20件')).toBe(true);
    expect(packMatchesKeyword(pack, 'amt')).toBe(true);
    expect(packMatchesKeyword(pack, '777448827423866')).toBe(true);
    expect(packMatchesKeyword(pack, 'MDY1056')).toBe(true);
    expect(packMatchesKeyword(pack, 'ko')).toBe(true);
  });

  it('returns true for an empty query and false when nothing matches', () => {
    expect(packMatchesKeyword(pack, '')).toBe(true);
    expect(packMatchesKeyword(pack, 'NOT-HERE')).toBe(false);
  });
});
