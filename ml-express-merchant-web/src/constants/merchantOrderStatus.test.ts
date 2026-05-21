import {
  MERCHANT_ORDER_STATUS,
  computeMerchantOrderStats,
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
});
