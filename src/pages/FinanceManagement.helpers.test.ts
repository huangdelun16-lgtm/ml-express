import { FinanceRecord, Package } from '../services/supabase';
import {
  calculateFinanceOverviewSummary,
  detectFinanceRegionPrefix,
  getLocalMonthBounds,
  getMerchantUnclearedAmountMmk,
  getMerchantSettlementParts,
  getPendingRiderCashAmountMmk,
  getPlatformPaymentAmountFromDescription,
  summarizeRiderCashCollection,
  getPlatformDeliveryKeepMmk,
  getRiderDeliveryShareMmk,
  getRiderShareBaseFeeMmk,
  splitWaySideFiftyFifty,
  groupDeliveredPackagesForSalaryMonth,
  isPackageInLocalMonth,
  shiftLocalDateYYYYMMDD,
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

  it('顺路递：骑手与平台对半，忽略固定额配置', () => {
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
    expect(
      getPlatformDeliveryKeepMmk(
        pkg({
          package_type: '顺路递',
          price: '2000',
          pricing_base_fee_mmk: 2000,
        }),
        2000,
      ),
    ).toBe(1000);
  });

  it('顺路递配置为 0 时仍按实付对半，不回退起步价', () => {
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
    ).toBe(1000);
  });

  it('顺路递奇数金额余 1 MMK 归平台', () => {
    expect(splitWaySideFiftyFifty(2001)).toEqual({ rider: 1000, platform: 1001 });
    expect(
      getRiderDeliveryShareMmk(
        pkg({
          package_type: '顺路递',
          price: '2001',
          pricing_base_fee_mmk: 2000,
        }),
        2000,
      ),
    ).toBe(1000);
    expect(
      getPlatformDeliveryKeepMmk(
        pkg({
          package_type: '顺路递',
          price: '2001',
        }),
        2000,
      ),
    ).toBe(1001);
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

function record(partial: Partial<FinanceRecord>): FinanceRecord {
  return {
    id: 'R1',
    record_type: 'income',
    category: '同城配送',
    amount: 0,
    currency: 'MMK',
    status: 'completed',
    payment_method: 'cash',
    record_date: '2026-09-04',
    ...partial,
  };
}

const store = { id: 'store-1', store_name: '测试店' };

describe('getPlatformPaymentAmountFromDescription', () => {
  it('reads the platform-pay tag', () => {
    expect(
      getPlatformPaymentAmountFromDescription('[平台支付: 4,500 MMK] extra'),
    ).toBe(4500);
  });

  it('reads 商品费用（仅余额） but does not treat 付给商家 as platform', () => {
    expect(
      getPlatformPaymentAmountFromDescription(
        '[商品费用 (仅余额支付): 8,000 MMK][付给商家: 8,000 MMK]',
      ),
    ).toBe(8000);
  });

  it('does not add 余额支付 and 商品费用 twice when they are the same goods amount', () => {
    expect(
      getPlatformPaymentAmountFromDescription(
        '[余额支付: 8,000 MMK][商品费用 (仅余额支付): 8,000 MMK]',
      ),
    ).toBe(8000);
  });
});

describe('getMerchantUnclearedAmountMmk', () => {
  it('counts rider-settled COD plus platform pay when merchant has not settled', () => {
    expect(
      getMerchantUnclearedAmountMmk(
        pkg({
          status: '已送达',
          delivery_store_id: 'store-1',
          sender_name: '测试店',
          rider_settled: true,
          cod_settled: false,
          cod_amount: 8000,
          description: '[平台支付: 2000 MMK]',
        }),
        [store],
      ),
    ).toBe(10000);
  });

  it('does not count COD before the rider has settled', () => {
    expect(
      getMerchantUnclearedAmountMmk(
        pkg({
          status: '已送达',
          delivery_store_id: 'store-1',
          rider_settled: false,
          cod_settled: false,
          cod_amount: 8000,
          description: '[平台支付: 2000 MMK]',
        }),
        [store],
      ),
    ).toBe(2000);
  });

  it('does not double-count the same goods amount as COD and 余额支付', () => {
    expect(
      getMerchantUnclearedAmountMmk(
        pkg({
          id: 'MDY20260901165268',
          status: '已送达',
          delivery_store_id: 'store-1',
          sender_name: 'MARKET LINK EXPRESS',
          payment_method: 'cash',
          rider_settled: true,
          cod_settled: false,
          cod_amount: 8000,
          description:
            '[下单身份: VIP] [已选商品: Photo frame nail x1][余额支付: 8,000 MMK]',
        }),
        [store],
      ),
    ).toBe(8000);
    const parts = getMerchantSettlementParts(
      pkg({
        status: '已送达',
        delivery_store_id: 'store-1',
        rider_settled: true,
        cod_settled: false,
        cod_amount: 16400,
        description: '[商品费用 (仅余额支付): 16,400 MMK]',
      }),
      [store],
    );
    expect(parts.duplicate).toBe(true);
    expect(parts.pendingCodMmk).toBe(0);
    expect(parts.unclearedMmk).toBe(16400);
  });

  it('MARKET LINK EXPRESS four uncleared orders sum without doubling', () => {
    const mle = { id: 'mdy002', store_name: 'MARKET LINK EXPRESS' };
    const orders = [
      pkg({
        id: 'MDY20260820122498',
        status: '已送达',
        sender_name: 'MARKET LINK EXPRESS',
        payment_method: 'balance',
        rider_settled: true,
        cod_settled: false,
        cod_amount: 20,
        description: '[商品费用 (仅余额支付): 20 MMK]',
      }),
      pkg({
        id: 'MDY20260820160623',
        status: '已送达',
        sender_name: 'MARKET LINK EXPRESS',
        payment_method: 'balance',
        rider_settled: true,
        cod_settled: false,
        cod_amount: 8000,
        description: '[商品费用 (仅余额支付): 8,000 MMK]',
      }),
      pkg({
        id: 'MDY20260820161532',
        status: '已送达',
        sender_name: 'MARKET LINK EXPRESS',
        payment_method: 'cash',
        rider_settled: true,
        cod_settled: false,
        cod_amount: 16400,
        description: '[商品费用 (仅余额支付): 16,400 MMK]',
      }),
      pkg({
        id: 'MDY20260901165268',
        status: '已送达',
        sender_name: 'MARKET LINK EXPRESS',
        payment_method: 'cash',
        rider_settled: true,
        cod_settled: false,
        cod_amount: 8000,
        description: '[余额支付: 8,000 MMK]',
      }),
    ];
    expect(
      orders.reduce(
        (sum, row) => sum + getMerchantUnclearedAmountMmk(row, [mle]),
        0,
      ),
    ).toBe(32420);
  });

  it('store card total equals the sum of each uncleared order line', () => {
    const orders = [
      pkg({
        id: 'MDY-A',
        status: '已送达',
        delivery_store_id: 'store-1',
        rider_settled: true,
        cod_settled: false,
        cod_amount: 30000,
        description: '[平台支付: 2000 MMK]',
      }),
      pkg({
        id: 'MDY-B',
        status: '已完成',
        delivery_store_id: 'store-1',
        rider_settled: true,
        cod_settled: false,
        cod_amount: 8420,
      }),
      pkg({
        id: 'MDY-OLD',
        status: '已送达',
        delivery_store_id: 'store-1',
        rider_settled: false,
        cod_settled: false,
        cod_amount: 9999,
      }),
    ];
    const cardTotal = orders.reduce(
      (sum, row) => sum + getMerchantUnclearedAmountMmk(row, [store]),
      0,
    );
    const modalLines = orders.filter(
      (row) => getMerchantUnclearedAmountMmk(row, [store]) > 0,
    );
    expect(cardTotal).toBe(40420);
    expect(modalLines).toHaveLength(2);
    expect(
      modalLines.reduce(
        (sum, row) => sum + getMerchantUnclearedAmountMmk(row, [store]),
        0,
      ),
    ).toBe(cardTotal);
  });
});

describe('getPendingRiderCashAmountMmk', () => {
  it('adds delivery fee and merchant COD for unsettled cash on that day', () => {
    expect(
      getPendingRiderCashAmountMmk(
        pkg({
          status: '已送达',
          payment_method: 'cash',
          rider_settled: false,
          delivery_time: '2026-09-04T10:00:00',
          price: '2000',
          delivery_store_id: 'store-1',
          sender_name: '测试店',
          cod_amount: 5000,
        }),
        '2026-09-04',
        [store],
      ),
    ).toBe(7000);
  });
});

describe('summarizeRiderCashCollection', () => {
  it('keeps prior-day unsettled cash visible when the selected day is 0', () => {
    const summary = summarizeRiderCashCollection({
      packages: [
        pkg({
          id: 'MDY-OLD-1',
          courier: 'AUNG MOE WIN',
          status: '已送达',
          payment_method: 'cash',
          rider_settled: false,
          delivery_time: '2026-09-01T10:00:00',
          price: '3500',
          delivery_store_id: 'store-1',
          sender_name: '测试店',
          cod_amount: 2000,
        }),
        pkg({
          id: 'MDY-TODAY-1',
          courier: 'AUNG MOE WIN',
          status: '已送达',
          payment_method: 'cash',
          rider_settled: false,
          delivery_time: '2026-09-04T10:00:00',
          price: '0',
        }),
      ],
      selectedDate: '2026-09-04',
      settlementStatus: 'unsettled',
      stores: [store],
      courierName: 'AUNG MOE WIN',
    });
    expect(summary.selectedDayCashMmk).toBe(0);
    expect(summary.overdueCashMmk).toBe(5500);
    expect(summary.overduePackages).toHaveLength(1);
    expect(summary.earliestOverdueDate).toBe('2026-09-01');
  });

  it('does not drop older bills just because today has no packages', () => {
    const summary = summarizeRiderCashCollection({
      packages: [
        pkg({
          id: 'MDY-OLD-2',
          courier: 'AUNG MOE WIN',
          status: '已完成',
          payment_method: 'cash',
          rider_settled: false,
          delivery_time: '2026-08-28T18:00:00',
          price: '1200',
        }),
      ],
      selectedDate: '2026-09-04',
      settlementStatus: 'unsettled',
      stores: [],
      courierName: 'AUNG MOE WIN',
    });
    expect(summary.selectedDayPackages).toHaveLength(0);
    expect(summary.overdueCashMmk).toBe(1200);
  });

  it('ignores already settled prior-day cash', () => {
    const summary = summarizeRiderCashCollection({
      packages: [
        pkg({
          id: 'MDY-OLD-3',
          courier: 'AUNG MOE WIN',
          status: '已送达',
          payment_method: 'cash',
          rider_settled: true,
          delivery_time: '2026-09-01T10:00:00',
          price: '9999',
        }),
      ],
      selectedDate: '2026-09-04',
      settlementStatus: 'unsettled',
      stores: [],
      courierName: 'AUNG MOE WIN',
    });
    expect(summary.overdueCashMmk).toBe(0);
    expect(summary.overduePackages).toHaveLength(0);
  });
});

describe('calculateFinanceOverviewSummary', () => {
  const pricing = { mandalay: { base_fee: 2000, way_side_courier_per_order: 1000 } };

  it('counts only completed manual books and ignores pending or cancelled', () => {
    const summary = calculateFinanceOverviewSummary({
      records: [
        record({ amount: 1000, status: 'completed' }),
        record({ id: 'R2', amount: 9999, status: 'pending' }),
        record({
          id: 'R3',
          record_type: 'expense',
          amount: 300,
          status: 'completed',
        }),
        record({
          id: 'R4',
          record_type: 'expense',
          amount: 888,
          status: 'cancelled',
        }),
      ],
      packages: [],
      stores: [],
      regionalPricingMap: pricing,
      cashCollectionDate: '2026-09-04',
    });
    expect(summary.totalIncome).toBe(1000);
    expect(summary.totalExpense).toBe(300);
    expect(summary.netProfit).toBe(700);
  });

  it('keeps cash order income, starting fee and rider share out until the rider settles', () => {
    const summary = calculateFinanceOverviewSummary({
      records: [],
      packages: [
        pkg({
          status: '已送达',
          payment_method: 'cash',
          rider_settled: false,
          price: '3600',
          pricing_base_fee_mmk: 2000,
          delivery_time: '2026-09-04T08:00:00',
        }),
      ],
      stores: [],
      regionalPricingMap: pricing,
      cashCollectionDate: '2026-09-04',
      now: new Date('2026-09-04T12:00:00'),
    });
    expect(summary.packageIncome).toBe(0);
    expect(summary.pendingPayments).toBe(3600);
    expect(summary.courierKmCost).toBe(0);
    expect(summary.totalStartingFee).toBe(0);
    expect(summary.booksBalanced).toBe(true);
    expect(summary.monthlyRiderFee).toBe(1600);
    expect(summary.dailyRiderFee).toBe(1600);
  });

  it('way-side 50/50 plus on-time snapshot equals recognized order income', () => {
    const summary = calculateFinanceOverviewSummary({
      records: [],
      packages: [
        pkg({
          id: 'MDY-ONTIME-1',
          status: '已送达',
          package_type: '准时达',
          payment_method: 'balance',
          price: '3600',
          pricing_base_fee_mmk: 2000,
          delivery_time: '2026-09-04T08:00:00',
        }),
        pkg({
          id: 'MDY20260820160273',
          status: '已送达',
          package_type: '顺路递',
          payment_method: 'balance',
          price: '2000',
          pricing_base_fee_mmk: 2000,
          delivery_time: '2026-09-04T09:00:00',
        }),
        pkg({
          id: 'MDY-CASH-OPEN',
          status: '已送达',
          package_type: '准时达',
          payment_method: 'cash',
          rider_settled: false,
          price: '3600',
          pricing_base_fee_mmk: 2000,
          delivery_time: '2026-09-04T10:00:00',
        }),
      ],
      stores: [],
      regionalPricingMap: pricing,
      cashCollectionDate: '2026-09-04',
      now: new Date('2026-09-04T12:00:00'),
    });
    expect(summary.packageIncome).toBe(5600);
    expect(summary.totalStartingFee).toBe(2000);
    expect(summary.waySidePlatformKeep).toBe(1000);
    expect(summary.waySideRiderShare).toBe(1000);
    expect(summary.courierKmCost).toBe(2600);
    expect(summary.packageIncomeCashCount).toBe(0);
    expect(summary.packageIncomeBalanceCount).toBe(2);
    expect(summary.booksBalanced).toBe(true);
    expect(summary.monthlyRiderFee).toBe(4200);
  });

  it('aligns merchant collection with COD-detail uncleared (COD after rider settle + platform pay)', () => {
    const summary = calculateFinanceOverviewSummary({
      records: [],
      packages: [
        pkg({
          id: 'MDY-COD-1',
          status: '已送达',
          delivery_store_id: 'store-1',
          sender_name: '测试店',
          rider_settled: true,
          cod_settled: false,
          cod_amount: 8000,
          description: '[平台支付: 1500 MMK]',
          price: '2000',
          payment_method: 'balance',
          pricing_base_fee_mmk: 2000,
        }),
      ],
      stores: [store],
      regionalPricingMap: pricing,
      cashCollectionDate: '2026-09-04',
    });
    expect(summary.merchantsCollection).toBe(9500);
    expect(summary.totalPlatformPayment).toBe(1500);
    expect(summary.packageIncome).toBe(2000);
  });

  it('scopes package totals to the regional prefix when given', () => {
    const summary = calculateFinanceOverviewSummary({
      records: [],
      packages: [
        pkg({
          id: 'YGN-1',
          status: '已送达',
          payment_method: 'balance',
          price: '5000',
          pricing_base_fee_mmk: 2000,
        }),
        pkg({
          id: 'MDY-1',
          status: '已送达',
          payment_method: 'balance',
          price: '3000',
          pricing_base_fee_mmk: 2000,
        }),
      ],
      stores: [],
      regionalPricingMap: pricing,
      cashCollectionDate: '2026-09-04',
      regionPrefix: 'YGN',
    });
    expect(summary.packageIncome).toBe(5000);
    expect(summary.courierKmCost).toBe(3000);
    expect(summary.packageCount).toBe(1);
  });
});

describe('shiftLocalDateYYYYMMDD', () => {
  it('moves one calendar day without UTC skip', () => {
    expect(shiftLocalDateYYYYMMDD('2026-09-04', -1)).toBe('2026-09-03');
    expect(shiftLocalDateYYYYMMDD('2026-09-04', 1)).toBe('2026-09-05');
  });

  it('crosses month boundaries on the local calendar', () => {
    expect(shiftLocalDateYYYYMMDD('2026-09-01', -1)).toBe('2026-08-31');
    expect(shiftLocalDateYYYYMMDD('2026-08-31', 1)).toBe('2026-09-01');
  });
});

describe('salary month grouping', () => {
  it('keeps August deliveries out of September groups', () => {
    const groups = groupDeliveredPackagesForSalaryMonth(
      [
        pkg({
          id: 'MDY-AUG',
          status: '已送达',
          courier: 'Aung',
          delivery_time: '2026-08-20T10:00:00',
        }),
        pkg({
          id: 'MDY-SEP',
          status: '已送达',
          courier: 'Aung',
          delivery_time: '2026-09-02T10:00:00',
        }),
        pkg({
          id: 'MDY-UNASSIGNED',
          status: '已送达',
          courier: '待分配',
          delivery_time: '2026-09-03T10:00:00',
        }),
      ],
      '2026-09',
    );
    expect(Object.keys(groups)).toEqual(['Aung']);
    expect(groups.Aung.map((p) => p.id)).toEqual(['MDY-SEP']);
    expect(
      isPackageInLocalMonth(
        pkg({ delivery_time: '2026-08-20T10:00:00' }),
        '2026-09',
      ),
    ).toBe(false);
  });

  it('builds local month bounds without UTC shift', () => {
    const bounds = getLocalMonthBounds('2026-09');
    expect(bounds.start).toBe('2026-09-01');
    expect(bounds.end).toBe('2026-09-30');
  });
});

describe('detectFinanceRegionPrefix', () => {
  it('recognizes all seven billing regions by username prefix', () => {
    expect(detectFinanceRegionPrefix('NPWfinance')).toBe('NPW');
    expect(detectFinanceRegionPrefix('TGIop')).toBe('TGI');
    expect(detectFinanceRegionPrefix('LSOadmin1')).toBe('LSO');
    expect(detectFinanceRegionPrefix('MUSE01')).toBe('MUSE');
    expect(detectFinanceRegionPrefix('MDY01')).toBe('MDY');
  });

  it('prefers account region and matches MUSE before MDY-like names', () => {
    expect(detectFinanceRegionPrefix('operator', 'yangon')).toBe('YGN');
    expect(detectFinanceRegionPrefix('operator', 'muse')).toBe('MUSE');
    expect(detectFinanceRegionPrefix('unknown')).toBe('');
  });
});
