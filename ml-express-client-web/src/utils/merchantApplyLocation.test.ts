import {
  formatCoordPair,
  geocoderLanguage,
  isHubDefaultCoord,
  isLikelyMyanmarCoord,
  parseCoordinatePair,
  pickFormattedAddress,
} from './merchantApplyLocation';

const HUBS = [
  { id: 'mandalay', lat: 21.9588, lng: 96.0891 },
  { id: 'yangon', lat: 16.8661, lng: 96.1951 },
];

describe('merchantApplyLocation', () => {
  it('parses valid coordinates', () => {
    expect(parseCoordinatePair('21.9588', '96.0891')).toEqual({
      ok: true,
      lat: 21.9588,
      lng: 96.0891,
    });
  });

  it('rejects blank or non-numeric coordinates', () => {
    expect(parseCoordinatePair('', '96')).toEqual({ ok: false, reason: 'invalid' });
    expect(parseCoordinatePair('abc', '96')).toEqual({ ok: false, reason: 'invalid' });
  });

  it('rejects coordinates outside the globe', () => {
    expect(parseCoordinatePair('95', '96')).toEqual({ ok: false, reason: 'out_of_range' });
  });

  it('treats city hubs as unconfirmed defaults', () => {
    expect(isHubDefaultCoord(21.9588, 96.0891, HUBS)).toBe(true);
    expect(isHubDefaultCoord(21.9612, 96.091, HUBS)).toBe(false);
  });

  it('soft-checks Myanmar bounds', () => {
    expect(isLikelyMyanmarCoord(21.96, 96.09)).toBe(true);
    expect(isLikelyMyanmarCoord(1.35, 103.82)).toBe(false);
  });

  it('formats coords and geocoder language', () => {
    expect(formatCoordPair(21.9588, 96.0891)).toBe('21.95880, 96.08910');
    expect(geocoderLanguage('zh')).toBe('zh-CN');
    expect(geocoderLanguage('en')).toBe('en');
    expect(geocoderLanguage('my')).toBe('my');
  });

  it('picks a readable address from a geocode/place result', () => {
    expect(pickFormattedAddress({ formatted_address: '  88th St, Mandalay  ' })).toBe(
      '88th St, Mandalay',
    );
    expect(pickFormattedAddress({ name: 'Zay Cho' })).toBe('Zay Cho');
    expect(pickFormattedAddress(null)).toBe('');
  });
});
