import { CROSS_BORDER_HUBS } from './crossBorderHubs';
import { nextSalespersonEmployeeCode } from './crossBorderSalespersons';

describe('crossBorderSalespersons employee codes', () => {
  const mdyHub = CROSS_BORDER_HUBS.find((h) => h.regionId === 'mandalay')!;

  it('starts at PREFIX-001 when region has no codes yet', () => {
    expect(nextSalespersonEmployeeCode(mdyHub, [])).toBe('MDY-001');
  });

  it('increments max suffix for the same work area', () => {
    const existing = [
      { work_area_code: 'MDY', employee_code: 'MDY-001' },
      { work_area_code: 'MDY', employee_code: 'MDY-003' },
      { work_area_code: 'YGN', employee_code: 'YGN-002' },
    ];
    expect(nextSalespersonEmployeeCode(mdyHub, existing)).toBe('MDY-004');
  });

  it('ignores codes from other regions', () => {
    expect(
      nextSalespersonEmployeeCode(mdyHub, [{ work_area_code: 'YGN', employee_code: 'YGN-005' }]),
    ).toBe('MDY-001');
  });
});
