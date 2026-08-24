import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { isBrowserRealtimeAvailable } from '../utils/supabaseBrowserUrl';

export interface UseSupabaseRealtimeOptions {
  table: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  filter?: string;
}

/**
 * Supabase 实时订阅 Hook
 * 提供真正的实时数据推送，替代轮询机制
 */
export const useSupabaseRealtime = (options: UseSupabaseRealtimeOptions) => {
  const { table, onInsert, onUpdate, onDelete, filter } = options;
  const channelRef = useRef<RealtimeChannel | null>(null);
  const mountedRef = useRef(true);

  const subscribe = useCallback(() => {
    if (!mountedRef.current) return;
    if (!isBrowserRealtimeAvailable()) return;

    // 创建实时订阅频道
    const channelName = `realtime:${table}${filter ? `:${filter}` : ''}`;
    channelRef.current = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          ...(filter && { filter })
        },
        (payload) => {
          if (!mountedRef.current) return;

          console.log(`🔔 实时数据变化 [${table}]:`, payload);

          switch (payload.eventType) {
            case 'INSERT':
              onInsert?.(payload);
              break;
            case 'UPDATE':
              onUpdate?.(payload);
              break;
            case 'DELETE':
              onDelete?.(payload);
              break;
          }
        }
      )
      .subscribe((status) => {
        console.log(`📡 实时订阅状态 [${table}]:`, status);
      });

  }, [table, onInsert, onUpdate, onDelete, filter]);

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      console.log(`📡 取消实时订阅 [${table}]`);
    }
  }, [table]);

  useEffect(() => {
    subscribe();

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, [subscribe, unsubscribe]);

  return {
    subscribe,
    unsubscribe,
    isSubscribed: !!channelRef.current
  };
};

/**
 * 骑手位置实时订阅 Hook
 * 专门用于监听 courier_locations 表的变化
 */
export const useCourierLocationRealtime = (onLocationUpdate: (location: any) => void) => {
  return useSupabaseRealtime({
    table: 'courier_locations',
    onInsert: (payload) => {
      console.log('🆕 新骑手上线:', payload.new);
      onLocationUpdate(payload.new);
    },
    onUpdate: (payload) => {
      console.log('🔄 骑手位置更新:', payload.new);
      onLocationUpdate(payload.new);
    },
    onDelete: (payload) => {
      console.log('❌ 骑手下线:', payload.old);
      onLocationUpdate({ ...payload.old, deleted: true });
    }
  });
};

export default useSupabaseRealtime;