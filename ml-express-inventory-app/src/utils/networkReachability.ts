import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from '../services/supabase';

export { isLikelyNetworkError, withTimeout } from './networkError';

const DEFAULT_PROBE_TIMEOUT_MS = 3500;
const PROBE_CACHE_MS = 8000;

let lastProbe: { at: number; ok: boolean } | null = null;

export function invalidateCloudReachabilityCache(): void {
  lastProbe = null;
}

/** 快速探测 Supabase 是否可达（带短时缓存，避免弱网反复超时） */
export async function isCloudReachable(options?: {
  timeoutMs?: number;
  force?: boolean;
}): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const timeoutMs = options?.timeoutMs ?? DEFAULT_PROBE_TIMEOUT_MS;
  const now = Date.now();
  if (!options?.force && lastProbe && now - lastProbe.at < PROBE_CACHE_MS) {
    return lastProbe.ok;
  }

  try {
    const url = getSupabaseUrl();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(`${url}/auth/v1/health`, {
      method: 'GET',
      headers: { apikey: getSupabaseAnonKey() },
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    const ok = response.ok;
    lastProbe = { at: now, ok };
    return ok;
  } catch {
    lastProbe = { at: now, ok: false };
    return false;
  }
}
