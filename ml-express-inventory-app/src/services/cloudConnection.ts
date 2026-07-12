import { ensureInventoryCloudAuth } from './authService';
import { isSupabaseConfigured } from './supabase';
import { isCloudReachable, isLikelyNetworkError, withTimeout } from '../utils/networkReachability';

export type CloudConnectionStatus = {
  configured: boolean;
  authenticated: boolean;
  errorCode?: string;
};

export async function probeCloudConnection(): Promise<CloudConnectionStatus> {
  if (!isSupabaseConfigured()) {
    return { configured: false, authenticated: false, errorCode: 'supabaseNotConfigured' };
  }
  if (!(await isCloudReachable())) {
    return { configured: true, authenticated: false, errorCode: 'syncNetworkFailed' };
  }
  try {
    await withTimeout(ensureInventoryCloudAuth(), 8000);
    return { configured: true, authenticated: true };
  } catch (e: unknown) {
    const code =
      e && typeof e === 'object' && 'code' in e
        ? String((e as { code: unknown }).code)
        : e instanceof Error
          ? isLikelyNetworkError(e)
            ? 'syncNetworkFailed'
            : e.message
          : 'authSessionExpired';
    return { configured: true, authenticated: false, errorCode: code };
  }
}
