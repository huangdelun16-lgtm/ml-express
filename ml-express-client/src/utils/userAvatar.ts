import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { remoteImageUri } from '../services/clientApi/nativeSupabaseUrl';

export const USER_AVATAR_UPDATED = 'user_avatar_updated';

export function avatarStorageKey(userId: string) {
  return `userAvatarUrl_${userId}`;
}

export function avatarDisplayUri(url?: string | null): string | undefined {
  const value = String(url || '').trim();
  if (!value) return undefined;
  if (value.startsWith('file://') || value.startsWith('content://')) return value;
  return remoteImageUri(value);
}

export async function loadUserAvatarUrl(userId?: string | null): Promise<string> {
  try {
    let uid = userId || '';
    const currentUserStr = await AsyncStorage.getItem('currentUser');
    const user = currentUserStr ? JSON.parse(currentUserStr) : null;
    if (!uid) uid = user?.id || '';
    if (!uid || uid === 'guest') return '';

    const cached = await AsyncStorage.getItem(avatarStorageKey(uid));
    return cached || user?.avatar_url || '';
  } catch {
    return '';
  }
}

export async function persistUserAvatarUrl(userId: string, url: string | null): Promise<void> {
  const next = url || '';
  if (next) {
    await AsyncStorage.setItem(avatarStorageKey(userId), next);
  } else {
    await AsyncStorage.removeItem(avatarStorageKey(userId));
  }
  const currentUserStr = await AsyncStorage.getItem('currentUser');
  if (currentUserStr) {
    const localUser = JSON.parse(currentUserStr);
    await AsyncStorage.setItem(
      'currentUser',
      JSON.stringify({ ...localUser, avatar_url: next }),
    );
  }
  DeviceEventEmitter.emit(USER_AVATAR_UPDATED, { userId, url: next });
}

/** 从服务器 / 云存储拉取头像并写入本机。远程没有时保留本机缓存，避免换机前的照片被清空。 */
export async function hydrateUserAvatarFromServer(userId?: string | null): Promise<string> {
  try {
    let uid = userId || '';
    if (!uid) {
      const currentUserStr = await AsyncStorage.getItem('currentUser');
      const user = currentUserStr ? JSON.parse(currentUserStr) : null;
      uid = user?.id || '';
    }
    if (!uid || uid === 'guest') return '';
    const { customerService } = await import('../services/clientApi/customerService');
    const remote = await customerService.fetchAvatarUrl(uid);
    if (remote) {
      await persistUserAvatarUrl(uid, remote);
      return remote;
    }
    return loadUserAvatarUrl(uid);
  } catch {
    return loadUserAvatarUrl(userId);
  }
}
