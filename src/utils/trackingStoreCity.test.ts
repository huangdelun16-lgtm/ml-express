import { storeMatchesTrackingCity, trackingCityOfStore } from './trackingStoreCity';

const cities = {
  mandalay: { lat: 21.9588, lng: 96.0891 },
  pyinoolwin: { lat: 22.0333, lng: 96.4667 },
  yangon: { lat: 16.8661, lng: 96.1951 },
  naypyidaw: { lat: 19.7633, lng: 96.0785 },
  taunggyi: { lat: 20.7892, lng: 97.0378 },
  lashio: { lat: 22.9333, lng: 97.75 },
  muse: { lat: 23.9833, lng: 97.9 },
};

describe('trackingStoreCity', () => {
  it('keeps a store in the city named by its code, even if the pin is elsewhere', () => {
    const store = { store_code: 'YGN012', latitude: cities.mandalay.lat, longitude: cities.mandalay.lng };
    expect(trackingCityOfStore(store, cities)).toBe('yangon');
    expect(storeMatchesTrackingCity(store, 'yangon', cities)).toBe(true);
    expect(storeMatchesTrackingCity(store, 'mandalay', cities)).toBe(false);
  });

  it('maps maymyo region to Pyin Oo Lwin when the code has no city prefix', () => {
    const store = { store_code: 'AMT', region: 'maymyo', latitude: cities.mandalay.lat, longitude: cities.mandalay.lng };
    expect(storeMatchesTrackingCity(store, 'pyinoolwin', cities)).toBe(true);
    expect(storeMatchesTrackingCity(store, 'mandalay', cities)).toBe(false);
  });

  it('uses the nearest city center within 50km when code and region are blank', () => {
    const mandalay = { store_code: '', latitude: cities.mandalay.lat, longitude: cities.mandalay.lng };
    const pyin = { store_code: '', latitude: cities.pyinoolwin.lat, longitude: cities.pyinoolwin.lng };
    expect(storeMatchesTrackingCity(mandalay, 'mandalay', cities)).toBe(true);
    expect(storeMatchesTrackingCity(pyin, 'mandalay', cities)).toBe(false);
    expect(storeMatchesTrackingCity(pyin, 'pyinoolwin', cities)).toBe(true);
  });

  it('reads MUSE and MSE as Muse', () => {
    expect(trackingCityOfStore({ store_code: 'MUSE1' }, cities)).toBe('muse');
    expect(trackingCityOfStore({ store_code: 'MSE002' }, cities)).toBe('muse');
  });
});
