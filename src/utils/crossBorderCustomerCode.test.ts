import {
  buildCrossBorderCustomerCode,
  formatApplicationDateCompact,
  salespersonNumericSuffix,
} from './crossBorderCustomerCode';

describe('crossBorderCustomerCode', () => {
  it('formats application date as YYMMDD', () => {
    expect(formatApplicationDateCompact('2026-08-12')).toBe('260812');
  });

  it('extracts salesperson numeric suffix', () => {
    expect(salespersonNumericSuffix('005')).toBe('005');
    expect(salespersonNumericSuffix('MDY-005')).toBe('005');
  });

  it('builds customer code from area, date and salesperson', () => {
    expect(buildCrossBorderCustomerCode('MDY', '2026-08-12', '005')).toBe('MDY260812005');
    expect(buildCrossBorderCustomerCode('MDY', '2026-08-12', 'MDY-005')).toBe('MDY260812005');
  });
});
