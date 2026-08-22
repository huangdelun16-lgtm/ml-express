import Constants from 'expo-constants';
import { Linking } from 'react-native';
import { isSupabaseConfigured, supabase } from './supabase';
import { rewritePublicStorageUrl } from './nativeSupabaseUrl';
import {
  isAndroidUpdateAvailable,
  parseAndroidRelease,
  type AndroidReleaseInfo,
} from '../utils/appUpdate';

/** Supabase system_settings 中 Android 最新发布信息 */
export const ANDROID_RELEASE_SETTINGS_KEY = 'inventory.android.latest_release';

export type { AndroidReleaseInfo };

export function getInstalledAppVersion(): string {
  return Constants.expoConfig?.version?.trim() || '0.0.0';
}

export function getInstalledAndroidVersionCode(): number {
  const fromNative = Number(Constants.nativeBuildVersion);
  if (Number.isFinite(fromNative) && fromNative > 0) return Math.floor(fromNative);
  const fromConfig = Number(Constants.expoConfig?.android?.versionCode);
  if (Number.isFinite(fromConfig) && fromConfig > 0) return Math.floor(fromConfig);
  return 0;
}

export async function fetchLatestAndroidRelease(): Promise<AndroidReleaseInfo | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from('system_settings')
    .select('settings_value')
    .eq('settings_key', ANDROID_RELEASE_SETTINGS_KEY)
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
  const apkUrl = rewritePublicStorageUrl(url.trim());
  if (!apkUrl) throw new Error('APK download URL is missing');
  const canOpen = await Linking.canOpenURL(apkUrl);
  if (!canOpen) throw new Error('Cannot open APK download link');
  await Linking.openURL(apkUrl);
}
