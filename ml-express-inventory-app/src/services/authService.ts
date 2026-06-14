import * as SecureStore from 'expo-secure-store';
import {
  getSupabaseAnonKey,
  getSupabaseConfigHint,
  getSupabaseUrl,
  isSupabaseConfigured,
  supabase,
} from './supabase';

export const TRANSIT_STATION_STORE_TYPE = 'transit_station';
const SESSION_KEY = 'inventory_transit_session';

export type InventoryStoreSession = {
  id: string;
  storeCode: string;
  storeName: string;
  region: string;
  address: string;
  storeType: string;
  loggedInAt: string;
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

function toSession(store: DeliveryStoreRow): InventoryStoreSession {
  return {
    id: store.id,
    storeCode: store.store_code,
    storeName: store.store_name,
    region: store.region?.trim() ?? '',
    address: store.address?.trim() ?? '',
    storeType: store.store_type,
    loggedInAt: new Date().toISOString(),
  };
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
  return {
    id,
    storeCode,
    storeName: String(meta.inventory_store_name ?? storeCode),
    region: String(meta.inventory_region ?? meta.inventory_hub_code ?? '').trim(),
    address: String(meta.inventory_address ?? '').trim(),
    storeType: String(meta.inventory_store_type ?? TRANSIT_STATION_STORE_TYPE),
    loggedInAt: new Date().toISOString(),
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

  const {
    data: { session: authSession },
  } = await supabase.auth.getSession();

  if (!authSession?.user) {
    await clearSession();
    return null;
  }

  const fromMeta = sessionFromAuthMetadata(authSession.user);
  const stored = await loadStoredSession();
  const candidate = stored ?? fromMeta;
  if (!candidate) {
    await supabase.auth.signOut();
    await clearSession();
    return null;
  }

  if (fromMeta && fromMeta.id !== candidate.id) {
    await supabase.auth.signOut();
    await clearSession();
    return null;
  }

  const ok = await validateStoreStillAllowed(candidate.id);
  if (!ok) {
    await supabase.auth.signOut();
    await clearSession();
    return null;
  }

  if (!stored) await saveSession(candidate);
  return candidate;
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

  const session = toSession({
    id: loginPayload.store.id,
    store_code: loginPayload.store.storeCode,
    store_name: loginPayload.store.storeName,
    store_type: loginPayload.store.storeType,
    status: 'active',
    region: loginPayload.store.region ?? null,
    address: loginPayload.store.address ?? null,
  });

  await saveSession(session);
  return session;
}

export async function logoutTransitStationStore(): Promise<void> {
  if (isSupabaseConfigured()) {
    await supabase.auth.signOut();
  }
  await clearSession();
}
