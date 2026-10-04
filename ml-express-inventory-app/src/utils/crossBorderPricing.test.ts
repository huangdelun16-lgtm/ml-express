import { describe, expect, it, vi } from 'vitest';

vi.mock('../services/supabase', () => ({
  isSupabaseConfigured: () => false,
  getSupabaseUrl: () => '',
  getSupabaseAnonKey: () => '',
  supabase: {},
}));

import {
  formatCrossBorderCnyHint,
  pickRoutePerKgFromRows,
  shouldShowCrossBorderQuote,
} from './crossBorderPricing';

describe('pickRoutePerKgFromRows', () => {
  const rows = [
    {
      settings_key: 'pricing.cross_border.route.RUI.MDY.per_kg',
      settings_value: 22000,
    },
    {
      settings_key: 'pricing.cross_border.customer.MDY260812005.route.RUI.MDY.per_kg',
      settings_value: 18000,
    },
  ];

  it('prefers the customer-specific rate', () => {
    expect(pickRoutePerKgFromRows(rows, 'RUILI', 'MDY', 'mdy260812005')).toEqual({
      perKg: 18000,
      usedCustomerRate: true,
    });
  });

  it('falls back to the default route rate', () => {
    expect(pickRoutePerKgFromRows(rows, 'RUILI', 'MDY', 'YGN00921')).toEqual({
      perKg: 22000,
      usedCustomerRate: false,
    });
    expect(pickRoutePerKgFromRows(rows, 'RUILI', 'MDY')).toEqual({
      perKg: 22000,
      usedCustomerRate: false,
    });
  });

  it('returns null when neither customer nor default rate exists', () => {
    expect(pickRoutePerKgFromRows(rows, 'YGN', 'POL', 'MDY260812005')).toBeNull();
  });

  it('treats an explicit customer rate of 0 as free, not a fallback to the default', () => {
    const freeRows = [
      ...rows,
      {
        settings_key: 'pricing.cross_border.customer.MDY260802001.route.RUI.MDY.per_kg',
        settings_value: 0,
      },
    ];
    expect(pickRoutePerKgFromRows(freeRows, 'RUILI', 'MDY', 'MDY260802001')).toEqual({
      perKg: 0,
      usedCustomerRate: true,
    });
  });

  it('treats an explicit default rate of 0 as free', () => {
    expect(
      pickRoutePerKgFromRows(
        [{ settings_key: 'pricing.cross_border.route.RUI.MDY.per_kg', settings_value: 0 }],
        'RUILI',
        'MDY',
      ),
    ).toEqual({ perKg: 0, usedCustomerRate: false });
  });
});

describe('shouldShowCrossBorderQuote', () => {
  it('hides an empty fee and shows a recorded zero as free', () => {
    expect(shouldShowCrossBorderQuote('')).toBe(false);
    expect(shouldShowCrossBorderQuote('0')).toBe(true);
    expect(shouldShowCrossBorderQuote('12500')).toBe(true);
  });
});

describe('formatCrossBorderCnyHint', () => {
  it('keeps the stock-in quote in CNY only', () => {
    const hint = formatCrossBorderCnyHint('RUI', 'MDY', 23500, 8, 'MDY260824001', 5000);
    expect(hint).toBe('MDY260824001 · RUI → MDY ¥4.7/kg × 8 kg');
    expect(hint.includes('MMK')).toBe(false);
  });
});
