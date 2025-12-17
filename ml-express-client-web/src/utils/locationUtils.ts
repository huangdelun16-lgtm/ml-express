import { MYANMAR_CITIES, CityKey, DEFAULT_CITY_KEY } from '../constants/cities';

export const getNearestCityKey = (lat: number, lng: number): CityKey => {
  let nearestKey: CityKey = DEFAULT_CITY_KEY;
  let minDistance = Number.MAX_VALUE;

  (Object.entries(MYANMAR_CITIES) as [CityKey, typeof MYANMAR_CITIES[CityKey]][]).forEach(([key, city]) => {
    const distance = Math.hypot(city.lat - lat, city.lng - lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearestKey = key;
    }
  });

  return nearestKey;
};
