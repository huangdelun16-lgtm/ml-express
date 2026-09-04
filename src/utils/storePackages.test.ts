import { packageBelongsToStore } from './storePackages';

describe('packageBelongsToStore', () => {
  const storeId = 'ce097a5f-abd4-4935-9dc7-aa107eb1e74d';

  it('keeps packages delivered to the store or placed by the store', () => {
    expect(
      packageBelongsToStore({ delivery_store_id: storeId }, storeId),
    ).toBe(true);
    expect(
      packageBelongsToStore({ customer_id: storeId }, storeId),
    ).toBe(true);
  });

  it('drops nearby sender coordinates that are not this store', () => {
    expect(
      packageBelongsToStore(
        {
          delivery_store_id: '84e7f9b3-cec0-4606-82a7-f7b7a500107b',
          customer_id: '84e7f9b3-cec0-4606-82a7-f7b7a500107b',
          sender_latitude: 21.954,
          sender_longitude: 96.102,
        },
        storeId,
      ),
    ).toBe(false);
  });
});
