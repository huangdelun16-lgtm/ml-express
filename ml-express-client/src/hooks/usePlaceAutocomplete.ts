import { useCallback, useEffect, useRef, useState } from 'react';
import { useGoogleMapsApiKey } from './useGoogleMapsApiKey';

interface UsePlaceAutocompleteOptions {
  language: 'zh' | 'en' | 'my';
  selectedLocation: { latitude: number; longitude: number };
  onLocationChange: (coords: { latitude: number; longitude: number }) => void;
  onPlaceChange?: (place: { name?: string; address?: string } | null) => void;
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
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const autocompleteDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastSearchQueryRef = useRef('');
  const failureCountRef = useRef(0);
  const googleMapsApiKey = useGoogleMapsApiKey();

  const performAutocompleteSearch = useCallback(
    async (input: string) => {
      if (!input.trim() || input.length < 1) {
        setAutocompleteSuggestions([]);
        setShowSuggestions(false);
        setIsLoadingSuggestions(false);
        return;
      }

      if (lastSearchQueryRef.current === input.trim()) {
        return;
      }

      setIsLoadingSuggestions(true);
      lastSearchQueryRef.current = input.trim();

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        if (!googleMapsApiKey) {
          console.warn('Google Maps API Key 未配置，自动完成功能不可用。');
          setAutocompleteSuggestions([]);
          setShowSuggestions(false);
          setIsLoadingSuggestions(false);
          return;
        }

        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
            input.trim()
          )}&location=${selectedLocation.latitude},${selectedLocation.longitude}&radius=50000&components=country:mm&key=${googleMapsApiKey}&language=${
            language === 'zh' ? 'zh-CN' : language === 'en' ? 'en' : 'my'
          }`,
          { signal: controller.signal }
        );

        const data = await response.json();

        if (lastSearchQueryRef.current === input.trim()) {
          if (data.status === 'OK' && data.predictions && data.predictions.length > 0) {
            const suggestions = data.predictions.slice(0, 10).map((prediction: any) => ({
              place_id: prediction.place_id,
              main_text: prediction.structured_formatting.main_text,
              secondary_text: prediction.structured_formatting.secondary_text,
              description: prediction.description,
            }));
            setAutocompleteSuggestions(suggestions);
            setShowSuggestions(true);
            failureCountRef.current = 0;
          } else {
            setAutocompleteSuggestions([]);
            setShowSuggestions(false);
          }
        }
      } catch (error) {
        if ((error as any)?.name === 'AbortError') return;

        failureCountRef.current += 1;
        const backoffDelay = Math.min(4000, 500 * failureCountRef.current);
        console.error(`自动完成请求失败，第 ${failureCountRef.current} 次，${backoffDelay}ms 后重试`, error);
        setTimeout(() => {
          if (lastSearchQueryRef.current === input.trim()) {
            performAutocompleteSearch(input);
          }
        }, backoffDelay);
      } finally {
        if (lastSearchQueryRef.current === input.trim()) {
          setIsLoadingSuggestions(false);
        }
      }
    },
    [googleMapsApiKey, language, selectedLocation.latitude, selectedLocation.longitude]
  );

  const handleMapAddressInputChange = useCallback(
    (input: string) => {
      if (autocompleteDebounceTimerRef.current) {
        clearTimeout(autocompleteDebounceTimerRef.current);
      }

      if (!input.trim() || input.length < 1) {
        setAutocompleteSuggestions([]);
        setShowSuggestions(false);
        setIsLoadingSuggestions(false);
        lastSearchQueryRef.current = '';
        setMapAddressInput(input);
        return;
      }

      if (input.trim().length < 2) {
        setAutocompleteSuggestions([]);
        setShowSuggestions(false);
        setIsLoadingSuggestions(false);
        setMapAddressInput(input);
        return;
      }

      setMapAddressInput(input);

      autocompleteDebounceTimerRef.current = setTimeout(() => {
        performAutocompleteSearch(input);
      }, 300);
    },
    [performAutocompleteSearch]
  );

  const handleSelectSuggestion = useCallback(
    async (suggestion: any) => {
      setMapAddressInput(suggestion.description);
      setShowSuggestions(false);
      setIsLoadingSuggestions(true);

      try {
        if (!googleMapsApiKey) {
          console.warn('Google Maps API Key 未配置，地点详情查询不可用。');
          setIsLoadingSuggestions(false);
          return;
        }

        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${suggestion.place_id}&fields=geometry,formatted_address,name&key=${googleMapsApiKey}&language=${
            language === 'zh' ? 'zh-CN' : language === 'en' ? 'en' : 'my'
          }`
        );

        const data = await response.json();

        if (data.status === 'OK' && data.result) {
          const place = data.result;
          const location = place.geometry.location;

          onLocationChange({
            latitude: location.lat,
            longitude: location.lng,
          });

          if (onPlaceChange) {
            onPlaceChange({
              name: place.name,
              address: place.formatted_address || suggestion.description,
            });
          }

          setMapAddressInput(place.formatted_address || suggestion.description);
          lastSearchQueryRef.current = '';
        } else {
          console.warn('获取地点详情失败，使用描述信息');
        }
      } catch (error) {
        console.error('获取地点详情失败:', error);
      } finally {
        setIsLoadingSuggestions(false);
        setAutocompleteSuggestions([]);
      }
    },
    [googleMapsApiKey, language, onLocationChange, onPlaceChange]
  );

  useEffect(() => {
    return () => {
      if (autocompleteDebounceTimerRef.current) {
        clearTimeout(autocompleteDebounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    mapAddressInput,
    setMapAddressInput,
    autocompleteSuggestions,
    showSuggestions,
    setShowSuggestions,
    isLoadingSuggestions,
    handleMapAddressInputChange,
    handleSelectSuggestion,
  };
}

