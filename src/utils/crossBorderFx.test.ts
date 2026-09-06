import {
  CROSS_BORDER_FX_SETTINGS_KEY,
  buildCrossBorderFxSetting,
  cnyToMmk,
  formatCnyAmount,
  formatCnyInput,
  isCustomerLedgerCategory,
  mmkToCny,
  parseMmkPerCnyRate,
  pickMmkPerCnyRate,
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

  it('builds the system_settings payload', () => {
    expect(buildCrossBorderFxSetting(5000)).toMatchObject({
      category: 'pricing',
      settings_key: CROSS_BORDER_FX_SETTINGS_KEY,
      settings_value: 5000,
    });
  });
});
