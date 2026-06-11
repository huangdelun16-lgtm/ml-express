import * as SecureStore from 'expo-secure-store';
import { getSupabaseConfigHint, isSupabaseConfigured, supabase } from './supabase';

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
  password: string | null;
  region: string | null;
  address: string | null;
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

export async function restoreSession(): Promise<InventoryStoreSession | null> {
  const stored = await loadStoredSession();
  if (!stored) return null;
  const ok = await validateStoreStillAllowed(stored.id);
  if (!ok) {
    await clearSession();
    return null;
  }
  return stored;
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

  const { data: store, error } = await supabase
    .from('delivery_stores')
    .select('*')
    .eq('store_code', code)
    .maybeSingle();

  if (error) {
    const hint = getSupabaseConfigHint();
    if (hint) throw new Error(hint);
    throw new Error(`查询店铺失败：${error.message}`);
  }
  if (!store) {
    throw new Error('店铺代码不存在');
  }
  if (store.password?.trim() !== pass) {
    throw new Error('密码错误');
  }
  if (store.store_type !== TRANSIT_STATION_STORE_TYPE) {
    throw new Error('仅 Admin 后台创建的「中转站」合伙店铺可登录本 App');
  }
  if (store.status && store.status !== 'active') {
    throw new Error(`账号状态异常（${store.status}），请联系管理员`);
  }

  const session = toSession(store as DeliveryStoreRow);
  await saveSession(session);
  return session;
}
