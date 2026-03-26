import { useMemo } from 'react';
import Constants from 'expo-constants';

/**
 * 获取 Google Maps API Key
 * @param type 'maps' (原生地图专用，绑定 Bundle ID) 或 'places' (Web Service 专用，无应用限制)
 */
export function useGoogleMapsApiKey(type: 'maps' | 'places' = 'maps') {
  return useMemo(() => {
    const extra = Constants?.expoConfig?.extra as any;
    
    if (type === 'places') {
      return (
        process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ||
        extra?.googlePlacesApiKey ||
        extra?.googleMapsApiKey || // 如果没有专用的，尝试用通用的
        ''
      );
    }

    return (
      process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
      extra?.googleMapsApiKey ||
      ''
    );
  }, [type]);
}
