import { supabase } from './supabaseClient';
import LoggerService from '../LoggerService';

function isCityMallVisibleStore(store: Record<string, unknown>): boolean {
  if (store.mall_visible === false) return false;
  if (store.store_type === 'transit_station') return false;
  const addr = String(store.address ?? '');
  const notes = String(store.notes ?? '');
  if (/跨境物流中转站|cross-border transit hub/i.test(addr)) return false;
  if (/Inventory App 跨境/i.test(notes)) return false;
  return true;
}

export const deliveryStoreService = {
  async getActiveStores() {
    try {
      const base = supabase
        .from('delivery_stores')
        .select('*')
        .eq('status', 'active')
        .order('store_name', { ascending: true });

      let { data, error } = await base.eq('mall_visible', true);
      if (error?.message?.includes('mall_visible')) {
        const fallback = await supabase
          .from('delivery_stores')
          .select('*')
          .eq('status', 'active')
          .neq('store_type', 'transit_station')
          .order('store_name', { ascending: true });
        data = fallback.data;
        error = fallback.error;
      }

      if (error) throw error;
      return (data || []).filter(isCityMallVisibleStore);
    } catch (error) {
      LoggerService.error('获取配送店列表失败:', error);
      return [];
    }
  },

  async getStoreById(storeId: string) {
    try {
      const { data, error } = await supabase
        .from('delivery_stores')
        .select('*')
        .eq('id', storeId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      LoggerService.error('获取店铺详情失败:', error);
      return null;
    }
  },
};


