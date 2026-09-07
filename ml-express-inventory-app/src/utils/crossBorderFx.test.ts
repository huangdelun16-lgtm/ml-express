import { describe, expect, it, vi } from 'vitest';

vi.mock('../services/supabase', () => ({
  isSupabaseConfigured: () => false,
  getSupabaseUrl: () => '',
  getSupabaseAnonKey: () => '',
  supabase: {},
}));

import {
  CROSS_BORDER_FX_SETTINGS_KEY,
  cnyToMmk,
  formatCnyAmount,
  formatCnyInput,
  isCustomerLedgerCategory,
  mmkToCny,
  parseMmkPerCnyRate,
  pickMmkPerCnyRate,
} from './crossBorderFx';

describe('crossBorderFx', () => {
  it('parses a positive MMK-per-CNY rate and rejects junk', () => {
    expect(parseMmkPerCnyRate(5000)).toBe(5000);
    expect(parseMmkPerCnyRate('4,700')).toBe(4700);
    expect(parseMmkPerCnyRate({ value: 5000 })).toBe(5000);
    expect(parseMmkPerCnyRate(0)).toBeNull();
    expect(parseMmkPerCnyRate('')).toBeNull();
    expect(parseMmkPerCnyRate(null)).toBeNull();
  });

  it('picks the FX setting', () => {
    expect(
      pickMmkPerCnyRate([
        { settings_key: CROSS_BORDER_FX_SETTINGS_KEY, settings_value: 5000 },
      ]),
    ).toBe(5000);
    expect(pickMmkPerCnyRate([])).toBeNull();
  });

  it('keeps 8kg × 23500 MMK/kg booked as 188000 MMK', () => {
    expect(cnyToMmk(4.7, 5000)).toBe(23500);
    expect(cnyToMmk(37.6, 5000)).toBe(188000);
    expect(mmkToCny(188000, 5000)).toBe(37.6);
    expect(mmkToCny(188000, null)).toBeNull();
  });

  it('formats CNY without inventing 0 CNY', () => {
    expect(formatCnyAmount(37.6)).toBe('37.6');
    expect(formatCnyInput(4.7)).toBe('4.7');
  });

  it('marks collected / pending as customer ledger', () => {
    expect(isCustomerLedgerCategory('order_collected')).toBe(true);
    expect(isCustomerLedgerCategory('order_income_cod')).toBe(true);
    expect(isCustomerLedgerCategory('transport_cost')).toBe(false);
    expect(isCustomerLedgerCategory('manual_expense')).toBe(false);
  });
});
