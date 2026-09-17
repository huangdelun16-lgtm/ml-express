import {
  isStaleSearchRequest,
  mapNominatimHits,
  mapPhotonFeatures,
  mapPlacePredictions,
  nextSearchRequestId,
  placesLanguage,
  resolveMapPlaceSearchStatus,
  shouldSearchMapPlaces,
} from './mapPlaceSearch';

describe('mapPlaceSearch', () => {
  it('advances request ids and rejects stale responses', () => {
    const first = nextSearchRequestId(0);
    const second = nextSearchRequestId(first);
    expect(isStaleSearchRequest(first, second)).toBe(true);
    expect(isStaleSearchRequest(second, second)).toBe(false);
  });

  it('only searches after two non-space characters', () => {
    expect(shouldSearchMapPlaces('')).toBe(false);
    expect(shouldSearchMapPlaces(' a ')).toBe(false);
    expect(shouldSearchMapPlaces('ab')).toBe(true);
  });

  it('maps UI language to Places language codes', () => {
    expect(placesLanguage('zh')).toBe('zh-CN');
    expect(placesLanguage('my')).toBe('my');
    expect(placesLanguage('en')).toBe('en');
  });

  it('separates success, empty, and failed Places statuses', () => {
    expect(resolveMapPlaceSearchStatus('OK', 3)).toBe('success');
    expect(resolveMapPlaceSearchStatus('ZERO_RESULTS', 0)).toBe('empty');
    expect(resolveMapPlaceSearchStatus('REQUEST_DENIED', 0)).toBe('error');
  });

  it('normalizes predictions and drops incomplete rows', () => {
    expect(
      mapPlacePredictions([
        {
          place_id: 'p1',
          description: 'Zay Cho, Mandalay',
          structured_formatting: { main_text: 'Zay Cho', secondary_text: 'Mandalay' },
        },
        { description: 'missing id' },
      ]),
    ).toEqual([
      expect.objectContaining({
        placeId: 'p1',
        mainText: 'Zay Cho',
        secondaryText: 'Mandalay',
        description: 'Zay Cho, Mandalay',
      }),
    ]);
  });

  it('maps nominatim hits with coordinates', () => {
    expect(
      mapNominatimHits([
        {
          osm_type: 'node',
          osm_id: 1,
          lat: '21.9588',
          lon: '96.0891',
          name: 'Zay Cho',
          display_name: 'Zay Cho, Mandalay, Myanmar',
          address: { city: 'Mandalay', country: 'Myanmar' },
        },
      ]),
    ).toEqual([
      expect.objectContaining({
        placeId: 'osm:node:1',
        mainText: 'Zay Cho',
        secondaryText: 'Mandalay, Myanmar',
        latitude: 21.9588,
        longitude: 96.0891,
      }),
    ]);
  });

  it('maps photon features with lon/lat order', () => {
    expect(
      mapPhotonFeatures({
        features: [
          {
            geometry: { coordinates: [96.0891, 21.9588] },
            properties: {
              osm_id: 9,
              osm_type: 'N',
              name: 'Venus',
              city: 'Mandalay',
              country: 'Myanmar',
            },
          },
        ],
      }),
    ).toEqual([
      expect.objectContaining({
        placeId: 'osm:N:9',
        mainText: 'Venus',
        latitude: 21.9588,
        longitude: 96.0891,
      }),
    ]);
  });
});
