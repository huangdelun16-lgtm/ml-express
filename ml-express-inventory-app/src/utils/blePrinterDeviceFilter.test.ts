import { describe, expect, it } from 'vitest';
import {
  filterLikelyBlePrinters,
  isLikelyBlePrinterDevice,
} from './blePrinterDeviceFilter';

describe('blePrinterDeviceFilter', () => {
  it('accepts common label printer names', () => {
    expect(isLikelyBlePrinterDevice({ id: 'a', name: 'XP-P201A', rssi: -50 })).toBe(true);
    expect(isLikelyBlePrinterDevice({ id: 'b', name: 'Xprinter_P203A', rssi: -60 })).toBe(true);
    expect(isLikelyBlePrinterDevice({ id: 'c', name: 'Label Printer', rssi: -70 })).toBe(true);
  });

  it('rejects phones and unnamed devices', () => {
    expect(isLikelyBlePrinterDevice({ id: 'd', name: 'iPhone', rssi: -40 })).toBe(false);
    expect(isLikelyBlePrinterDevice({ id: 'e', name: 'e', rssi: -40 })).toBe(false);
    expect(isLikelyBlePrinterDevice({ id: 'f', name: '', rssi: -40 })).toBe(false);
  });

  it('filters device lists', () => {
    const devices = [
      { id: 'a', name: 'XP-P201A', rssi: -50 },
      { id: 'b', name: 'AirPods Pro', rssi: -30 },
      { id: 'c', name: 'Printer001', rssi: -60 },
    ];
    expect(filterLikelyBlePrinters(devices)).toEqual([
      { id: 'a', name: 'XP-P201A', rssi: -50 },
      { id: 'c', name: 'Printer001', rssi: -60 },
    ]);
  });
});
