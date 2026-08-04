import { CROSS_BORDER_HUBS } from './crossBorderHubs';
import {
  formatSalespersonEmployeeCodeDisplay,
  nextSalespersonEmployeeCode,
} from './crossBorderSalespersons';

describe('crossBorderSalespersons employee codes', () => {
  const mdyHub = CROSS_BORDER_HUBS.find((h) => h.regionId === 'mandalay')!;

  it('starts at 001 when no salespersons exist', () => {
    expect(nextSalespersonEmployeeCode([])).toBe('001');
  });

  it('increments globally across all work areas', () => {
    const existing = [
      { work_area_code: 'RUI', employee_code: '001' },
      { work_area_code: 'MDY', employee_code: '002' },
    ];
    expect(nextSalespersonEmployeeCode(existing)).toBe('003');
  });

  it('supports legacy PREFIX-### codes when calculating next number', () => {
    const existing = [{ work_area_code: 'RUI', employee_code: 'RUI-001' }];
    expect(nextSalespersonEmployeeCode(existing)).toBe('002');
  });

  it('displays code without region prefix', () => {
    expect(formatSalespersonEmployeeCodeDisplay('RUI-001')).toBe('001');
    expect(formatSalespersonEmployeeCodeDisplay('002')).toBe('002');
  });

  it('does not reset sequence when adding in a different region', () => {
    const existing = [{ work_area_code: 'RUI', employee_code: '001' }];
    expect(nextSalespersonEmployeeCode(existing)).toBe('002');
    expect(mdyHub.prefix).toBe('MDY');
  });
});
