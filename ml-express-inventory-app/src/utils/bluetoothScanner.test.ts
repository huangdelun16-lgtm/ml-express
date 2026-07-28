import { describe, expect, it } from 'vitest';
import { mergeScannedDevices } from '../utils/bluetoothDeviceMerge';

describe('mergeScannedDevices', () => {
  it('merges by id and sorts by rssi descending', () => {
    const prev = [{ id: 'a', name: 'A', rssi: -70 }];
    const found = [
      { id: 'b', name: 'B', rssi: -50 },
      { id: 'a', name: 'A updated', rssi: -40 },
    ];
    expect(mergeScannedDevices(prev, found)).toEqual([
      { id: 'a', name: 'A updated', rssi: -40 },
      { id: 'b', name: 'B', rssi: -50 },
    ]);
  });
});
