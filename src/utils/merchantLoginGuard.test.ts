import {
  getMerchantLoginBlockReason,
  getTransitAccountMerchantLoginMessage,
  isTransitStationStore,
} from '../services/_shared/merchantLoginGuard';

describe('merchantLoginGuard', () => {
  it('detects transit_station stores', () => {
    expect(isTransitStationStore({ store_type: 'transit_station' })).toBe(true);
    expect(isTransitStationStore({ store_type: 'restaurant' })).toBe(false);
  });

  it('blocks merchant login for transit accounts', () => {
    expect(getMerchantLoginBlockReason({ store_type: 'transit_station' }, 'zh')).toContain('Inventory App');
    expect(getMerchantLoginBlockReason({ store_type: 'restaurant' }, 'zh')).toBeNull();
  });

  it('returns localized messages', () => {
    expect(getTransitAccountMerchantLoginMessage('en')).toContain('Inventory App');
  });
});
