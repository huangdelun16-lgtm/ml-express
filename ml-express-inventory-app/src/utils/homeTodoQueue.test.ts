import { describe, expect, it } from 'vitest';
import type { InventoryStoreSession } from '../services/authService';
import {
  buildHomeTodoQueue,
  countPendingInboundOrders,
  countPendingPackItems,
  countPendingTruckLoads,
  countSignableItems,
  countUnpaidTripFees,
  emptyHomeTodoCounts,
  HOME_TODO_KEYS,
  isPendingPackItem,
  normalizeTodoCount,
  settledCount,
  sumHomeTodoCounts,
} from './homeTodoQueue';

const ygnStore: InventoryStoreSession = {
  id: '1',
  storeCode: 'YGN001',
  storeName: 'YGN',
  storeType: 'transit_station',
  hubCode: 'YGN',
  region: 'YGN',
  address: '',
  loggedInAt: '2026-08-31T00:00:00.000Z',
};

const museStore: InventoryStoreSession = {
  ...ygnStore,
  storeCode: 'MUSE001',
  storeName: 'MUSE',
  hubCode: 'MSE',
  region: 'MSE',
};

describe('homeTodoQueue', () => {
  it('keeps daily-flow order and drops zero counts', () => {
    const queue = buildHomeTodoQueue({
      truckLoad: 2,
      hubArrive: 3,
      pack: 0,
      sign: 4,
      exceptions: 1,
      notify: 2,
    });
    expect(queue.map((item) => item.key)).toEqual([
      'hubArrive',
      'exceptions',
      'notify',
      'sign',
      'truckLoad',
    ]);
    expect(queue.find((item) => item.key === 'notify')).toMatchObject({
      screen: 'Items',
      itemsMode: 'sign',
    });
    expect(queue[0]).toMatchObject({ screen: 'HubReceive', count: 3 });
    expect(queue.find((item) => item.key === 'sign')).toMatchObject({
      screen: 'Items',
      itemsMode: 'sign',
    });
    expect(HOME_TODO_KEYS[0]).toBe('hubArrive');
  });

  it('normalizes invalid counts', () => {
    expect(normalizeTodoCount(-2)).toBe(0);
    expect(normalizeTodoCount(1.8)).toBe(1);
    expect(normalizeTodoCount('x')).toBe(0);
    expect(sumHomeTodoCounts(buildHomeTodoQueue({ hubArrive: 2, pack: 3 }))).toBe(5);
    expect(emptyHomeTodoCounts().hubInbound).toBe(0);
    expect(settledCount({ status: 'rejected', reason: new Error('offline') })).toBe(0);
    expect(settledCount({ status: 'fulfilled', value: 9 })).toBe(9);
  });

  it('counts unpaid trip fee groups once', () => {
    const packs = [
      { pack_barcode: 'PKG-A', trip_number: 'MSE0007', transport_fee: '15000' },
      { pack_barcode: 'PKG-B', trip_number: 'MSE0007', transport_fee: '15000' },
      { pack_barcode: 'PKG-C', trip_number: 'MSE0008', transport_fee: '8000' },
      { pack_barcode: 'PKG-D', trip_number: 'MSE0009', transport_fee: '0' },
    ];
    expect(countUnpaidTripFees(packs, [])).toBe(2);
    expect(countUnpaidTripFees(packs, ['PKG-A'])).toBe(1);
    expect(countUnpaidTripFees(packs, ['pkg-a', 'PKG-C'])).toBe(0);
  });

  it('counts inbound orders only on arrived packs', () => {
    expect(
      countPendingInboundOrders(
        ['RUI26YGN20001', 'RUI26YGN20002'],
        [
          { pack_barcode: 'RUI26YGN20001', status: 'in_transit' },
          { pack_barcode: 'RUI26YGN20001', status: 'hub_received' },
          { pack_barcode: 'RUI26YGN20002', status: 'in_transit' },
          { pack_barcode: 'OTHER', status: 'in_transit' },
        ],
      ),
    ).toBe(2);
  });

  it('treats unpacked on-hand items as pack todos', () => {
    expect(
      isPendingPackItem({
        barcode: 'YGN123',
        qty_on_hand: 1,
        packed_at: '',
        packed_bundle_barcode: '',
      }),
    ).toBe(true);
    expect(
      countPendingPackItems([
        { barcode: 'YGN123', qty_on_hand: 1 },
        { barcode: 'YGN124', qty_on_hand: 1, packed_at: '2026-08-01' },
        { barcode: 'RUI26MDY10001', qty_on_hand: 1 },
        { barcode: 'YGN125', qty_on_hand: 0 },
      ]),
    ).toBe(1);
  });

  it('counts truck-load candidates that are not cloud-locked', () => {
    expect(
      countPendingTruckLoads([
        { loaded: false, cloud_status: null },
        { loaded: false, cloud_status: 'in_transit' },
        { loaded: true, cloud_status: null },
        { loaded: false, cloud_status: 'hub_received' },
      ]),
    ).toBe(1);
  });

  it('counts destination unsigned items and blocks MUSE origin at MUSE', () => {
    expect(
      countSignableItems(ygnStore, [
        {
          barcode: 'YGN001A',
          hub_arrived_at: '2026-08-31T00:00:00.000Z',
          customer_signed_at: '',
          final_destination: 'YGN',
          destination: 'YGN',
          owner_store_code: 'MUSE001',
        },
        {
          barcode: 'YGN001B',
          hub_arrived_at: '2026-08-31T00:00:00.000Z',
          customer_signed_at: '2026-08-31T01:00:00.000Z',
          final_destination: 'YGN',
          destination: 'YGN',
          owner_store_code: 'MUSE001',
        },
        {
          barcode: 'MDY001A',
          hub_arrived_at: '2026-08-31T00:00:00.000Z',
          customer_signed_at: '',
          final_destination: 'MDY',
          destination: 'MDY',
          owner_store_code: 'MUSE001',
        },
      ]),
    ).toBe(1);

    expect(
      countSignableItems(museStore, [
        {
          barcode: 'MSE001A',
          hub_arrived_at: '2026-08-31T00:00:00.000Z',
          customer_signed_at: '',
          final_destination: 'MSE',
          destination: 'MSE',
          owner_store_code: 'MUSE001',
        },
      ]),
    ).toBe(0);
  });
});
