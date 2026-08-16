import { describe, expect, it } from 'vitest';
import { itemMatchesKeyword } from './itemKeywordMatch';

const item = {
  barcode: 'YGN2608150001',
  input_barcode: 'SF1234567890',
  name: 'Phone case',
  spec: 'black',
  unit: '1 Pcs',
  weight: '0.2kg',
  note: 'fragile',
  recipient_name: 'Ko Mg',
  customer_name: 'Ko Mg',
  final_destination: 'YGN',
  destination: 'YGN',
  parent_pack_barcode: 'PKGYGN001',
  packed_bundle_barcode: 'PKGYGN001',
  owner_store_code: 'MDY001',
  customer_sign_phone: '091234567',
  pack_item_label: '3-1',
};

describe('itemMatchesKeyword', () => {
  it('matches customer name, destination, barcode, item name or phone', () => {
    expect(itemMatchesKeyword(item, 'Ko')).toBe(true);
    expect(itemMatchesKeyword(item, 'mg')).toBe(true);
    expect(itemMatchesKeyword(item, 'YGN')).toBe(true);
    expect(itemMatchesKeyword(item, 'sf123')).toBe(true);
    expect(itemMatchesKeyword(item, 'phone')).toBe(true);
    expect(itemMatchesKeyword(item, '091234')).toBe(true);
    expect(itemMatchesKeyword(item, 'pkg')).toBe(true);
    expect(itemMatchesKeyword(item, 'fragile')).toBe(true);
  });

  it('matches multi-word queries when every token is present', () => {
    expect(itemMatchesKeyword(item, 'Ko YGN')).toBe(true);
    expect(itemMatchesKeyword(item, 'unknown xyz')).toBe(false);
  });

  it('returns true for empty keyword and false for unrelated words', () => {
    expect(itemMatchesKeyword(item, '')).toBe(true);
    expect(itemMatchesKeyword(item, '   ')).toBe(true);
    expect(itemMatchesKeyword(item, 'Mandalay')).toBe(false);
  });
});
