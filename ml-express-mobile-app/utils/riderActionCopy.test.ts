import { describe, expect, it } from 'vitest';
import { riderActionCopy } from './riderActionCopy';

describe('riderActionCopy', () => {
  it('does not fall back to English for Myanmar pickup/delivery/anomaly', () => {
    const my = riderActionCopy('my');
    const en = riderActionCopy('en');
    expect(my.confirmPickupTitle).not.toBe(en.confirmPickupTitle);
    expect(my.confirmDeliver).not.toBe(en.confirmDeliver);
    expect(my.anomalyTitle).not.toBe(en.anomalyTitle);
    expect(my.scanDeliver).not.toBe(en.scanDeliver);
    expect(my.photoDeliver).not.toBe(en.photoDeliver);
  });
});
