import {
  buildCrossBorderCustomerCode,
  formatApplicationDateCompact,
  nextDailyCustomerSeq,
  salespersonNumericSuffix,
} from './crossBorderCustomerCode';

describe('crossBorderCustomerCode', () => {
  it('formats application date as YYMMDD', () => {
    expect(formatApplicationDateCompact('2026-08-24')).toBe('260824');
  });

  it('extracts salesperson numeric suffix', () => {
    expect(salespersonNumericSuffix('001')).toBe('001');
    expect(salespersonNumericSuffix('MDY-005')).toBe('005');
  });

  it('counts daily sequence per area and application date', () => {
    const rows = [
      { delivery_area_code: 'MDY', application_date: '2026-08-24' },
      { delivery_area_code: 'MDY', application_date: '2026-08-24T00:00:00' },
      { delivery_area_code: 'YGN', application_date: '2026-08-24' },
      { delivery_area_code: 'MDY', application_date: '2026-08-23' },
    ];
    expect(nextDailyCustomerSeq(rows, 'MDY', '2026-08-24')).toBe(3);
    expect(nextDailyCustomerSeq(rows, 'YGN', '2026-08-24')).toBe(2);
    expect(nextDailyCustomerSeq([], 'MDY', '2026-08-24')).toBe(1);
  });

  it('takes the max daily sequence already stored in customer codes', () => {
    const rows = [
      {
        delivery_area_code: 'MDY',
        application_date: '2026-08-24',
        customer_code: 'MDY2608241001',
      },
    ];
    expect(nextDailyCustomerSeq(rows, 'MDY', '2026-08-24')).toBe(2);
  });

  it('builds customer code with daily sequence between date and salesperson', () => {
    expect(buildCrossBorderCustomerCode('MDY', '2026-08-24', '001', 1)).toBe('MDY2608241001');
    expect(buildCrossBorderCustomerCode('MDY', '2026-08-24', 'MDY-001', 1)).toBe('MDY2608241001');
    expect(buildCrossBorderCustomerCode('MDY', '2026-08-24', '001', 10)).toBe('MDY26082410001');
  });
});
