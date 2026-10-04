import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  Vibration: { vibrate: vi.fn() },
}));

import {
  decideScanRead,
  extractScanPayload,
  isBarcodeInsideFrame,
  normalizeScanCode,
  scanFrameRect,
} from './barcodeScan';

describe('barcodeScan', () => {
  it('normalizes scan codes to uppercase without control chars', () => {
    expect(normalizeScanCode('  mdy123\n')).toBe('MDY123');
  });

  it('strips an AIM symbology prefix', () => {
    expect(normalizeScanCode(']C1YT114562896')).toBe('YT114562896');
  });

  it('prefers the longest candidate between data and raw', () => {
    expect(extractScanPayload('MDY123', 'MDY123456789')).toBe('MDY123456789');
  });

  it('falls back to data when raw is empty', () => {
    expect(extractScanPayload('YT114562896', '')).toBe('YT114562896');
  });

  it('holds the first read and accepts the same code on the next read', () => {
    const held = decideScanRead('YT114562896', '', '', 0, 1_000, 420, false, false);
    expect(held).toEqual({ action: 'hold', code: 'YT114562896' });
    const accepted = decideScanRead('YT114562896', 'YT114562896', '', 0, 1_040, 420, false, false);
    expect(accepted).toEqual({ action: 'accept', code: 'YT114562896' });
  });

  it('upgrades a partial read to the longer code before accepting', () => {
    const upgraded = decideScanRead('YT114562896EXTRA', 'YT114562896', '', 0, 1_020, 420, false, false);
    expect(upgraded).toEqual({ action: 'hold', code: 'YT114562896EXTRA' });
  });

  it('keeps a waybill when a retail code appears beside it', () => {
    const held = decideScanRead('6901234567892', 'YT114562896', '', 0, 1_020, 420, false, false);
    expect(held).toEqual({ action: 'hold', code: 'YT114562896' });
  });

  it('accepts a typed code immediately', () => {
    expect(decideScanRead('MDY10001', '', '', 0, 1_000, 420, false, true)).toEqual({
      action: 'accept',
      code: 'MDY10001',
    });
  });

  it('ignores a short fragment and a repeat still inside the cooldown', () => {
    expect(decideScanRead('AB', '', '', 0, 1_000, 420, false, false)).toEqual({ action: 'ignore' });
    expect(decideScanRead('YT114562896', '', 'YT114562896', 900, 1_000, 420, false, false)).toEqual({
      action: 'ignore',
    });
  });

  it('accepts a code whose center is inside the frame and ignores one outside', () => {
    const frame = scanFrameRect(400, 700, 300, 136);
    expect(frame).not.toBeNull();
    const inside = isBarcodeInsideFrame(
      { origin: { x: frame!.x + 40, y: frame!.y + 20 }, size: { width: 180, height: 40 } },
      frame,
    );
    const outside = isBarcodeInsideFrame(
      { origin: { x: 8, y: 8 }, size: { width: 40, height: 20 } },
      frame,
    );
    expect(inside).toBe(true);
    expect(outside).toBe(false);
  });

  it('does not block a scan when the platform reports an empty box', () => {
    const frame = scanFrameRect(400, 700, 300, 136);
    expect(isBarcodeInsideFrame({ origin: { x: 0, y: 0 }, size: { width: 0, height: 0 } }, frame)).toBe(true);
  });
});
