import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MAP_PLACE_SEARCH_DEBOUNCE_MS,
  MAP_PLACE_SEARCH_TIMEOUT_MS,
  type MapPlaceSearchStatus,
  type MapPlaceSuggestion,
  isStaleSearchRequest,
  mapPlacePredictions,
  nextSearchRequestId,
  placesLanguage,
  resolveMapPlaceSearchStatus,
  shouldSearchMapPlaces,
} from '../utils/mapPlaceSearch';

type PlacePredictionsService = {
  getPlacePredictions: (
    request: {
      input: string;
      location?: unknown;
      radius?: number;
      componentRestrictions?: { country: string };
      language?: string;
    },
    callback: (predictions: unknown, status: string) => void,
  ) => void;
};

type UseMapPlaceSearchOptions = {
  getAutocompleteService: () => PlacePredictionsService | null | undefined;
  getLocationBias: () => { lat: number; lng: number };
  language: string;
  debounceMs?: number;
  timeoutMs?: number;
};

export function useMapPlaceSearch({
  getAutocompleteService,
  getLocationBias,
  language,
  debounceMs = MAP_PLACE_SEARCH_DEBOUNCE_MS,
  timeoutMs = MAP_PLACE_SEARCH_TIMEOUT_MS,
}: UseMapPlaceSearchOptions) {
  const [suggestions, setSuggestions] = useState<MapPlaceSuggestion[]>([]);
  const [status, setStatus] = useState<MapPlaceSearchStatus>('idle');
  const [open, setOpen] = useState(false);

  const requestIdRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const optionsRef = useRef({ getAutocompleteService, getLocationBias, language });
  optionsRef.current = { getAutocompleteService, getLocationBias, language };
  const timeoutMsRef = useRef(timeoutMs);
  timeoutMsRef.current = timeoutMs;

  const invalidateInFlight = useCallback(() => {
    requestIdRef.current = nextSearchRequestId(requestIdRef.current);
  }, []);

  const reset = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    invalidateInFlight();
    setSuggestions([]);
    setStatus('idle');
    setOpen(false);
  }, [invalidateInFlight]);

  const searchNow = useCallback((raw: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const query = String(raw || '').trim();
    const requestId = nextSearchRequestId(requestIdRef.current);
    requestIdRef.current = requestId;

    if (!shouldSearchMapPlaces(query)) {
      setSuggestions([]);
      setStatus('idle');
      setOpen(false);
      return;
    }

    const { getAutocompleteService: getService, getLocationBias: getBias, language: lang } =
      optionsRef.current;
    const service = getService();
    const googleMaps = typeof window !== 'undefined' ? window.google?.maps : undefined;

    if (!service || !googleMaps?.places || typeof googleMaps.LatLng !== 'function') {
      setSuggestions([]);
      setStatus('error');
      setOpen(true);
      return;
    }

    setStatus('loading');
    setOpen(true);

    timeoutRef.current = setTimeout(() => {
      if (isStaleSearchRequest(requestId, requestIdRef.current)) return;
      setSuggestions([]);
      setStatus('error');
      setOpen(true);
    }, timeoutMsRef.current);

    const bias = getBias();
    service.getPlacePredictions(
      {
        input: query,
        location: new googleMaps.LatLng(bias.lat, bias.lng),
        radius: 50000,
        componentRestrictions: { country: 'mm' },
        language: placesLanguage(lang),
      },
      (predictions, placesStatus) => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        if (isStaleSearchRequest(requestId, requestIdRef.current)) {
          return;
        }

        const list = Array.isArray(predictions) ? predictions : [];
        const nextStatus = resolveMapPlaceSearchStatus(String(placesStatus || ''), list.length);
        setSuggestions(nextStatus === 'success' ? mapPlacePredictions(list) : []);
        setStatus(nextStatus);
        setOpen(true);
      },
    );
  }, []);

  const scheduleSearch = useCallback(
    (raw: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }

      invalidateInFlight();

      if (!shouldSearchMapPlaces(raw)) {
        setSuggestions([]);
        setStatus('idle');
        setOpen(false);
        return;
      }

      debounceRef.current = setTimeout(() => {
        searchNow(raw);
      }, debounceMs);
    },
    [debounceMs, invalidateInFlight, searchNow],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      requestIdRef.current = nextSearchRequestId(requestIdRef.current);
    };
  }, []);

  return {
    suggestions,
    status,
    open,
    setOpen,
    scheduleSearch,
    searchNow,
    reset,
  };
}
