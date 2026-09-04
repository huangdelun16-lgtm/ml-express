import { Package } from '../services/supabase';
import {
  getRiderDeliveryShareMmk,
  getRiderShareBaseFeeMmk,
} from './FinanceManagement.helpers';

function pkg(partial: Partial<Package>): Package {
  return {
    id: 'MDY-TEST-1',
    sender_name: '',
    sender_phone: '',
    sender_address: '',
    receiver_name: '',
    receiver_phone: '',
    receiver_address: '',
    package_type: '准时达',
    weight: '1',
    status: 'delivered',
    create_time: '',
    pickup_time: '',
    delivery_time: '',
    courier: '',
    price: '0',
    ...partial,
  };
}

describe('getRiderShareBaseFeeMmk', () => {
  it('uses the order snapshot when present', () => {
    expect(
      getRiderShareBaseFeeMmk(pkg({ pricing_base_fee_mmk: 2000 }), 1500),
    ).toBe(2000);
  });

  it('falls back to current settings for old orders without a snapshot', () => {
    expect(getRiderShareBaseFeeMmk(pkg({}), 1500)).toBe(1500);
  });
});

describe('getRiderDeliveryShareMmk', () => {
  it('准时达：客户实付 − 起步价快照 = 骑手跑腿费', () => {
    expect(
      getRiderDeliveryShareMmk(
        pkg({
          package_type: '准时达',
          price: '3600 MMK',
          pricing_base_fee_mmk: 2000,
        }),
        1500,
        { way_side_courier_per_order: 1000 },
      ),
    ).toBe(1600);
  });

  it('顺路递：骑手收固定额，不超过客户实付', () => {
    expect(
      getRiderDeliveryShareMmk(
        pkg({
          package_type: '顺路递',
          price: '2000',
          pricing_base_fee_mmk: 2000,
        }),
        2000,
        { way_side_courier_per_order: 1000 },
      ),
    ).toBe(1000);
  });

  it('顺路递固定额为 0 时回退为 客户实付 − 起步价', () => {
    expect(
      getRiderDeliveryShareMmk(
        pkg({
          package_type: 'Eco Way',
          price: '2000',
          pricing_base_fee_mmk: 2000,
        }),
        2000,
        { way_side_courier_per_order: 0 },
      ),
    ).toBe(0);
  });

  it('ignores courier_km_rate — rider share is never per-kilometer', () => {
    expect(
      getRiderDeliveryShareMmk(
        pkg({
          package_type: '准时达',
          price: '3600',
          pricing_base_fee_mmk: 2000,
          delivery_distance: 12,
        }),
        2000,
        { courier_km_rate: 300, way_side_courier_per_order: 1000 },
      ),
    ).toBe(1600);
  });
});
