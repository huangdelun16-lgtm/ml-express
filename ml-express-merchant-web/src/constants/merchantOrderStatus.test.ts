import {
  MERCHANT_ORDER_STATUS,
  computeMerchantOrderStats,
  filterOrdersBySearch,
  filterPackagesByTab,
  getMerchantOrderStatusLabel,
  getMerchantPaymentMethodText,
} from './merchantOrderStatus';

describe('merchantOrderStatus', () => {
  const packages = [
    { status: MERCHANT_ORDER_STATUS.PENDING_CONFIRM },
    { status: MERCHANT_ORDER_STATUS.PACKING },
    { status: MERCHANT_ORDER_STATUS.PENDING_COD },
    { status: MERCHANT_ORDER_STATUS.PICKED_UP },
    { status: MERCHANT_ORDER_STATUS.DELIVERED },
  ];

  it('computeMerchantOrderStats matches tab groupings', () => {
    const stats = computeMerchantOrderStats(packages);
    expect(stats.total).toBe(5);
    expect(stats.pendingConfirmation).toBe(1);
    expect(stats.packing).toBe(1);
    expect(stats.pendingPickup).toBe(1);
    expect(stats.inTransit).toBe(1);
    expect(stats.completed).toBe(1);
  });

  it('filterPackagesByTab groups 待取件 with 待收款', () => {
    const filtered = filterPackagesByTab(
      packages,
      MERCHANT_ORDER_STATUS.PENDING_PICKUP,
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0].status).toBe(MERCHANT_ORDER_STATUS.PENDING_COD);
  });

  it('getMerchantOrderStatusLabel maps 待确认 to 待接单 (zh)', () => {
    expect(
      getMerchantOrderStatusLabel(
        MERCHANT_ORDER_STATUS.PENDING_CONFIRM,
        'zh',
      ),
    ).toBe('待接单');
  });

  it('getMerchantPaymentMethodText supports legacy labels', () => {
    expect(getMerchantPaymentMethodText('现金支付', 'zh')).toBe('现金支付');
    expect(getMerchantPaymentMethodText(undefined, 'zh', { emptyAsDash: true })).toBe(
      '-',
    );
  });

  it('filterOrdersBySearch matches order id, phones and names', () => {
    const orders = [
      {
        id: 'ML-1001',
        sender_name: 'Aung',
        sender_phone: '09-123 456',
        sender_address: 'Mandalay',
        receiver_name: 'Thiri',
        receiver_phone: '0987654321',
        receiver_address: 'Yangon',
      },
      {
        id: 'ML-2002',
        sender_name: 'Ko Ko',
        sender_phone: '0911111111',
        sender_address: 'Sagaing',
        receiver_name: 'Mg Mg',
        receiver_phone: '0922222222',
        receiver_address: 'Naypyitaw',
      },
    ];

    expect(filterOrdersBySearch(orders, '')).toHaveLength(2);
    expect(filterOrdersBySearch(orders, 'ML-1001').map((o) => o.id)).toEqual(['ML-1001']);
    expect(filterOrdersBySearch(orders, '09123456').map((o) => o.id)).toEqual(['ML-1001']);
    expect(filterOrdersBySearch(orders, 'thiri').map((o) => o.id)).toEqual(['ML-1001']);
    expect(filterOrdersBySearch(orders, 'yangon').map((o) => o.id)).toEqual(['ML-1001']);
    expect(filterOrdersBySearch(orders, 'zzz')).toHaveLength(0);
  });
});
