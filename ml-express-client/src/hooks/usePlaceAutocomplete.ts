import { useCallback, useEffect, useRef, useState } from 'react';
import { useGoogleMapsApiKey } from './useGoogleMapsApiKey';
import { errorService } from '../services/ErrorService';

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
          console.warn('Google Maps API Key 未配置，自动完成功能不可用。使用模拟数据演示。');
          // 模拟数据 (仅用于演示)
          const mockSuggestions = [
            {
              place_id: 'mock_1',
              main_text: 'Mandalay Palace',
              secondary_text: 'Mandalay, Myanmar',
              description: 'Mandalay Palace, Mandalay, Myanmar',
              typeIcon: '🏰',
              isEstablishment: true,
            },
            {
              place_id: 'mock_2',
              main_text: 'Zegyo Market',
              secondary_text: '84th Street, Mandalay',
              description: 'Zegyo Market, 84th Street, Mandalay',
              typeIcon: '🏪',
              isEstablishment: true,
            },
            {
              place_id: 'mock_3',
              main_text: 'Mandalay Hill',
              secondary_text: 'Mandalay',
              description: 'Mandalay Hill, Mandalay',
              typeIcon: '⛰️',
              isEstablishment: false,
            },
            {
              place_id: 'mock_4',
              main_text: 'Diamond Plaza',
              secondary_text: 'Chan Aye Thar Zan, Mandalay',
              description: 'Diamond Plaza, Chan Aye Thar Zan, Mandalay',
              typeIcon: '🏬',
              isEstablishment: true,
            },
            {
              place_id: 'mock_5',
              main_text: 'Man Myanmar Plaza',
              secondary_text: '84th Street, Mandalay',
              description: 'Man Myanmar Plaza, 84th Street, Mandalay',
              typeIcon: '🏢',
              isEstablishment: true,
            }
          ].filter(item => item.main_text.toLowerCase().includes(input.toLowerCase()) || item.description.toLowerCase().includes(input.toLowerCase()));
          
          setAutocompleteSuggestions(mockSuggestions);
          setShowSuggestions(true);
          setIsLoadingSuggestions(false);
          return;
        }

        // 优化搜索：优先搜索店铺和商业地点
        // 使用 types 参数限制为商业地点，提高店铺搜索准确性
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
            input.trim()
          )}&location=${selectedLocation.latitude},${selectedLocation.longitude}&radius=50000&components=country:mm&types=establishment|geocode&key=${googleMapsApiKey}&language=${
            language === 'zh' ? 'zh-CN' : language === 'en' ? 'en' : 'my'
          }`,
          { signal: controller.signal }
        );

        const data = await response.json();

        if (lastSearchQueryRef.current === input.trim()) {
          if (data.status === 'OK' && data.predictions && data.predictions.length > 0) {
            // 优化建议列表：优先显示店铺/商业地点，并提取类型信息
            const suggestions = data.predictions
              .slice(0, 10)
              .map((prediction: any) => {
                // 提取地点类型（如果有）
                const types = prediction.types || [];
                const isEstablishment = types.some((type: string) => 
                  ['establishment', 'store', 'restaurant', 'cafe', 'shop', 'business'].includes(type)
                );
                
                // 提取主要类型图标
                let typeIcon = '📍';
                if (types.includes('restaurant') || types.includes('food')) {
                  typeIcon = '🍽️';
                } else if (types.includes('cafe')) {
                  typeIcon = '☕';
                } else if (types.includes('store') || types.includes('shopping_mall')) {
                  typeIcon = '🏪';
                } else if (types.includes('hospital') || types.includes('pharmacy')) {
                  typeIcon = '🏥';
                } else if (types.includes('school') || types.includes('university')) {
                  typeIcon = '🏫';
                } else if (types.includes('bank') || types.includes('atm')) {
                  typeIcon = '🏦';
                } else if (types.includes('gas_station')) {
                  typeIcon = '⛽';
                } else if (isEstablishment) {
                  typeIcon = '🏢';
                }
                
                return {
                  place_id: prediction.place_id,
                  main_text: prediction.structured_formatting.main_text,
                  secondary_text: prediction.structured_formatting.secondary_text,
                  description: prediction.description,
                  types: types,
                  typeIcon: typeIcon,
                  isEstablishment: isEstablishment,
                };
              })
              // 优先显示商业地点
              .sort((a, b) => {
                if (a.isEstablishment && !b.isEstablishment) return -1;
                if (!a.isEstablishment && b.isEstablishment) return 1;
                return 0;
              });
            
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
        errorService.handleError(error, { 
          context: 'usePlaceAutocomplete.performAutocompleteSearch', 
          silent: true 
        });
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

      // 优化：至少输入1个字符就开始搜索（更快响应）
      if (!input.trim() || input.length < 1) {
        setAutocompleteSuggestions([]);
        setShowSuggestions(false);
        setIsLoadingSuggestions(false);
        lastSearchQueryRef.current = '';
        setMapAddressInput(input);
        return;
      }

      setMapAddressInput(input);

      // 优化：减少延迟时间，更快响应（200ms）
      autocompleteDebounceTimerRef.current = setTimeout(() => {
        performAutocompleteSearch(input);
      }, 200);
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
          console.warn('Google Maps API Key 未配置，地点详情查询不可用。使用模拟坐标。');
          // 模拟坐标 (曼德勒附近，仅用于演示)
          // 根据 mock ID 返回固定坐标，以便演示更真实
          let mockLocation = { lat: 21.9588, lng: 96.0891 }; // Default Mandalay
          
          if (suggestion.place_id === 'mock_1') mockLocation = { lat: 21.9930, lng: 96.0967 }; // Palace
          else if (suggestion.place_id === 'mock_2') mockLocation = { lat: 21.9750, lng: 96.0830 }; // Zegyo
          else if (suggestion.place_id === 'mock_3') mockLocation = { lat: 22.0167, lng: 96.1080 }; // Hill
          else if (suggestion.place_id === 'mock_4') mockLocation = { lat: 21.9730, lng: 96.0920 }; // Diamond
          else if (suggestion.place_id === 'mock_5') mockLocation = { lat: 21.9740, lng: 96.0820 }; // Man Myanmar
          else {
             // 随机附近坐标
             mockLocation = {
              lat: 21.9588 + (Math.random() - 0.5) * 0.05,
              lng: 96.0891 + (Math.random() - 0.5) * 0.05,
            };
          }
          
          onLocationChange({
            latitude: mockLocation.lat,
            longitude: mockLocation.lng,
          });
          
          if (onPlaceChange) {
            onPlaceChange({
              name: suggestion.main_text,
              address: suggestion.description,
              types: ['mock_type'],
              rating: 4.5,
            });
          }
          
          setMapAddressInput(suggestion.description);
          lastSearchQueryRef.current = '';
          setIsLoadingSuggestions(false);
          return;
        }

        // 优化：获取更多店铺信息（类型、地址、名称、坐标等）
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${suggestion.place_id}&fields=geometry,formatted_address,name,types,rating,vicinity&key=${googleMapsApiKey}&language=${
            language === 'zh' ? 'zh-CN' : language === 'en' ? 'en' : 'my'
          }`
        );

        const data = await response.json();

        if (data.status === 'OK' && data.result) {
          const place = data.result;
          const location = place.geometry.location;

          // 更新地图位置
          onLocationChange({
            latitude: location.lat,
            longitude: location.lng,
          });

          // 更新选择的地点信息（包含店铺名称和完整地址）
          if (onPlaceChange) {
            onPlaceChange({
              name: place.name || suggestion.main_text,
              address: place.formatted_address || place.vicinity || suggestion.description,
              types: place.types || [],
              rating: place.rating,
            });
          }

          // 设置输入框为完整地址
          setMapAddressInput(place.formatted_address || place.vicinity || suggestion.description);
          lastSearchQueryRef.current = '';
        } else {
          errorService.handleError(new Error('获取地点详情失败'), { 
            context: 'usePlaceAutocomplete.handleSelectSuggestion', 
            silent: true 
          });
          // 即使详情获取失败，也更新位置
          if (onPlaceChange) {
            onPlaceChange({
              name: suggestion.main_text,
              address: suggestion.description,
            });
          }
        }
      } catch (error) {
        errorService.handleError(error, { 
          context: 'usePlaceAutocomplete.handleSelectSuggestion', 
          silent: true 
        });
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

