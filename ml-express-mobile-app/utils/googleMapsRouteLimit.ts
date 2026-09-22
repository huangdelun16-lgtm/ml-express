/** Google Maps URL / 免费 Directions：最多 9 个途经点 + 1 个终点 = 10 站。 */
export const GOOGLE_MAPS_MAX_STOPS = 10;

export function splitGoogleMapsStops<T>(stops: T[]): {
  navigable: T[];
  remaining: T[];
  truncated: boolean;
} {
  if (!stops.length) {
    return { navigable: [], remaining: [], truncated: false };
  }
  if (stops.length <= GOOGLE_MAPS_MAX_STOPS) {
    return { navigable: stops, remaining: [], truncated: false };
  }
  return {
    navigable: stops.slice(0, GOOGLE_MAPS_MAX_STOPS),
    remaining: stops.slice(GOOGLE_MAPS_MAX_STOPS),
    truncated: true,
  };
}
