import { describe, expect, it, vi } from 'vitest';

vi.mock('../services/supabase', () => ({
  isSupabaseConfigured: () => false,
  supabase: {},
}));

import { formatCrossBorderFeeHint, pickRoutePerKgFromRows } from './crossBorderPricing';

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
});

describe('formatCrossBorderFeeHint', () => {
  it('prefixes the customer code when present', () => {
    expect(formatCrossBorderFeeHint('RUI', 'MDY', 18000, 2, false, 'MDY260812005')).toBe(
      'MDY260812005 · RUI → MDY 18000 MMK/kg × 2 kg',
    );
  });
});
