import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import LoggerService from '../LoggerService';
import { toLatLng, formatCoordFallback, formatGeocodedPlace, type LatLng } from '../../utils/geoDistance';

export type AccountGpsFix = {
  userId: string;
  latitude: number;
  longitude: number;
  accuracyM: number | null;
  placeLabel: string;
  updatedAt: string;
};

export type GpsCaptureFailure = 'denied' | 'unavailable';

export type GpsCaptureResult =
  | { ok: true; coords: LatLng; accuracyM: number | null }
  | { ok: false; reason: GpsCaptureFailure };

const storageKey = (userId: string) => `ml-express-account-gps:${userId}`;

export function accountGpsStorageId(userId: string | null, isGuest: boolean): string | null {
  if (userId && !isGuest) return userId;
  if (isGuest) return 'guest';
  return null;
}

export async function loadSavedAccountGps(userId: string): Promise<AccountGpsFix | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AccountGpsFix;
    const coords = toLatLng(parsed);
    if (!coords) return null;
    return { ...parsed, ...coords };
  } catch (error) {
    LoggerService.warn('读取账号 GPS 缓存失败:', error);
    return null;
  }
}

export async function saveAccountGps(fix: AccountGpsFix): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(fix.userId), JSON.stringify(fix));
  } catch (error) {
    LoggerService.warn('保存账号 GPS 失败:', error);
  }
}

export async function capturePhoneGps(): Promise<GpsCaptureResult> {
  try {
    const current = await Location.getForegroundPermissionsAsync();
    let granted = current.status === 'granted';
    if (!granted) {
      const asked = await Location.requestForegroundPermissionsAsync();
      granted = asked.status === 'granted';
    }
    if (!granted) return { ok: false, reason: 'denied' };

    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    const coords = toLatLng({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    });
    if (!coords) return { ok: false, reason: 'unavailable' };
    const accuracy = Number(pos.coords.accuracy);
    return {
      ok: true,
      coords,
      accuracyM: Number.isFinite(accuracy) ? accuracy : null,
    };
  } catch (error) {
    LoggerService.error('捕获手机 GPS 失败:', error);
    return { ok: false, reason: 'unavailable' };
  }
}

export async function resolvePlaceLabel(coords: LatLng): Promise<string> {
  try {
    const places = await Location.reverseGeocodeAsync({
      latitude: coords.latitude,
      longitude: coords.longitude,
    });
    return formatGeocodedPlace(places?.[0]) || formatCoordFallback(coords);
  } catch (error) {
    LoggerService.warn('GPS 逆地理失败:', error);
    return formatCoordFallback(coords);
  }
}
