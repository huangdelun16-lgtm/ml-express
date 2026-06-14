import type { RealtimeChannel } from '@supabase/supabase-js';
import type { InventoryStoreSession } from './authService';
import { isSupabaseConfigured, supabase } from './supabase';

let activeChannel: RealtimeChannel | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function startInventoryCloudRealtime(
  store: InventoryStoreSession,
  hubCode: string,
  onPull: () => void,
): void {
  if (!isSupabaseConfigured()) return;

  stopInventoryCloudRealtime();

  const storeCode = store.storeCode.trim().toUpperCase();
  const hub = hubCode.trim().toUpperCase();

  const trigger = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      onPull();
    }, 1500);
  };

  const channel = supabase.channel(`inventory-sync-${storeCode}-${hub}`);
  channel
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'inventory_store_items',
        filter: `owner_store_code=eq.${storeCode}`,
      },
      trigger,
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'inventory_store_items',
        filter: `final_destination=eq.${hub}`,
      },
      trigger,
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'inventory_packed_shipments',
        filter: `owner_store_code=eq.${storeCode}`,
      },
      trigger,
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'inventory_stock_movements',
      },
      trigger,
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        stopInventoryCloudRealtime();
      }
    });

  activeChannel = channel;
}

export function stopInventoryCloudRealtime(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (activeChannel) {
    void supabase.removeChannel(activeChannel);
    activeChannel = null;
  }
}
