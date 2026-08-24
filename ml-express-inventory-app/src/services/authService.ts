import * as SecureStore from 'expo-secure-store';
import { svc } from '../errors/serviceError';
import {
  inventoryAccessTokenHasRequiredClaims,
  interpretInventoryStoreAccess,
  isInventoryCloudAuthError,
  isInventoryRlsPolicyError,
  shouldJoinInventorySessionRefresh,
  shouldRefreshInventoryAccessToken,
} from '../utils/cloudAuthErrors';
import { isCloudReachable, isLikelyNetworkError, withTimeout } from '../utils/networkReachability';
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
  supabase,
} from './supabase';

export const TRANSIT_STATION_STORE_TYPE = 'transit_station';
const SESSION_KEY = 'inventory_transit_session';
const DEVICE_SESSION_KEY = 'inventory_device_session_id';
const SESSION_KICKED_FLAG_KEY = 'inventory_session_kicked';

/** P4：云端 JWT 无效或缺少 inventory_* metadata 时需重新登录 */
export class InventoryAuthRequiredError extends Error {
  readonly code: import('../errors/serviceError').ServiceErrorCode;

  readonly params?: Record<string, string | number>;

  constructor(
    code: import('../errors/serviceError').ServiceErrorCode = 'authSessionExpired',
    params?: Record<string, string | number>,
  ) {
    super(code);
    this.name = 'InventoryAuthRequiredError';
    this.code = code;
    this.params = params;
  }
}

export function isInventoryAuthRequiredError(error: unknown): boolean {
  return error instanceof InventoryAuthRequiredError;
}

export type InventoryStoreSession = {
  id: string;
  storeCode: string;
  storeName: string;
  region: string;
  address: string;
  storeType: string;
  loggedInAt: string;
  /** P4 JWT app_metadata.inventory_hub_code，优先于 region 推断 */
  hubCode?: string;
  /** JWT app_metadata.inventory_session_id；用于数据库级单设备会话校验 */
  sessionId?: string;
};

type DeliveryStoreRow = {
  id: string;
  store_code: string;
  store_name: string;
  store_type: string;
  status: string | null;
  region: string | null;
  address: string | null;
};

type InventoryLoginPayload = {
  email?: string;
  hubCode?: string;
  sessionId?: string;
  store?: {
    id: string;
    storeCode: string;
    storeName: string;
    region?: string;
    address?: string;
    storeType: string;
  };
  error?: string;
};

function toSession(store: DeliveryStoreRow, hubCode?: string): InventoryStoreSession {
  const hub = hubCode?.trim().toUpperCase() || '';
  return {
    id: store.id,
    storeCode: store.store_code,
    storeName: store.store_name,
    region: hub || (store.region?.trim() ?? ''),
    address: store.address?.trim() ?? '',
    storeType: store.store_type,
    loggedInAt: new Date().toISOString(),
    hubCode: hub || undefined,
  };
}

export function inventorySessionFromAuthMetadata(user: {
  app_metadata?: Record<string, unknown>;
}): InventoryStoreSession | null {
  return sessionFromAuthMetadata(user);
}

export async function saveSession(session: InventoryStoreSession): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

export async function saveDeviceSessionId(sessionId: string): Promise<void> {
  await SecureStore.setItemAsync(DEVICE_SESSION_KEY, sessionId.trim());
}

export async function loadDeviceSessionId(): Promise<string | null> {
  const raw = await SecureStore.getItemAsync(DEVICE_SESSION_KEY);
  return raw?.trim() || null;
}

export async function clearDeviceSessionId(): Promise<void> {
  await SecureStore.deleteItemAsync(DEVICE_SESSION_KEY);
}

export async function markSessionKicked(): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KICKED_FLAG_KEY, '1');
}

export async function consumeSessionKickedFlag(): Promise<boolean> {
  const raw = await SecureStore.getItemAsync(SESSION_KICKED_FLAG_KEY);
  if (!raw) return false;
  await SecureStore.deleteItemAsync(SESSION_KICKED_FLAG_KEY);
  return true;
}

/** 校验本机 sessionId 是否仍为云端记录的活跃会话（单设备登录） */
export async function verifyDeviceSessionStillActive(storeId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;

  const localSessionId = await loadDeviceSessionId();
  const {
    data: { session: authSession },
  } = await supabase.auth.getSession();
  const jwtSessionId = String(
    authSession?.user?.app_metadata?.inventory_session_id ?? '',
  ).trim();
  if (!localSessionId || !jwtSessionId || localSessionId !== jwtSessionId) return false;

  const { data, error } = await supabase
    .from('delivery_stores')
    .select('current_session_id')
    .eq('id', storeId)
    .maybeSingle();
  if (error || !data?.current_session_id) return false;

  return data.current_session_id === localSessionId;
}

export async function loadStoredSession(): Promise<InventoryStoreSession | null> {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as InventoryStoreSession;
    if (!parsed?.id || !parsed.storeCode || !parsed.storeName) return null;
    return parsed;
  } catch {
    await clearSession();
    return null;
  }
}

function sessionFromAuthMetadata(user: {
  app_metadata?: Record<string, unknown>;
}): InventoryStoreSession | null {
  const meta = user.app_metadata ?? {};
  const id = String(meta.inventory_store_id ?? '').trim();
  const storeCode = String(meta.inventory_store_code ?? '').trim().toUpperCase();
  const sessionId = String(meta.inventory_session_id ?? '').trim();
  if (!id || !storeCode || !sessionId) return null;
  const hubCode = String(meta.inventory_hub_code ?? '').trim().toUpperCase();
  return {
    id,
    storeCode,
    storeName: String(meta.inventory_store_name ?? storeCode),
    region: hubCode || String(meta.inventory_region ?? '').trim(),
    address: String(meta.inventory_address ?? '').trim(),
    storeType: String(meta.inventory_store_type ?? TRANSIT_STATION_STORE_TYPE),
    loggedInAt: new Date().toISOString(),
    hubCode: hubCode || undefined,
    sessionId,
  };
}

let lastStoreAllowedAt = 0;
let lastStoreAllowedId = '';
const STORE_ALLOWED_TTL_MS = 60_000;

async function validateStoreStillAllowed(storeId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;
  if (storeId === lastStoreAllowedId && Date.now() - lastStoreAllowedAt < STORE_ALLOWED_TTL_MS) {
    return true;
  }
  const { data, error } = await supabase
    .from('delivery_stores')
    .select('store_type, status')
    .eq('id', storeId)
    .maybeSingle();
  if (error) {
    if (isInventoryCloudAuthError(error) || isInventoryRlsPolicyError(error)) {
      throw new InventoryAuthRequiredError('authSessionExpired');
    }
    throw new Error(error.message || 'delivery_stores lookup failed');
  }
  const access = interpretInventoryStoreAccess(data);
  if (access === 'unknown') {
    // RLS 把行藏起来时，不能误报成店铺停用（批量签收会整批失败）
    throw new InventoryAuthRequiredError('authSessionExpired');
  }
  if (access === 'allowed') {
    lastStoreAllowedAt = Date.now();
    lastStoreAllowedId = storeId;
    return true;
  }
  return false;
}

async function signInInventoryAuth(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw svc('cloudLoginFailed', { detail: error.message });
}

let refreshInventoryCloudSessionInFlight: Promise<InventoryStoreSession> | null = null;
let refreshInventoryCloudSessionForce = false;

/** 确认当前会话可用于 REST 写入（JWT 由 supabase fetch 拦截器挂上） */
export async function bindInventoryCloudSession(): Promise<InventoryStoreSession> {
  if (!isSupabaseConfigured()) {
    throw new InventoryAuthRequiredError('supabaseNotConfigured');
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new InventoryAuthRequiredError('authSessionExpired');
  }
  return ensureInventoryCloudAuth();
}

/** 主动刷新 Supabase JWT（写操作前调用，避免 RLS 误报需重新登录） */
export async function refreshInventoryCloudSession(options?: {
  force?: boolean;
}): Promise<InventoryStoreSession> {
  const force = Boolean(options?.force);
  if (
    shouldJoinInventorySessionRefresh({
      hasInFlight: Boolean(refreshInventoryCloudSessionInFlight),
      inFlightIsForce: refreshInventoryCloudSessionForce,
      requestedForce: force,
    })
  ) {
    return refreshInventoryCloudSessionInFlight as Promise<InventoryStoreSession>;
  }
  if (refreshInventoryCloudSessionInFlight) {
    try {
      await refreshInventoryCloudSessionInFlight;
    } catch {
      // 非强制刷新可能已失败，继续强制刷新
    }
  }
  refreshInventoryCloudSessionForce = force;
  refreshInventoryCloudSessionInFlight = refreshInventoryCloudSessionOnce({ force }).finally(() => {
    refreshInventoryCloudSessionInFlight = null;
    refreshInventoryCloudSessionForce = false;
  });
  return refreshInventoryCloudSessionInFlight;
}

async function refreshInventoryCloudSessionOnce(options?: {
  force?: boolean;
}): Promise<InventoryStoreSession> {
  if (!isSupabaseConfigured()) {
    throw new InventoryAuthRequiredError('supabaseNotConfigured');
  }
  const {
    data: { session: currentSession },
  } = await supabase.auth.getSession();
  if (!currentSession) {
    throw new InventoryAuthRequiredError('authSessionExpired');
  }

  const expiresAtMs = (currentSession.expires_at ?? 0) * 1000;
  const shouldRefresh = shouldRefreshInventoryAccessToken({
    expiresAtMs,
    hasInventoryClaims: inventoryAccessTokenHasRequiredClaims(currentSession.access_token ?? ''),
    force: options?.force,
  });
  if (shouldRefresh) {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session?.user) {
      throw new InventoryAuthRequiredError('authSessionExpired');
    }
  }

  return ensureInventoryCloudAuth();
}

/** 同步 / 写云端前校验：必须已登录且 JWT 含 inventory_store_id + hub_code */
export async function ensureInventoryCloudAuth(): Promise<InventoryStoreSession> {
  if (!isSupabaseConfigured()) {
    throw new InventoryAuthRequiredError('supabaseNotConfigured');
  }

  const {
    data: { session },
    error: sessionErr,
  } = await supabase.auth.getSession();
  if (sessionErr || !session?.user) {
    throw new InventoryAuthRequiredError();
  }

  const tokenHasClaims = inventoryAccessTokenHasRequiredClaims(session.access_token ?? '');
  let user = session.user;
  let userErr: { message?: string } | null = null;
  if (!tokenHasClaims) {
    const userResult = await supabase.auth.getUser();
    userErr = userResult.error;
    user = userErr ? session.user : userResult.data?.user ?? session.user;
  }

  if (userErr && isInventoryCloudAuthError(userErr)) {
    const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
    if (refreshErr || !refreshed.session?.user) {
      throw new InventoryAuthRequiredError('authSessionExpired');
    }
    const retryUser = refreshed.session.user;
    const fromRefreshed = sessionFromAuthMetadata(retryUser);
    if (!fromRefreshed?.hubCode || !fromRefreshed.sessionId) {
      throw new InventoryAuthRequiredError('authJwtMissingHubCode');
    }
    const okRefreshed = await validateStoreStillAllowed(fromRefreshed.id);
    if (!okRefreshed) throw new InventoryAuthRequiredError('storeDisabled');
    const storedRefreshed = await loadStoredSession();
    const mergedRefreshed = storedRefreshed ? { ...storedRefreshed, ...fromRefreshed } : fromRefreshed;
    await saveSession(mergedRefreshed);
    return mergedRefreshed;
  }

  const fromMeta = sessionFromAuthMetadata(user);
  if (!fromMeta?.hubCode || !fromMeta.sessionId) {
    throw new InventoryAuthRequiredError('authJwtMissingHubCode');
  }

  const ok = await validateStoreStillAllowed(fromMeta.id);
  if (!ok) {
    throw new InventoryAuthRequiredError('storeDisabled');
  }

  const stored = await loadStoredSession();
  const merged = stored ? { ...stored, ...fromMeta } : fromMeta;
  await saveSession(merged);
  return merged;
}

async function callInventoryStoreLogin(storeCode: string, password: string): Promise<InventoryLoginPayload> {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  const response = await fetch(`${url}/functions/v1/inventory-store-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
    },
    body: JSON.stringify({ storeCode, password }),
  });
  const payload = (await response.json()) as InventoryLoginPayload;
  if (!response.ok) {
    throw svc('loginFailed');
  }
  return payload;
}

export async function restoreSession(): Promise<InventoryStoreSession | null> {
  const stored = await loadStoredSession();
  if (!isSupabaseConfigured()) {
    return stored;
  }

  const {
    data: { session },
    error: sessionErr,
  } = await supabase.auth.getSession();
  if (sessionErr || !session?.user) {
    if (stored) {
      await supabase.auth.signOut();
      await clearSession();
      await clearDeviceSessionId();
    }
    return null;
  }

  const fromMeta = sessionFromAuthMetadata(session.user);
  if (!fromMeta?.hubCode || !fromMeta.sessionId) {
    await supabase.auth.signOut();
    await clearSession();
    await clearDeviceSessionId();
    return null;
  }

  const reachable = await isCloudReachable();
  if (!reachable) {
    return mergeStoredSession(fromMeta);
  }

  try {
    const sessionValidated = await withTimeout(ensureInventoryCloudAuth(), 8000);
    const active = await withTimeout(verifyDeviceSessionStillActive(sessionValidated.id), 5000);
    if (!active) {
      await markSessionKicked();
      await supabase.auth.signOut();
      await clearSession();
      await clearDeviceSessionId();
      return null;
    }
    return sessionValidated;
  } catch (e: unknown) {
    if (isLikelyNetworkError(e)) {
      return mergeStoredSession(fromMeta);
    }
    await supabase.auth.signOut();
    await clearSession();
    await clearDeviceSessionId();
    return null;
  }
}

async function mergeStoredSession(fromMeta: InventoryStoreSession): Promise<InventoryStoreSession> {
  const stored = await loadStoredSession();
  const merged = stored ? { ...stored, ...fromMeta } : fromMeta;
  await saveSession(merged);
  return merged;
}

export async function loginTransitStationStore(
  storeCode: string,
  password: string,
): Promise<InventoryStoreSession> {
  if (!isSupabaseConfigured()) {
    throw svc('supabaseNotConfigured');
  }

  const code = storeCode.trim().toUpperCase();
  const pass = password.trim();
  if (!code || !pass) {
    throw svc('fillStoreCodePassword');
  }

  const loginPayload = await callInventoryStoreLogin(code, pass);
  if (!loginPayload.email || !loginPayload.store || !loginPayload.sessionId) {
    throw svc('loginFailed');
  }

  await signInInventoryAuth(loginPayload.email, pass);

  await saveDeviceSessionId(loginPayload.sessionId);

  return await ensureInventoryCloudAuth();
}

export async function logoutTransitStationStore(): Promise<void> {
  if (isSupabaseConfigured()) {
    await supabase.auth.signOut();
  }
  await clearSession();
  await clearDeviceSessionId();
}

function inventoryAuthEmail(storeCode: string): string {
  return `inventory+${storeCode.trim().toLowerCase()}@inventory.mlexpress.internal`;
}

/** 修改 Inventory 登录密码（同步 delivery_stores + Supabase Auth） */
export async function changeInventoryPassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw svc('supabaseNotConfigured');
  }

  const current = currentPassword.trim();
  const next = newPassword.trim();
  if (!current || !next) {
    throw svc('fillCurrentNewPassword');
  }
  if (next.length < 6) {
    throw svc('newPasswordMinLength');
  }
  if (current === next) {
    throw svc('newPasswordSameAsCurrent');
  }

  const session = await ensureInventoryCloudAuth();
  const {
    data: { session: authSession },
    error: sessionErr,
  } = await supabase.auth.getSession();
  if (sessionErr || !authSession?.access_token) {
    throw new InventoryAuthRequiredError();
  }

  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  const response = await fetch(`${url}/functions/v1/inventory-change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authSession.access_token}`,
      apikey: anonKey,
    },
    body: JSON.stringify({ currentPassword: current, newPassword: next }),
  });

  const payload = (await response.json()) as { ok?: boolean; error?: string };
  if (!response.ok) {
    throw svc('changePasswordFailed');
  }

  const email = inventoryAuthEmail(session.storeCode);
  await signInInventoryAuth(email, next);
  await ensureInventoryCloudAuth();
}
