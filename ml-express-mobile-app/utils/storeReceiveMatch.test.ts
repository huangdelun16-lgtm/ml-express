import { describe, expect, it } from 'vitest';
import { matchPackagesForStoreReceive } from './storeReceiveMatch';

describe('matchPackagesForStoreReceive', () => {
  const pkgs = [
    { id: 'A', delivery_store_id: 'store-1' },
    { id: 'B', delivery_store_id: 'store-2' },
    { id: 'C', delivery_store_id: 'store-1' },
    { id: 'D' },
  ];

  it('returns only packages bound to that store', () => {
    expect(matchPackagesForStoreReceive(pkgs, 'store-1').map((p) => p.id)).toEqual(['A', 'C']);
  });

  it('returns empty when store id is missing', () => {
    expect(matchPackagesForStoreReceive(pkgs, '  ')).toEqual([]);
  });

  it('also matches by store receive QR when delivery_store_id is empty', () => {
    const withCode = [
      { id: 'E', store_receive_code: 'STORE_store-1_ABC' },
      { id: 'F', store_receive_code: 'STORE_store-2_XYZ' },
    ];
    expect(
      matchPackagesForStoreReceive(withCode, 'store-1', 'STORE_store-1_ABC').map((p) => p.id),
    ).toEqual(['E']);
  });
});
