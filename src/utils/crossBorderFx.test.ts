import {
  CROSS_BORDER_FX_HISTORY_SETTINGS_KEY,
  CROSS_BORDER_FX_SETTINGS_KEY,
  appendCrossBorderFxHistory,
  buildCrossBorderFxHistorySetting,
  buildCrossBorderFxSetting,
  cnyToMmk,
  customerExpressLedgerCategory,
  displayRateForCustomerCategory,
  formatCnyAmount,
  formatCnyInput,
  isCustomerLedgerCategory,
  isSettledCustomerCategory,
  mergeFxHistoryForSave,
  mmkToCny,
  parseCrossBorderFxHistory,
  parseMmkPerCnyRate,
  rateInEffectAt,
  pickMmkPerCnyRate,
  resolveCustomerFeeCny,
  resolveCustomerOrderMoney,
  sumCustomerOrderMoney,
} from './crossBorderFx';

describe('crossBorderFx', () => {
  it('parses a positive MMK-per-CNY rate and rejects junk', () => {
    expect(parseMmkPerCnyRate(5000)).toBe(5000);
    expect(parseMmkPerCnyRate('4,700')).toBe(4700);
    expect(parseMmkPerCnyRate({ value: 5000 })).toBe(5000);
    expect(parseMmkPerCnyRate(JSON.stringify({ value: 5000 }))).toBe(5000);
    expect(parseMmkPerCnyRate(0)).toBeNull();
    expect(parseMmkPerCnyRate(-1)).toBeNull();
    expect(parseMmkPerCnyRate('')).toBeNull();
    expect(parseMmkPerCnyRate('abc')).toBeNull();
    expect(parseMmkPerCnyRate(null)).toBeNull();
  });

  it('picks the FX setting and ignores other pricing keys', () => {
    expect(
      pickMmkPerCnyRate([
        { settings_key: 'pricing.cross_border.route.RUI.MDY.per_kg', settings_value: 23500 },
        { settings_key: CROSS_BORDER_FX_SETTINGS_KEY, settings_value: 5000 },
      ]),
    ).toBe(5000);
    expect(pickMmkPerCnyRate([])).toBeNull();
  });

  it('converts AUNG AUNG 23500 MMK/kg and 8kg booking without rewriting MMK', () => {
    const rate = 5000;
    expect(mmkToCny(23500, rate)).toBe(4.7);
    expect(cnyToMmk(4.7, rate)).toBe(23500);
    expect(cnyToMmk(37.6, rate)).toBe(188000);
    expect(mmkToCny(188000, rate)).toBe(37.6);
  });

  it('does not convert when the rate is missing', () => {
    expect(mmkToCny(188000, null)).toBeNull();
    expect(cnyToMmk(37.6, null)).toBeNull();
    expect(mmkToCny(188000, 0)).toBeNull();
    expect(cnyToMmk(Number.NaN, 5000)).toBeNull();
  });

  it('formats CNY for money and per-kg inputs', () => {
    expect(formatCnyAmount(37.6)).toBe('37.6');
    expect(formatCnyInput(4.7)).toBe('4.7');
    expect(formatCnyInput(5)).toBe('5');
  });

  it('classifies customer-ledger vs Myanmar-ledger categories', () => {
    expect(isCustomerLedgerCategory('pending_inflow')).toBe(true);
    expect(isCustomerLedgerCategory('collected')).toBe(true);
    expect(isCustomerLedgerCategory('manual_income')).toBe(true);
    expect(isCustomerLedgerCategory('order_income_cod')).toBe(true);
    expect(isCustomerLedgerCategory('transport_unpaid')).toBe(false);
    expect(isCustomerLedgerCategory('manual_expense')).toBe(false);
    expect(isCustomerLedgerCategory('agency_remit')).toBe(false);
  });

  it('uses locked rate for collected and live rate for pending', () => {
    expect(isSettledCustomerCategory('collected')).toBe(true);
    expect(isSettledCustomerCategory('order_prepaid')).toBe(true);
    expect(isSettledCustomerCategory('pending_inflow')).toBe(false);
    expect(displayRateForCustomerCategory('collected', 4700, 5000)).toBe(4700);
    expect(displayRateForCustomerCategory('collected', null, 5000)).toBeNull();
    expect(displayRateForCustomerCategory('pending_inflow', 4700, 5000)).toBe(5000);
    expect(resolveCustomerFeeCny({
      category: 'collected',
      mmk: 188000,
      lockedRate: 5000,
      paidCny: 37.6,
      liveRate: 4000,
    })).toBe(37.6);
    expect(resolveCustomerFeeCny({
      category: 'order_collected',
      mmk: 188000,
      liveRate: 5000,
    })).toBeNull();
    expect(resolveCustomerFeeCny({
      category: 'pending_inflow',
      mmk: 188000,
      liveRate: 5000,
    })).toBe(37.6);
    expect(customerExpressLedgerCategory({ paymentLabel: '预付' })).toBe('order_prepaid');
    expect(customerExpressLedgerCategory({ paymentStatus: '已收款', customerSigned: true })).toBe(
      'order_collected',
    );
    expect(customerExpressLedgerCategory({ paymentStatus: '到付待收' })).toBe('order_income_cod');
  });

  it('prices an unsigned order from the locked RMB quote, not from stored MMK', () => {
    expect(resolveCustomerOrderMoney({
      quoteCny: 2378.38,
      mmk: 1_000_000,
      customerSigned: false,
      liveRate: 666,
    })).toEqual({ cny: 2378.38, mmk: 1_584_001, frozen: false });
    expect(resolveCustomerOrderMoney({
      quoteCny: 2378.38,
      customerSigned: false,
      liveRate: null,
    })).toEqual({ cny: 2378.38, mmk: null, frozen: false });
  });

  it('does not invent RMB for an old unsigned order that only has MMK', () => {
    expect(resolveCustomerOrderMoney({
      mmk: 1_584_000,
      customerSigned: false,
      liveRate: 666,
    })).toEqual({ cny: null, mmk: 1_584_000, frozen: false });
  });

  it('keeps a signed order on the sign-day rate when the live rate changes', () => {
    expect(resolveCustomerOrderMoney({
      quoteCny: 2378.38,
      mmk: 1_584_000,
      customerSigned: true,
      lockedRate: 666,
      liveRate: 700,
    })).toEqual({ cny: 2378.38, mmk: 1_584_000, frozen: true });
    expect(resolveCustomerOrderMoney({
      quoteCny: 37.6,
      customerSigned: true,
      lockedRate: 5000,
      liveRate: 4000,
    })).toEqual({ cny: 37.6, mmk: 188_000, frozen: true });
    expect(resolveCustomerOrderMoney({
      mmk: 188_000,
      customerSigned: true,
      lockedRate: 5000,
      liveRate: 4000,
    })).toEqual({ cny: 37.6, mmk: 188_000, frozen: true });
    expect(resolveCustomerOrderMoney({
      mmk: 188_000,
      customerSigned: true,
      liveRate: 4000,
    })).toEqual({ cny: null, mmk: 188_000, frozen: true });
  });

  it('sums RMB only when every charged row has a quote', () => {
    expect(sumCustomerOrderMoney([
      { cny: 20, mmk: 13_320, frozen: false },
      { cny: 8, mmk: 5_328, frozen: false },
    ])).toEqual({ cny: 28, mmk: 18_648 });
    expect(sumCustomerOrderMoney([
      { cny: 20, mmk: 13_320, frozen: false },
      { cny: null, mmk: 50_000, frozen: true },
    ])).toEqual({ cny: null, mmk: 63_320 });
    expect(sumCustomerOrderMoney([
      { cny: 20, mmk: null, frozen: false },
    ])).toEqual({ cny: 20, mmk: null });
  });

  it('builds the system_settings payload', () => {
    expect(buildCrossBorderFxSetting(5000, '张三')).toMatchObject({
      category: 'pricing',
      settings_key: CROSS_BORDER_FX_SETTINGS_KEY,
      settings_value: 5000,
      updated_by: '张三',
    });
  });

  it('parses and appends FX change history newest first', () => {
    const parsed = parseCrossBorderFxHistory(
      JSON.stringify([
        { at: '2026-09-01T02:00:00.000Z', by: '李四', from: 580, to: 600 },
        { at: '2026-09-14T08:00:00.000Z', by: '张三', from: 600, to: 655 },
      ]),
    );
    expect(parsed[0]).toMatchObject({ by: '张三', from: 600, to: 655 });
    expect(parsed[1]).toMatchObject({ by: '李四', from: 580, to: 600 });

    const next = appendCrossBorderFxHistory(parsed, {
      at: '2026-09-14T09:00:00.000Z',
      by: '王五',
      from: 655,
      to: 660,
    });
    expect(next[0]).toMatchObject({ by: '王五', to: 660 });
    expect(next).toHaveLength(3);
    expect(buildCrossBorderFxHistorySetting(next, '王五')).toMatchObject({
      settings_key: CROSS_BORDER_FX_HISTORY_SETTINGS_KEY,
      updated_by: '王五',
    });
  });

  it('uses the exchange rate that was in effect when a route price was saved', () => {
    const history = parseCrossBorderFxHistory([
      { at: '2026-10-06T10:14:30.442Z', by: 'admin', from: 666, to: 669 },
      { at: '2026-10-03T03:44:37.571Z', by: 'admin', from: 672, to: 666 },
      { at: '2026-09-29T14:14:32.938Z', by: 'admin', from: 664, to: 672 },
    ]);
    expect(rateInEffectAt(history, 669, '2026-10-06T03:20:57.243Z')).toBe(666);
    expect(rateInEffectAt(history, 669, '2026-10-06T12:00:00.000Z')).toBe(669);
    expect(rateInEffectAt(history, 669, '2026-09-28T00:00:00.000Z')).toBe(664);
    expect(rateInEffectAt(history, 669, null)).toBe(669);
    const wiped = parseCrossBorderFxHistory([
      { at: '2026-10-06T11:23:48.430Z', by: 'admin', from: null, to: 669 },
    ]);
    expect(rateInEffectAt(wiped, 669, '2026-10-06T03:20:57.243Z')).toBeNull();
  });

  it('keeps older FX history when the settings page has not loaded it yet', () => {
    const server = parseCrossBorderFxHistory([
      { at: '2026-10-06T10:14:31.214Z', by: 'admin', from: 666, to: 669 },
      { at: '2026-10-03T03:44:33.007Z', by: 'admin', from: 672, to: 666 },
    ]);
    const same = mergeFxHistoryForSave({
      serverHistory: server,
      clientHistory: [],
      fromRate: 669,
      toRate: 669,
      at: '2026-10-06T11:23:48.430Z',
      by: 'admin',
    });
    expect(same.unchanged).toBe(true);
    expect(same.history.some((row) => row.from === 666 && row.to === 669)).toBe(true);
    expect(same.history.some((row) => row.from === 672 && row.to === 666)).toBe(true);

    const next = mergeFxHistoryForSave({
      serverHistory: server,
      clientHistory: [],
      fromRate: 669,
      toRate: 670,
      at: '2026-10-07T01:00:00.000Z',
      by: 'admin',
    });
    expect(next.unchanged).toBe(false);
    expect(next.history[0]).toMatchObject({ from: 669, to: 670 });
    expect(next.history.some((row) => row.from === 666 && row.to === 669)).toBe(true);
  });
});
