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
import { loadShiftOperatorName, saveShiftOperatorName } from '../services/operatorService';
import { resolveStoreHubCode } from '../utils/storeZone';
import { isSupabaseConfigured, supabase } from '../services/supabase';

type AuthContextValue = {
  ready: boolean;
  isAuthenticated: boolean;
  store: InventoryStoreSession | null;
  /** 本站服务区域码（到站收货匹配用，如 YGN、MDY） */
  hubCode: string | null;
  /** 当班操作员姓名（写入流水）；未设置时回退店铺名 */
  operatorName: string | null;
  /** 是否已设置当班操作员姓名 */
  hasShiftOperator: boolean;
  storeCode: string | null;
  login: (storeCode: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** 换班登记操作员，无需退出登录 */
  updateShiftOperator: (name: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [store, setStore] = useState<InventoryStoreSession | null>(null);
  const [shiftOperator, setShiftOperator] = useState('');

  useEffect(() => {
    if (!store?.storeCode) {
      setShiftOperator('');
      return;
    }
    void loadShiftOperatorName(store.storeCode).then(setShiftOperator);
  }, [store?.storeCode]);

  useEffect(() => {
    void restoreSession()
      .then((session) => {
        setStore(session);
        if (session) {
          const hub = resolveStoreHubCode(session);
          void import('../services/cloudAutoSync').then(({ requestAutoCloudSync }) =>
            requestAutoCloudSync(session, hub, { force: true }),
          );
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
    void import('../services/cloudAutoSync').then(({ requestAutoCloudSync }) =>
      requestAutoCloudSync(session, hub, { force: true }),
    );
  }, []);

  const logout = useCallback(async () => {
    await logoutTransitStationStore();
    setStore(null);
    setShiftOperator('');
  }, []);

  const updateShiftOperator = useCallback(
    async (name: string) => {
      if (!store) return;
      const trimmed = name.trim();
      await saveShiftOperatorName(store.storeCode, trimmed);
      setShiftOperator(trimmed);
    },
    [store],
  );

  const operatorName = shiftOperator.trim() || store?.storeName || null;

  const value = useMemo(
    () => ({
      ready,
      isAuthenticated: !!store,
      store,
      hubCode: store ? resolveStoreHubCode(store) : null,
      operatorName,
      hasShiftOperator: Boolean(shiftOperator.trim()),
      storeCode: store?.storeCode ?? null,
      login,
      logout,
      updateShiftOperator,
    }),
    [ready, store, shiftOperator, operatorName, login, logout, updateShiftOperator],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
