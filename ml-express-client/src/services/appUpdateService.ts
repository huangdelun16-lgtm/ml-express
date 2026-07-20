import Constants from 'expo-constants';
import { Linking } from 'react-native';
import * as Updates from 'expo-updates';
import { supabase } from './supabase';
import {
  isAndroidUpdateAvailable,
  parseAndroidRelease,
  type AndroidReleaseInfo,
} from '../utils/appUpdate';

/** Supabase system_settings 中客户端 Android 最新发布信息 */
export const CLIENT_ANDROID_RELEASE_SETTINGS_KEY = 'client.android.latest_release';

export type { AndroidReleaseInfo };

function normalizeBuildVersion(value: unknown): string {
  if (value == null || value === '') return '';
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return String(Math.floor(value));
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || '';
  }
  return String(value).trim();
}

export function getInstalledAppVersion(): string {
  const version = Constants.expoConfig?.version;
  if (typeof version === 'string') return version.trim() || '0.0.0';
  return '0.0.0';
}

export function getInstalledBuildVersion(): string {
  const fromNative = normalizeBuildVersion(Constants.nativeBuildVersion);
  if (fromNative) return fromNative;
  if (Constants.platform?.ios) {
    return String(Constants.expoConfig?.ios?.buildNumber ?? '—');
  }
  const code = Number(Constants.expoConfig?.android?.versionCode ?? 0);
  return code > 0 ? String(Math.floor(code)) : '—';
}

export function getInstalledAndroidVersionCode(): number {
  const fromNative = Number(Constants.nativeBuildVersion);
  if (Number.isFinite(fromNative) && fromNative > 0) return Math.floor(fromNative);
  const fromConfig = Number(Constants.expoConfig?.android?.versionCode);
  if (Number.isFinite(fromConfig) && fromConfig > 0) return Math.floor(fromConfig);
  return 0;
}

export function getIosAppStoreUrl(): string {
  return Constants.expoConfig?.ios?.appStoreUrl?.trim() || '';
}

export async function fetchLatestAndroidRelease(): Promise<AndroidReleaseInfo | null> {
  const { data, error } = await supabase
    .from('system_settings')
    .select('settings_value')
    .eq('settings_key', CLIENT_ANDROID_RELEASE_SETTINGS_KEY)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return parseAndroidRelease((data as { settings_value: unknown }).settings_value);
}

export async function checkAndroidAppUpdate(): Promise<{
  hasUpdate: boolean;
  currentVersion: string;
  currentVersionCode: number;
  latest: AndroidReleaseInfo | null;
}> {
  const currentVersion = getInstalledAppVersion();
  const currentVersionCode = getInstalledAndroidVersionCode();
  const latest = await fetchLatestAndroidRelease();
  const hasUpdate = Boolean(
    latest && isAndroidUpdateAvailable(currentVersionCode, latest.versionCode),
  );
  return { hasUpdate, currentVersion, currentVersionCode, latest };
}

export async function openAndroidApkDownload(url: string): Promise<void> {
  const apkUrl = url.trim();
  if (!apkUrl) throw new Error('APK download URL is missing');
  const canOpen = await Linking.canOpenURL(apkUrl);
  if (!canOpen) throw new Error('Cannot open APK download link');
  await Linking.openURL(apkUrl);
}

export async function checkExpoOtaUpdateAvailable(): Promise<boolean> {
  if (__DEV__ || !Updates.isEnabled) return false;
  const update = await Updates.checkForUpdateAsync();
  return update.isAvailable;
}

export async function downloadAndApplyExpoOtaUpdate(): Promise<void> {
  if (__DEV__ || !Updates.isEnabled) return;
  await Updates.fetchUpdateAsync();
  await Updates.reloadAsync();
}

export async function openIosAppStore(): Promise<void> {
  const url = getIosAppStoreUrl();
  if (!url) throw new Error('App Store URL is not configured');
  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) throw new Error('Cannot open App Store link');
  await Linking.openURL(url);
}
