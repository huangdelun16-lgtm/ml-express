import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LoggerService from '../services/LoggerService';
import { useGoogleMapsApiKey } from './useGoogleMapsApiKey';
import { errorService } from '../services/ErrorService';
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

interface UsePlaceAutocompleteOptions {
  language: 'zh' | 'en' | 'my';
  selectedLocation: { latitude: number; longitude: number };
  onLocationChange: (coords: { latitude: number; longitude: number }) => void;
  onPlaceChange?: (place: {
    name?: string;
    address?: string;
    types?: string[];
    rating?: number;
  } | null) => void;
}

const MOCK_SUGGESTIONS: MapPlaceSuggestion[] = [
  {
    placeId: 'mock_1',
    mainText: 'Mandalay Palace',
    secondaryText: 'Mandalay, Myanmar',
    description: 'Mandalay Palace, Mandalay, Myanmar',
    typeIcon: '🏰',
    isEstablishment: true,
  },
  {
    placeId: 'mock_2',
    mainText: 'Zegyo Market',
    secondaryText: '84th Street, Mandalay',
    description: 'Zegyo Market, 84th Street, Mandalay',
    typeIcon: '🏪',
    isEstablishment: false,
  },
  {
    placeId: 'mock_3',
    mainText: 'Mandalay Hill',
    secondaryText: 'Mandalay',
    description: 'Mandalay Hill, Mandalay',
    typeIcon: '⛰️',
    isEstablishment: false,
  },
  {
    placeId: 'mock_4',
    mainText: 'Diamond Plaza',
    secondaryText: 'Chan Aye Thar Zan, Mandalay',
    description: 'Diamond Plaza, Chan Aye Thar Zan, Mandalay',
    typeIcon: '🏬',
    isEstablishment: false,
  },
  {
    placeId: 'mock_5',
    mainText: 'Man Myanmar Plaza',
    secondaryText: '84th Street, Mandalay',
    description: 'Man Myanmar Plaza, 84th Street, Mandalay',
    typeIcon: '🏢',
    isEstablishment: false,
  },
];

function toLegacySuggestion(item: MapPlaceSuggestion) {
  return {
    place_id: item.placeId,
    main_text: item.mainText,
    secondary_text: item.secondaryText,
    description: item.description,
    typeIcon: item.typeIcon,
    isEstablishment: item.isEstablishment,
    types: item.types,
  };
}

function uniqueApiKeys(...keys: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const key of keys) {
    const trimmed = String(key || '').trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

function fetchJsonWithTimeout(url: string, timeoutMs: number): Promise<any> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const request = fetch(url).then((response) => response.json());
  // Expo Go / iOS 上 AbortController.abort(reason) 会触发 InvalidArgsNumberException
  // 超时只做 Promise.race，旧请求靠 requestId 丢弃
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(Object.assign(new Error('timeout'), { name: 'TimeoutError' }));
    }, timeoutMs);
  });
  void request.catch(() => undefined);
  return Promise.race([request, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

export function usePlaceAutocomplete({
  language,
  selectedLocation,
  onLocationChange,
  onPlaceChange,
}: UsePlaceAutocompleteOptions) {
  const [mapAddressInput, setMapAddressInput] = useState('');
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchStatus, setSearchStatus] = useState<MapPlaceSearchStatus>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const inputRef = useRef('');
  const locationRef = useRef(selectedLocation);
  const languageRef = useRef(language);
  locationRef.current = selectedLocation;
  languageRef.current = language;
  inputRef.current = mapAddressInput;

  const placesApiKey = useGoogleMapsApiKey('places');
  const mapsApiKey = useGoogleMapsApiKey('maps');
  const apiKeys = useMemo(
    () => uniqueApiKeys(placesApiKey, mapsApiKey),
    [placesApiKey, mapsApiKey],
  );

  const invalidateInFlight = useCallback(() => {
    requestIdRef.current = nextSearchRequestId(requestIdRef.current);
  }, []);

  const applyStatus = useCallback(
    (
      requestId: number,
      nextStatus: MapPlaceSearchStatus,
      suggestions: MapPlaceSuggestion[] = [],
    ) => {
      if (isStaleSearchRequest(requestId, requestIdRef.current)) return;
      setAutocompleteSuggestions(suggestions.map(toLegacySuggestion));
      setSearchStatus(nextStatus);
      setShowSuggestions(nextStatus !== 'idle');
    },
    [],
  );

  const searchNow = useCallback(
    async (raw: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }

      const query = String(raw || '').trim();
      const requestId = nextSearchRequestId(requestIdRef.current);
      requestIdRef.current = requestId;

      if (!shouldSearchMapPlaces(query)) {
        applyStatus(requestId, 'idle');
        return;
      }

      applyStatus(requestId, 'loading');

      try {
        if (apiKeys.length === 0) {
          const q = query.toLowerCase();
          const mock = MOCK_SUGGESTIONS.filter(
            (item) =>
              item.mainText.toLowerCase().includes(q) ||
              item.description.toLowerCase().includes(q),
          );
          applyStatus(requestId, mock.length ? 'success' : 'empty', mock);
          return;
        }

        const loc = locationRef.current;
        const lang = placesLanguage(languageRef.current);
        let lastStatus = '';
        let lastErrorMessage = '';

        for (const key of apiKeys) {
          if (isStaleSearchRequest(requestId, requestIdRef.current)) return;
          const data = await fetchJsonWithTimeout(
            `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
              query,
            )}&location=${loc.latitude},${loc.longitude}&radius=50000&components=country:mm&key=${key}&language=${lang}`,
            MAP_PLACE_SEARCH_TIMEOUT_MS,
          );
          if (isStaleSearchRequest(requestId, requestIdRef.current)) return;

          const predictions = Array.isArray(data?.predictions) ? data.predictions : [];
          const nextStatus = resolveMapPlaceSearchStatus(String(data?.status || ''), predictions.length);
          lastStatus = String(data?.status || '');
          lastErrorMessage = String(data?.error_message || '');
          if (nextStatus !== 'error') {
            applyStatus(
              requestId,
              nextStatus,
              nextStatus === 'success' ? mapPlacePredictions(predictions) : [],
            );
            return;
          }
        }

        if (lastStatus && lastStatus !== 'OK' && lastStatus !== 'ZERO_RESULTS') {
          LoggerService.error('Google Places API 错误:', lastStatus, lastErrorMessage);
        }
        applyStatus(requestId, 'error');
      } catch (error) {
        if (isStaleSearchRequest(requestId, requestIdRef.current)) return;
        if ((error as { name?: string })?.name === 'TimeoutError') {
          applyStatus(requestId, 'error');
          return;
        }
        errorService.handleError(error, {
          context: 'usePlaceAutocomplete.performAutocompleteSearch',
          silent: true,
        });
        applyStatus(requestId, 'error');
      }
    },
    [apiKeys, applyStatus],
  );

  const handleMapAddressInputChange = useCallback(
    (input: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      invalidateInFlight();
      setMapAddressInput(input);
      inputRef.current = input;

      if (!shouldSearchMapPlaces(input)) {
        setAutocompleteSuggestions([]);
        setSearchStatus('idle');
        setShowSuggestions(false);
        return;
      }

      debounceRef.current = setTimeout(() => {
        searchNow(input);
      }, MAP_PLACE_SEARCH_DEBOUNCE_MS);
    },
    [invalidateInFlight, searchNow],
  );

  const retrySearch = useCallback(() => {
    searchNow(inputRef.current);
  }, [searchNow]);

  const handleSelectSuggestion = useCallback(
    async (suggestion: any) => {
      const description = suggestion.description || suggestion.main_text || '';
      const placeId = suggestion.place_id || suggestion.placeId || '';
      setMapAddressInput(description);
      setShowSuggestions(false);
      setSearchStatus('idle');
      invalidateInFlight();

      try {
        if (apiKeys.length === 0) {
          LoggerService.warn('Google Maps API Key 未配置，地点详情查询不可用。使用模拟坐标。');
          let mockLocation = { lat: 21.9588, lng: 96.0891 };
          if (placeId === 'mock_1') mockLocation = { lat: 21.993, lng: 96.0967 };
          else if (placeId === 'mock_2') mockLocation = { lat: 21.975, lng: 96.083 };
          else if (placeId === 'mock_3') mockLocation = { lat: 22.0167, lng: 96.108 };
          else if (placeId === 'mock_4') mockLocation = { lat: 21.973, lng: 96.092 };
          else if (placeId === 'mock_5') mockLocation = { lat: 21.974, lng: 96.082 };
          else {
            mockLocation = {
              lat: 21.9588 + (Math.random() - 0.5) * 0.05,
              lng: 96.0891 + (Math.random() - 0.5) * 0.05,
            };
          }
          onLocationChange({
            latitude: mockLocation.lat,
            longitude: mockLocation.lng,
          });
          onPlaceChange?.({
            name: suggestion.main_text,
            address: description,
            types: ['mock_type'],
            rating: 4.5,
          });
          return;
        }

        let detailsData: any = null;
        for (const key of apiKeys) {
          detailsData = await fetchJsonWithTimeout(
            `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address,name,types,rating,vicinity&key=${key}&language=${placesLanguage(
              language,
            )}`,
            MAP_PLACE_SEARCH_TIMEOUT_MS,
          );
          if (detailsData?.status === 'OK' && detailsData.result) break;
        }

        if (detailsData?.status === 'OK' && detailsData.result) {
          const place = detailsData.result;
          const location = place.geometry.location;
          onLocationChange({
            latitude: location.lat,
            longitude: location.lng,
          });
          onPlaceChange?.({
            name: place.name || suggestion.main_text,
            address: place.formatted_address || place.vicinity || description,
            types: place.types || [],
            rating: place.rating,
          });
          setMapAddressInput(place.formatted_address || place.vicinity || description);
        } else {
          errorService.handleError(new Error('获取地点详情失败'), {
            context: 'usePlaceAutocomplete.handleSelectSuggestion',
            silent: true,
          });
        }
      } catch (error) {
        errorService.handleError(error, {
          context: 'usePlaceAutocomplete.handleSelectSuggestion',
          silent: true,
        });
      }
    },
    [apiKeys, invalidateInFlight, language, onLocationChange, onPlaceChange],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    mapAddressInput,
    setMapAddressInput,
    autocompleteSuggestions,
    showSuggestions,
    setShowSuggestions,
    isLoadingSuggestions: searchStatus === 'loading',
    searchStatus,
    handleMapAddressInputChange,
    handleSelectSuggestion,
    retrySearch,
  };
}
