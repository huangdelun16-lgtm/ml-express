import {
  orderTouchesStation,
  packTouchesStation,
  sanitizeStationKey,
  stationFilterKeys,
} from './crossBorderStationFilter';

describe('crossBorderStationFilter', () => {
  it('expands a Yangon store to hub aliases', () => {
    const keys = stationFilterKeys({ store_code: 'YGN001', region: 'yangon' });
    expect(keys).toEqual(expect.arrayContaining(['YGN001', 'YGN', 'YANGON']));
    expect(sanitizeStationKey('yg n,')).toBe('YGN');
  });

  it('keeps packs that origin, dest, leg or receive at the station', () => {
    const keys = ['YGN001', 'YGN'];
    expect(
      packTouchesStation(
        { origin_store_code: 'MDY001', destination_code: 'YGN', leg_destination_code: 'YGN' },
        keys,
      ),
    ).toBe(true);
    expect(
      packTouchesStation(
        { origin_store_code: 'MDY001', destination_code: 'MDY', hub_received_by_store_code: 'YGN001' },
        keys,
      ),
    ).toBe(true);
    expect(
      packTouchesStation(
        { origin_store_code: 'MDY001', destination_code: 'MDY', leg_destination_code: 'MDY' },
        keys,
      ),
    ).toBe(false);
    expect(orderTouchesStation({ destination_code: 'YGN' }, keys)).toBe(true);
    expect(orderTouchesStation({ destination_code: 'MDY' }, keys)).toBe(false);
  });
});
