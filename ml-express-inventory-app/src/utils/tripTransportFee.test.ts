import { describe, expect, it } from 'vitest';
import {
  buildTripFeeGroupMap,
  isPrimaryTripFeePack,
  parseTripTransportFee,
  tripTransportGroupKey,
} from './tripTransportFee';

describe('tripTransportFee', () => {
  it('groups packages by trip and keeps single fee', () => {
    const map = buildTripFeeGroupMap([
      { pack_barcode: 'PKG-A', trip_number: 'MSE0007', transport_fee: '15000' },
      { pack_barcode: 'PKG-B', trip_number: 'MSE0007', transport_fee: '15000' },
    ]);
    const group = map.get(tripTransportGroupKey('MSE0007', 'PKG-A'));
    expect(group?.packCount).toBe(2);
    expect(group?.fee).toBe(15000);
    expect(isPrimaryTripFeePack('PKG-A', 'MSE0007', map)).toBe(true);
    expect(isPrimaryTripFeePack('PKG-B', 'MSE0007', map)).toBe(false);
  });

  it('falls back to per-pack when no trip number', () => {
    expect(parseTripTransportFee('15000')).toBe(15000);
    const map = buildTripFeeGroupMap([
      { pack_barcode: 'PKG-A', trip_number: '', transport_fee: '1000' },
    ]);
    expect(map.get(tripTransportGroupKey('', 'PKG-A'))?.fee).toBe(1000);
  });

  it('groups by load batch when trip_number missing', () => {
    const loaded = '2026-08-04T10:00:00.000Z';
    const map = buildTripFeeGroupMap([
      {
        pack_barcode: 'RUI26LSO30001',
        trip_number: '',
        transport_fee: '30000',
        truck_loaded_at: loaded,
        origin_store_code: 'RUILI001',
        leg_destination_code: 'LSO',
      },
      {
        pack_barcode: 'RUI26LSO30002',
        trip_number: '',
        transport_fee: '30000',
        truck_loaded_at: loaded,
        origin_store_code: 'RUILI001',
        leg_destination_code: 'LSO',
      },
    ]);
    const key = tripTransportGroupKey('', 'RUI26LSO30001', {
      truck_loaded_at: loaded,
      origin_store_code: 'RUILI001',
      leg_destination_code: 'LSO',
    });
    const group = map.get(key);
    expect(group?.packCount).toBe(2);
    expect(group?.fee).toBe(30000);
    expect(isPrimaryTripFeePack('RUI26LSO30001', '', map, {
      truck_loaded_at: loaded,
      origin_store_code: 'RUILI001',
      leg_destination_code: 'LSO',
    })).toBe(true);
    expect(isPrimaryTripFeePack('RUI26LSO30002', '', map, {
      truck_loaded_at: loaded,
      origin_store_code: 'RUILI001',
      leg_destination_code: 'LSO',
    })).toBe(false);
  });
});
