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
  type InventoryStoreSession,
} from '../services/authService';
import { resolveStoreHubCode } from '../utils/storeZone';

type AuthContextValue = {
  ready: boolean;
  isAuthenticated: boolean;
  store: InventoryStoreSession | null;
  /** 本站服务区域码（到站收货匹配用，如 YGN、MDY） */
  hubCode: string | null;
  /** 店铺名称，兼容各业务页的 operator 展示 */
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
          const hub = resolveStoreHubCode(session);
          void import('../services/inventoryService').then(({ syncPlatformInventoryCloud }) =>
            syncPlatformInventoryCloud(session, hub),
          );
        }
      })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!store) {
      void import('../services/inventoryCloudRealtime').then(({ stopInventoryCloudRealtime }) =>
        stopInventoryCloudRealtime(),
      );
      return;
    }
    const hub = resolveStoreHubCode(store);
    let stopped = false;

    void import('../services/inventoryCloudRealtime').then(({ startInventoryCloudRealtime }) => {
      if (stopped) return;
      startInventoryCloudRealtime(store, hub, () => {
        void import('../services/inventoryService').then(({ pullPlatformInventoryCloud }) =>
          pullPlatformInventoryCloud(store, hub),
        );
      });
    });

    return () => {
      stopped = true;
      void import('../services/inventoryCloudRealtime').then(({ stopInventoryCloudRealtime }) =>
        stopInventoryCloudRealtime(),
      );
    };
  }, [store]);

  const login = useCallback(async (storeCode: string, password: string) => {
    const session = await loginTransitStationStore(storeCode, password);
    setStore(session);
    const hub = resolveStoreHubCode(session);
    void import('../services/inventoryService').then(({ syncPlatformInventoryCloud }) =>
      syncPlatformInventoryCloud(session, hub),
    );
  }, []);

  const logout = useCallback(async () => {
    await logoutTransitStationStore();
    setStore(null);
  }, []);

  const value = useMemo(
    () => ({
      ready,
      isAuthenticated: !!store,
      store,
      hubCode: store ? resolveStoreHubCode(store) : null,
      operatorName: store?.storeName ?? null,
      storeCode: store?.storeCode ?? null,
      login,
      logout,
    }),
    [ready, store, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
