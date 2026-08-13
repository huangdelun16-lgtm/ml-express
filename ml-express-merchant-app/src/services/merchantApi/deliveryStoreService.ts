import { supabase } from "./supabaseClient";
import LoggerService from "../LoggerService";

function isCityMallVisibleStore(store: Record<string, unknown>): boolean {
  if (store.mall_visible === false) return false;
  if (store.store_type === "transit_station") return false;
  const addr = String(store.address ?? "");
  const notes = String(store.notes ?? "");
  if (/跨境物流中转站|cross-border transit hub/i.test(addr)) return false;
  if (/Inventory App 跨境/i.test(notes)) return false;
  return true;
}

// 配送店/合伙商户服务
export const deliveryStoreService = {
  async getActiveStores() {
    try {
      let { data, error } = await supabase
        .from("delivery_stores")
        .select("*")
        .eq("status", "active")
        .eq("mall_visible", true)
        .order("store_name", { ascending: true });
      if (error?.message?.includes("mall_visible")) {
        const fallback = await supabase
          .from("delivery_stores")
          .select("*")
          .eq("status", "active")
          .neq("store_type", "transit_station")
          .order("store_name", { ascending: true });
        data = fallback.data;
        error = fallback.error;
      }

      if (error) throw error;
      return (data || []).filter(isCityMallVisibleStore);
    } catch (error) {
      LoggerService.error("获取配送店列表失败:", error);
      return [];
    }
  },

  async getStoreById(storeId: string) {
    if (!storeId) return null;
    try {
      const { data, error } = await supabase
        .from("delivery_stores")
        .select("*")
        .eq("id", storeId)
        .maybeSingle();

      if (error) {
        LoggerService.error("获取店铺详情失败:", error);
        return null;
      }
      return data;
    } catch (error) {
      LoggerService.error("获取店铺详情失败:", error);
      return null;
    }
  },

  async updateStoreInfo(storeId: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from("delivery_stores")
        .update(updates)
        .eq("id", storeId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      LoggerService.error("更新商店信息失败:", error);
      return { success: false, error };
    }
  },
};
