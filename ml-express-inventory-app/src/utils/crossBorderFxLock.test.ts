import { describe, expect, it, vi } from 'vitest';

vi.mock('../services/supabase', () => ({
  isSupabaseConfigured: () => false,
  getSupabaseUrl: () => '',
  getSupabaseAnonKey: () => '',
  supabase: {},
}));

import {
  applyFxLockToNote,
  buildSignFxLock,
  displayRateForCustomerCategory,
  parseFeeMmk,
  parseFxLockFromNote,
  hasRecordedFee,
  resolveInvoiceFeeDisplay,
  sumSettledCustomerCny,
} from './crossBorderFxLock';

describe('crossBorderFxLock', () => {
  it('writes and parses MMK collection lock without touching the booked fee', () => {
    const next = applyFxLockToNote('总费用 188000 MMK · 到付 · 易碎', {
      paidCurrency: 'MMK',
      mmkPerCny: 5000,
    });
    expect(next).toBe('总费用 188000 MMK · 到付 · 易碎 · 实收 MMK · 汇率 5000');
    expect(parseFxLockFromNote(next)).toEqual({
      paidCurrency: 'MMK',
      mmkPerCny: 5000,
    });
  });

  it('replaces an existing lock and records paid CNY', () => {
    const locked = applyFxLockToNote('总费用 188000 MMK · 到付 · 实收 MMK · 汇率 4800', {
      paidCurrency: 'CNY',
      mmkPerCny: 5000,
      paidCny: 37.6,
    });
    expect(locked).toBe('总费用 188000 MMK · 到付 · 实收 37.6 CNY · 汇率 5000');
    expect(parseFxLockFromNote(locked)).toEqual({
      paidCurrency: 'CNY',
      mmkPerCny: 5000,
      paidCny: 37.6,
    });
  });

  it('builds a sign lock from the live HQ rate', () => {
    expect(buildSignFxLock({ feeMmk: 188000, currency: 'MMK', mmkPerCny: 5000 })).toEqual({
      paidCurrency: 'MMK',
      mmkPerCny: 5000,
    });
    expect(buildSignFxLock({ feeMmk: 188000, currency: 'CNY', mmkPerCny: 5000 })).toEqual({
      paidCurrency: 'CNY',
      mmkPerCny: 5000,
      paidCny: 37.6,
    });
    expect(buildSignFxLock({ feeMmk: 188000, currency: 'CNY', mmkPerCny: null })).toBeNull();
  });

  it('uses locked rate for collected rows and live rate only for pending', () => {
    expect(displayRateForCustomerCategory('order_collected', 5000, 5200)).toBe(5000);
    expect(displayRateForCustomerCategory('order_collected', null, 5200)).toBeNull();
    expect(displayRateForCustomerCategory('order_income_cod', null, 5200)).toBe(5200);
    expect(parseFeeMmk('188000')).toBe(188000);
    expect(hasRecordedFee('0')).toBe(true);
    expect(hasRecordedFee('')).toBe(false);
    expect(hasRecordedFee('12500')).toBe(true);
  });

  it('shows live CNY on unsigned invoices and never rewrites old signed rows', () => {
    expect(
      resolveInvoiceFeeDisplay({
        feeMmk: 188000,
        signed: false,
        liveRate: 5000,
      }),
    ).toEqual({ mmk: 188000, cny: 37.6, usedLock: false, legacySignedMmkOnly: false });

    expect(
      resolveInvoiceFeeDisplay({
        feeMmk: 188000,
        signed: true,
        lockedRate: 4800,
        liveRate: 5200,
      }),
    ).toEqual({ mmk: 188000, cny: 188000 / 4800, usedLock: true, legacySignedMmkOnly: false });

    expect(
      resolveInvoiceFeeDisplay({
        feeMmk: 188000,
        signed: true,
        paidCny: 37.6,
        lockedRate: 5000,
        liveRate: 5200,
      }),
    ).toEqual({ mmk: 188000, cny: 37.6, usedLock: true, legacySignedMmkOnly: false });

    expect(
      resolveInvoiceFeeDisplay({
        feeMmk: 188000,
        signed: true,
        lockedRate: null,
        liveRate: 5200,
      }),
    ).toEqual({ mmk: 188000, cny: null, usedLock: false, legacySignedMmkOnly: true });
  });

  it('refuses to invent a collected CNY total when any settled row is unlocked', () => {
    expect(
      sumSettledCustomerCny([
        { category: 'order_collected', amount: 188000, fxMmkPerCny: 5000 },
        { category: 'order_prepaid', amount: 10000, fxMmkPerCny: 5000 },
      ]),
    ).toBe(39.6);
    expect(
      sumSettledCustomerCny([
        { category: 'order_collected', amount: 188000, fxMmkPerCny: 5000 },
        { category: 'order_collected', amount: 10000 },
      ]),
    ).toBeNull();
  });
});
