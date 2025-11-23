import { useMemo } from 'react';
import Constants from 'expo-constants';

export function useGoogleMapsApiKey() {
  return useMemo(() => {
    return (
      process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
      (Constants?.expoConfig?.extra as any)?.googleMapsApiKey ||
      ''
    );
  }, []);
}

