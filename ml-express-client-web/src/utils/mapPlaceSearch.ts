export const MAP_PLACE_SEARCH_DEBOUNCE_MS = 300;
export const MAP_PLACE_SEARCH_TIMEOUT_MS = 8000;
export const MAP_PLACE_SEARCH_MIN_CHARS = 2;

export type MapPlaceSuggestion = {
  placeId: string;
  mainText: string;
  secondaryText: string;
  description: string;
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
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
};

export function mapPlacePredictions(
  predictions: RawPlacePrediction[] | null | undefined,
  limit = 10,
): MapPlaceSuggestion[] {
  return (predictions || [])
    .slice(0, limit)
    .map((prediction) => ({
      placeId: String(prediction.place_id || ''),
      mainText:
        prediction.structured_formatting?.main_text ||
        prediction.description ||
        '',
      secondaryText: prediction.structured_formatting?.secondary_text || '',
      description: prediction.description || '',
    }))
    .filter((item) => item.placeId && item.description);
}
