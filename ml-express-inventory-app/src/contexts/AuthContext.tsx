import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  loginTransitStationStore,
  logoutTransitStationStore,
  restoreSession,
  saveSession,
  clearSession,
  clearDeviceSessionId,
  inventorySessionFromAuthMetadata,
  type InventoryStoreSession,
} from '../services/authService';
import { resolveStoreHubCode } from '../utils/storeZone';
import { isSupabaseConfigured, supabase } from '../services/supabase';
import { clearInventoryCloudCache, prefetchInventoryCache } from '../services/inventoryCloudStore';

type AuthContextValue = {
  ready: boolean;
  isAuthenticated: boolean;
  store: InventoryStoreSession | null;
  /** 本站服务区域码（到站收货匹配用，如 YGN、MDY） */
  hubCode: string | null;
  /** 写入流水的操作员标识（使用店铺名称） */
  operatorName: string | null;
  storeCode: string | null;
  login: (storeCode: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [store, setStore] = useState<InventoryStoreSession | null>(null);

  useEffect(() => {
    void restoreSession()
      .then((session) => {
        setStore(session);
        if (session) {
          void prefetchInventoryCache(session, resolveStoreHubCode(session));
        }
      })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, authSession) => {
      if (event === 'SIGNED_OUT') {
        setStore(null);
        clearInventoryCloudCache();
        void clearSession();
        void clearDeviceSessionId();
        return;
      }
      if (event === 'TOKEN_REFRESHED' && authSession?.user) {
        const fromMeta = inventorySessionFromAuthMetadata(authSession.user);
        if (fromMeta) {
          setStore((prev) => {
            const merged = prev ? { ...prev, ...fromMeta } : fromMeta;
            void saveSession(merged);
            return merged;
          });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (storeCode: string, password: string) => {
    const session = await loginTransitStationStore(storeCode, password);
    setStore(session);
    void prefetchInventoryCache(session, resolveStoreHubCode(session));
  }, []);

  const logout = useCallback(async () => {
    await logoutTransitStationStore();
    clearInventoryCloudCache();
    setStore(null);
  }, []);

  const operatorName = store?.storeName?.trim() || store?.storeCode?.trim() || null;

  const value = useMemo(
    () => ({
      ready,
      isAuthenticated: !!store,
      store,
      hubCode: store ? resolveStoreHubCode(store) : null,
      operatorName,
      storeCode: store?.storeCode ?? null,
      login,
      logout,
    }),
    [ready, store, operatorName, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
