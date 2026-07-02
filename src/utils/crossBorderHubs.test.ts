import {
  CROSS_BORDER_HUBS,
  nextCrossBorderStoreCode,
  storeBelongsToCrossBorderHub,
} from './crossBorderHubs';

describe('crossBorderHubs store codes', () => {
  const polHub = CROSS_BORDER_HUBS.find((h) => h.regionId === 'maymyo')!;

  it('matches legacy region formats', () => {
    expect(storeBelongsToCrossBorderHub({ region: 'POL', store_code: 'AMT' }, polHub)).toBe(true);
    expect(storeBelongsToCrossBorderHub({ region: '彬乌伦', store_code: 'AMT' }, polHub)).toBe(true);
    expect(storeBelongsToCrossBorderHub({ region: 'maymyo', store_code: 'AMT' }, polHub)).toBe(true);
  });

  it('increments max suffix instead of counting rows', () => {
    const existing = [
      { region: 'POL', store_code: 'POL001' },
      { region: 'maymyo', store_code: 'AMT' },
    ];
    expect(nextCrossBorderStoreCode(polHub, existing)).toBe('POL002');
  });

  it('starts at 001 when region has no numbered codes yet', () => {
    expect(nextCrossBorderStoreCode(polHub, [{ region: 'maymyo', store_code: 'AMT' }])).toBe(
      'POL001',
    );
  });
});
