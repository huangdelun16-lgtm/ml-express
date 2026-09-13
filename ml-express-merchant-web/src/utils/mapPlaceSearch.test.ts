import {
  isStaleSearchRequest,
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
    expect(first).toBe(1);
    expect(second).toBe(2);
    expect(isStaleSearchRequest(first, second)).toBe(true);
    expect(isStaleSearchRequest(second, second)).toBe(false);
  });

  it('only searches after two non-space characters', () => {
    expect(shouldSearchMapPlaces('')).toBe(false);
    expect(shouldSearchMapPlaces(' a ')).toBe(false);
    expect(shouldSearchMapPlaces('ab')).toBe(true);
    expect(shouldSearchMapPlaces('  仰光')).toBe(true);
  });

  it('maps UI language to Places language codes', () => {
    expect(placesLanguage('zh')).toBe('zh-CN');
    expect(placesLanguage('my')).toBe('my');
    expect(placesLanguage('en')).toBe('en');
  });

  it('separates success, empty, and failed Places statuses', () => {
    expect(resolveMapPlaceSearchStatus('OK', 3)).toBe('success');
    expect(resolveMapPlaceSearchStatus('OK', 0)).toBe('empty');
    expect(resolveMapPlaceSearchStatus('ZERO_RESULTS', 0)).toBe('empty');
    expect(resolveMapPlaceSearchStatus('REQUEST_DENIED', 0)).toBe('error');
    expect(resolveMapPlaceSearchStatus('OVER_QUERY_LIMIT', 2)).toBe('error');
    expect(resolveMapPlaceSearchStatus(undefined, 0)).toBe('error');
  });

  it('normalizes predictions and drops incomplete rows', () => {
    expect(
      mapPlacePredictions([
        {
          place_id: 'p1',
          description: 'Zay Cho, Mandalay',
          structured_formatting: {
            main_text: 'Zay Cho',
            secondary_text: 'Mandalay',
          },
        },
        { description: 'missing id' },
      ]),
    ).toEqual([
      {
        placeId: 'p1',
        mainText: 'Zay Cho',
        secondaryText: 'Mandalay',
        description: 'Zay Cho, Mandalay',
      },
    ]);
  });
});
