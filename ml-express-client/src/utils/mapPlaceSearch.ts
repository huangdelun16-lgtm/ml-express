export const MAP_PLACE_SEARCH_DEBOUNCE_MS = 300;
export const MAP_PLACE_SEARCH_TIMEOUT_MS = 8000;
export const MAP_PLACE_SEARCH_MIN_CHARS = 2;

export type MapPlaceSuggestion = {
  placeId: string;
  mainText: string;
  secondaryText: string;
  description: string;
  typeIcon?: string;
  isEstablishment?: boolean;
  types?: string[];
  latitude?: number;
  longitude?: number;
};

export type MapPlaceSearchStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error';

export function nextSearchRequestId(current: number): number {
  return current + 1;
}

export function isStaleSearchRequest(requestId: number, latestId: number): boolean {
  return requestId !== latestId;
}

export function shouldSearchMapPlaces(
  query: string,
  minChars = MAP_PLACE_SEARCH_MIN_CHARS,
): boolean {
  return String(query || '').trim().length >= minChars;
}

export function placesLanguage(lang: string): string {
  if (lang === 'zh') return 'zh-CN';
  if (lang === 'my') return 'my';
  return 'en';
}

export function resolveMapPlaceSearchStatus(
  status: string | undefined | null,
  predictionCount: number,
): Exclude<MapPlaceSearchStatus, 'idle' | 'loading'> {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'OK' && predictionCount > 0) return 'success';
  if (normalized === 'OK' || normalized === 'ZERO_RESULTS') return 'empty';
  return 'error';
}

type RawPlacePrediction = {
  place_id?: string;
  description?: string;
  types?: string[];
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
};

export function placeTypeIcon(types: string[] = []): { typeIcon: string; isEstablishment: boolean } {
  const isEstablishment = types.some((type) =>
    ['establishment', 'store', 'restaurant', 'cafe', 'shop', 'business'].includes(type),
  );
  let typeIcon = '📍';
  if (types.includes('restaurant') || types.includes('food')) typeIcon = '🍽️';
  else if (types.includes('cafe')) typeIcon = '☕';
  else if (types.includes('store') || types.includes('shopping_mall')) typeIcon = '🏪';
  else if (types.includes('hospital') || types.includes('pharmacy')) typeIcon = '🏥';
  else if (types.includes('school') || types.includes('university')) typeIcon = '🏫';
  else if (types.includes('bank') || types.includes('atm')) typeIcon = '🏦';
  else if (types.includes('gas_station')) typeIcon = '⛽';
  else if (isEstablishment) typeIcon = '🏢';
  return { typeIcon, isEstablishment };
}

export function mapPlacePredictions(
  predictions: RawPlacePrediction[] | null | undefined,
  limit = 10,
): MapPlaceSuggestion[] {
  return (predictions || [])
    .slice(0, limit)
    .map((prediction) => {
      const types = prediction.types || [];
      const { typeIcon, isEstablishment } = placeTypeIcon(types);
      return {
        placeId: String(prediction.place_id || ''),
        mainText:
          prediction.structured_formatting?.main_text ||
          prediction.description ||
          '',
        secondaryText: prediction.structured_formatting?.secondary_text || '',
        description: prediction.description || '',
        types,
        typeIcon,
        isEstablishment,
      };
    })
    .filter((item) => item.placeId && item.description)
    .sort((a, b) => {
      if (a.isEstablishment && !b.isEstablishment) return -1;
      if (!a.isEstablishment && b.isEstablishment) return 1;
      return 0;
    });
}

type NominatimHit = {
  place_id?: number;
  osm_type?: string;
  osm_id?: number;
  lat?: string;
  lon?: string;
  display_name?: string;
  name?: string;
  type?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
};

export function mapNominatimHits(hits: NominatimHit[] | null | undefined, limit = 8): MapPlaceSuggestion[] {
  return (hits || [])
    .map((hit) => {
      const latitude = Number(hit.lat);
      const longitude = Number(hit.lon);
      const description = String(hit.display_name || '').trim();
      const mainText = String(hit.name || description.split(',')[0] || '').trim();
      const secondaryText = [
        hit.address?.city || hit.address?.town || hit.address?.village,
        hit.address?.state,
        hit.address?.country,
      ]
        .filter(Boolean)
        .join(', ');
      if (!description || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
      }
      return {
        placeId: `osm:${hit.osm_type || 'node'}:${hit.osm_id || hit.place_id || description}`,
        mainText,
        secondaryText,
        description,
        types: hit.type ? [hit.type] : [],
        typeIcon: '📍',
        isEstablishment: false,
        latitude,
        longitude,
      } satisfies MapPlaceSuggestion;
    })
    .filter((item): item is MapPlaceSuggestion => Boolean(item))
    .slice(0, limit);
}

type PhotonFeature = {
  geometry?: { coordinates?: number[] };
  properties?: {
    osm_id?: number;
    osm_type?: string;
    name?: string;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    type?: string;
  };
};

export function mapPhotonFeatures(
  data: { features?: PhotonFeature[] } | null | undefined,
  limit = 8,
): MapPlaceSuggestion[] {
  return (data?.features || [])
    .map((feature) => {
      const longitude = Number(feature.geometry?.coordinates?.[0]);
      const latitude = Number(feature.geometry?.coordinates?.[1]);
      const props = feature.properties || {};
      const mainText = String(props.name || props.street || '').trim();
      const secondaryText = [props.city, props.state, props.country].filter(Boolean).join(', ');
      const description = [mainText, secondaryText].filter(Boolean).join(', ');
      if (!mainText || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
      }
      return {
        placeId: `osm:${props.osm_type || 'node'}:${props.osm_id || description}`,
        mainText,
        secondaryText,
        description,
        types: props.type ? [props.type] : [],
        typeIcon: '📍',
        isEstablishment: false,
        latitude,
        longitude,
      } satisfies MapPlaceSuggestion;
    })
    .filter((item): item is MapPlaceSuggestion => Boolean(item))
    .slice(0, limit);
}

async function fetchJsonQuiet<T>(
  url: string,
  timeoutMs: number,
  headers?: Record<string, string>,
): Promise<T | null> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const request = fetch(url, { headers }).then(async (response) => {
    if (!response.ok) return null;
    return (await response.json()) as T;
  }).catch(() => null);
  void request.catch(() => undefined);
  const timeout = new Promise<null>((resolve) => {
    timeoutId = setTimeout(() => resolve(null), timeoutMs);
  });
  try {
    return await Promise.race([request, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function searchNominatimPlaces(
  query: string,
  language: string,
  timeoutMs = MAP_PLACE_SEARCH_TIMEOUT_MS,
): Promise<MapPlaceSuggestion[]> {
  const lang = placesLanguage(language);
  const url =
    `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=8` +
    `&countrycodes=mm&q=${encodeURIComponent(query)}`;
  const data = await fetchJsonQuiet<NominatimHit[]>(url, timeoutMs, {
    Accept: 'application/json',
    'Accept-Language': lang === 'zh-CN' ? 'zh' : lang,
  });
  return mapNominatimHits(Array.isArray(data) ? data : []);
}

export async function searchPhotonPlaces(
  query: string,
  language: string,
  location?: { latitude: number; longitude: number },
  timeoutMs = MAP_PLACE_SEARCH_TIMEOUT_MS,
): Promise<MapPlaceSuggestion[]> {
  const lang = placesLanguage(language);
  const photonLang = lang === 'zh-CN' ? 'en' : lang === 'my' ? 'en' : lang;
  const locQuery =
    location && Number.isFinite(location.latitude) && Number.isFinite(location.longitude)
      ? `&lat=${location.latitude}&lon=${location.longitude}`
      : '';
  const url =
    `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=8` +
    `&lang=${encodeURIComponent(photonLang)}&bbox=92.1,9.5,101.2,28.5${locQuery}`;
  const data = await fetchJsonQuiet<{ features?: PhotonFeature[] }>(url, timeoutMs, {
    Accept: 'application/json',
  });
  return mapPhotonFeatures(data);
}

export async function searchOpenPlaces(
  query: string,
  language: string,
  location?: { latitude: number; longitude: number },
): Promise<MapPlaceSuggestion[]> {
  const [photonHits, nominatimHits] = await Promise.all([
    searchPhotonPlaces(query, language, location),
    searchNominatimPlaces(query, language),
  ]);
  return photonHits.length > 0 ? photonHits : nominatimHits;
}
