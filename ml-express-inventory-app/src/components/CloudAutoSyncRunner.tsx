import React, { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { cancelAutoCloudSyncDebounce, invalidateCloudReachabilityCache, requestAutoCloudSync } from '../services/cloudAutoSync';
import { isCloudReachable } from '../utils/networkReachability';
import { isSupabaseConfigured } from '../services/supabase';
import { resolveStoreHubCode } from '../utils/storeZone';

/** 前台定时全量同步间隔 */
const FOREGROUND_INTERVAL_MS = 90_000;

/**
 * 登录后自动云端同步：回到前台、定时、登录时由 AuthContext 触发。
 * 各业务操作失败入队后也会 requestAutoCloudSync 重试。
 */
export default function CloudAutoSyncRunner() {
  const { store } = useAuth();

  useEffect(() => {
    if (!store || !isSupabaseConfigured()) return;

    const hub = resolveStoreHubCode(store);
    if (!hub) return;

    void isCloudReachable({ force: true }).then((reachable) => {
      if (reachable) requestAutoCloudSync(store, hub, { force: true });
    });

    const onAppState = (next: AppStateStatus) => {
      if (next === 'active') {
        invalidateCloudReachabilityCache();
        requestAutoCloudSync(store, hub);
      }
    };
    const sub = AppState.addEventListener('change', onAppState);

    const interval = setInterval(() => {
      if (AppState.currentState === 'active') {
        requestAutoCloudSync(store, hub);
      }
    }, FOREGROUND_INTERVAL_MS);

    return () => {
      sub.remove();
      clearInterval(interval);
      cancelAutoCloudSyncDebounce();
    };
  }, [store]);

  return null;
}
