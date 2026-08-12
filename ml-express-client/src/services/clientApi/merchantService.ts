import { supabase } from './supabaseClient';
import LoggerService from '../LoggerService';
import type { Product, ProductCategory } from './types';

export const merchantService = {
  /** 客户侧同城商品：仅 Admin 已通过且在售（与 client-web 一致） */
  async getPublicStoreProducts(storeId: string): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_available', true)
        .eq('listing_status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      LoggerService.error('获取公开商店商品失败:', error);
      return [];
    }
  },

  async getStoreCategories(storeId: string): Promise<ProductCategory[]> {
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .eq('store_id', storeId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      LoggerService.error('获取商店分类失败:', error);
      return [];
    }
  },

  async searchProductsByName(query: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          delivery_stores (
            id,
            store_name,
            address,
            phone,
            store_type,
            operating_hours,
            is_closed_today
          )
        `)
        .ilike('name', `%${query}%`)
        .eq('is_available', true)
        .eq('listing_status', 'approved')
        .limit(20);

      if (error) throw error;
      return (data || []).filter((row) => {
        const store = row.delivery_stores as { store_type?: string; mall_visible?: boolean } | null;
        if (!store) return false;
        if (store.mall_visible === false) return false;
        return store.store_type !== 'transit_station';
      });
    } catch (error) {
      LoggerService.error('搜索商品失败:', error);
      return [];
    }
  }
};
