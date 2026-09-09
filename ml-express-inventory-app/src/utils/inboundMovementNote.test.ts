import { describe, expect, it, vi } from 'vitest';

vi.mock('../services/supabase', () => ({
  isSupabaseConfigured: () => false,
  getSupabaseUrl: () => '',
  getSupabaseAnonKey: () => '',
  supabase: {},
}));

import {
  inboundNoteHasFeeOrPayment,
  parseInboundMovementNote,
  pickInboundFeeFields,
  pickNotesFxLock,
  pickPrimaryInboundMovement,
} from './inboundMovementNote';

describe('parseInboundMovementNote', () => {
  it('parses Chinese fee and prepaid', () => {
    const parsed = parseInboundMovementNote('总费用 5000 MMK · 预付 · 备注');
    expect(parsed.totalFee).toBe('5000');
    expect(parsed.paymentLabel).toBe('预付');
    expect(parsed.userNote).toBe('备注');
  });

  it('parses English fee and COD', () => {
    const parsed = parseInboundMovementNote('Total fee 12000 MMK · COD');
    expect(parsed.totalFee).toBe('12000');
    expect(parsed.paymentLabel).toBe('到付');
  });

  it('parses packaging stock-in pack note total fee', () => {
    const parsed = parseInboundMovementNote('多个入库 · 总费用 50000 MMK · 09');
    expect(parsed.totalFee).toBe('50000');
    expect(parsed.userNote).toBe('多个入库 · 09');
  });

  it('detects fee or payment in note', () => {
    expect(inboundNoteHasFeeOrPayment('Total fee 100 MMK · Prepaid')).toBe(true);
    expect(inboundNoteHasFeeOrPayment('仅备注')).toBe(false);
  });

  it('keeps FX lock out of the user note and still reads the MMK fee', () => {
    const parsed = parseInboundMovementNote('总费用 188000 MMK · 到付 · 实收 37.6 CNY · 汇率 5000');
    expect(parsed.totalFee).toBe('188000');
    expect(parsed.paymentLabel).toBe('到付');
    expect(parsed.userNote).toBeUndefined();
    expect(parsed.fxLock).toEqual({
      paidCurrency: 'CNY',
      mmkPerCny: 5000,
      paidCny: 37.6,
    });
  });

  it('prefers the item-note lock when inbound movement has none', () => {
    expect(
      pickNotesFxLock('实收 MMK · 汇率 5000', '总费用 188000 MMK · 到付'),
    ).toEqual({ paidCurrency: 'MMK', mmkPerCny: 5000 });
  });

  it('picks fee from the origin inbound when hub receive is newer', () => {
    const origin = {
      created_at: '2026-09-07T00:23:55+00',
      note: '总费用 125000 MMK · 到付 · 入库包装日期 Mon Sep 07 2026 · 打包入 RUI26MDY30002',
    };
    const hub = {
      created_at: '2026-09-07T00:25:53.086+00',
      note: '到站交付确认 · 包 RUI26MDY30002',
    };
    expect(pickPrimaryInboundMovement([hub, origin])).toEqual(origin);
    expect(pickInboundFeeFields(hub.note, origin.note)).toEqual({
      totalFee: '125000',
      paymentLabel: '到付',
    });
  });
});
