import * as SecureStore from 'expo-secure-store';
import { INVENTORY_RELOGIN_HINT, isInventoryCloudAuthError } from '../utils/cloudAuthErrors';
import {
  getSupabaseAnonKey,
  getSupabaseConfigHint,
  getSupabaseUrl,
  isSupabaseConfigured,
  supabase,
} from './supabase';

export const TRANSIT_STATION_STORE_TYPE = 'transit_station';
const SESSION_KEY = 'inventory_transit_session';

/** P4：云端 JWT 无效或缺少 inventory_* metadata 时需重新登录 */
export class InventoryAuthRequiredError extends Error {
  constructor(message = INVENTORY_RELOGIN_HINT) {
    super(message);
    this.name = 'InventoryAuthRequiredError';
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
  if (!id || !storeCode) return null;
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
  };
}

async function validateStoreStillAllowed(storeId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;
  const { data, error } = await supabase
    .from('delivery_stores')
    .select('store_type, status')
    .eq('id', storeId)
    .maybeSingle();
  if (error || !data) return false;
  return data.store_type === TRANSIT_STATION_STORE_TYPE && (!data.status || data.status === 'active');
}

async function signInInventoryAuth(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`云端登录失败：${error.message}`);
}

/** 同步 / 写云端前校验：必须已登录且 JWT 含 inventory_store_id + hub_code */
export async function ensureInventoryCloudAuth(): Promise<InventoryStoreSession> {
  if (!isSupabaseConfigured()) {
    throw new InventoryAuthRequiredError(getSupabaseConfigHint() || '未配置 Supabase');
  }

  const {
    data: { session },
    error: sessionErr,
  } = await supabase.auth.getSession();
  if (sessionErr || !session?.user) {
    throw new InventoryAuthRequiredError();
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userErr ? session.user : userData?.user ?? session.user;

  const fromMeta = sessionFromAuthMetadata(user);
  if (!fromMeta?.hubCode) {
    throw new InventoryAuthRequiredError(
      '云端 JWT 缺少 inventory_hub_code。请退出后重新登录以更新店铺权限。',
    );
  }

  const { error: probeErr } = await supabase
    .from('delivery_stores')
    .select('id')
    .eq('id', fromMeta.id)
    .maybeSingle();
  if (probeErr && isInventoryCloudAuthError(probeErr)) {
    throw new InventoryAuthRequiredError(probeErr.message);
  }

  const ok = await validateStoreStillAllowed(fromMeta.id);
  if (!ok) {
    throw new InventoryAuthRequiredError('店铺账号已停用或非中转站类型');
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
    throw new Error(payload.error ?? '登录失败');
  }
  return payload;
}

export async function restoreSession(): Promise<InventoryStoreSession | null> {
  if (!isSupabaseConfigured()) {
    return await loadStoredSession();
  }

  try {
    return await ensureInventoryCloudAuth();
  } catch {
    await supabase.auth.signOut();
    await clearSession();
    return null;
  }
}

export async function loginTransitStationStore(
  storeCode: string,
  password: string,
): Promise<InventoryStoreSession> {
  if (!isSupabaseConfigured()) {
    throw new Error(getSupabaseConfigHint() || '未配置 Supabase');
  }

  const code = storeCode.trim().toUpperCase();
  const pass = password.trim();
  if (!code || !pass) {
    throw new Error('请填写店铺代码和密码');
  }

  const loginPayload = await callInventoryStoreLogin(code, pass);
  if (!loginPayload.email || !loginPayload.store) {
    throw new Error(loginPayload.error ?? '登录失败');
  }

  await signInInventoryAuth(loginPayload.email, pass);

  return await ensureInventoryCloudAuth();
}

export async function logoutTransitStationStore(): Promise<void> {
  if (isSupabaseConfigured()) {
    await supabase.auth.signOut();
  }
  await clearSession();
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
    throw new Error(getSupabaseConfigHint() || '未配置 Supabase');
  }

  const current = currentPassword.trim();
  const next = newPassword.trim();
  if (!current || !next) {
    throw new Error('请填写当前密码和新密码');
  }
  if (next.length < 6) {
    throw new Error('新密码至少 6 位');
  }
  if (current === next) {
    throw new Error('新密码不能与当前密码相同');
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
    throw new Error(payload.error ?? '修改密码失败');
  }

  const email = inventoryAuthEmail(session.storeCode);
  await signInInventoryAuth(email, next);
  await ensureInventoryCloudAuth();
}
