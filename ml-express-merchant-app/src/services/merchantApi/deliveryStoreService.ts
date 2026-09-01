import { Platform } from "react-native";
import { supabase } from "./supabaseClient";
import { rewritePublicStorageUrl } from "./nativeSupabaseUrl";
import LoggerService from "../LoggerService";

const STORE_AVATAR_BUCKETS = ["product_images", "review_images"] as const;

function storeAvatarObjectPath(storeId: string) {
  return `${storeId}/avatar.jpg`;
}

function isMissingAvatarColumn(error: any): boolean {
  const text = `${error?.code || ""} ${error?.message || ""} ${error?.details || ""}`;
  return /avatar_url|PGRST204|schema cache/i.test(text);
}

/** Column GRANTs on delivery_stores were snapshotted before avatar_url existed. SELECT * then 42501s. */
const DELIVERY_STORE_SELECT_WITHOUT_AVATAR =
  "id, store_name, store_code, address, latitude, longitude, phone, email, manager_name, manager_phone, store_type, status, operating_hours, service_area_radius, capacity, current_load, facilities, notes, created_by, created_at, updated_at, region, is_closed_today, current_session_id, cod_settlement_day, vacation_dates, mall_visible, packing_sla_minutes";

function isDeliveryStoreColumnDenied(error: any): boolean {
  const text = `${error?.code || ""} ${error?.message || ""} ${error?.details || ""}`;
  return /42501|permission denied|avatar_url/i.test(text);
}

async function queryDeliveryStores<T>(
  run: (columns: string) => PromiseLike<{ data: T; error: any }>,
): Promise<{ data: T; error: any }> {
  const first = await run("*");
  if (first.error && isDeliveryStoreColumnDenied(first.error)) {
    return run(DELIVERY_STORE_SELECT_WITHOUT_AVATAR);
  }
  return first;
}

function publicUrlFor(bucket: string, path: string): string {
  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path);
  return rewritePublicStorageUrl(String(publicUrl || "").trim());
}

async function readLocalImageBytes(imageUri: string): Promise<Uint8Array> {
  let formattedUri = imageUri;
  if (!imageUri.startsWith("file://") && !imageUri.startsWith("content://")) {
    formattedUri = Platform.OS === "ios" ? `file://${imageUri}` : imageUri;
  }
  const response = await fetch(formattedUri);
  const blob = await response.blob();
  const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
  const bytes = new Uint8Array(arrayBuffer);
  if (!bytes.length) throw new Error("empty store avatar");
  return bytes;
}

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
      let { data, error } = await queryDeliveryStores((columns) =>
        supabase
          .from("delivery_stores")
          .select(columns as '*')
          .eq("status", "active")
          .eq("mall_visible", true)
          .order("store_name", { ascending: true }),
      );
      if (error?.message?.includes("mall_visible")) {
        const fallback = await queryDeliveryStores((columns) =>
          supabase
            .from("delivery_stores")
            .select(columns as '*')
            .eq("status", "active")
            .neq("store_type", "transit_station")
            .order("store_name", { ascending: true }),
        );
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
      const { data, error } = await queryDeliveryStores((columns) =>
        supabase
          .from("delivery_stores")
          .select(columns as '*')
          .eq("id", storeId)
          .maybeSingle(),
      );

      if (error) {
        LoggerService.error("获取店铺详情失败:", error);
        return null;
      }
      if (data && !("avatar_url" in (data as object))) {
        const avatar = await supabase
          .from("delivery_stores")
          .select("avatar_url")
          .eq("id", storeId)
          .maybeSingle();
        if (avatar.data?.avatar_url) {
          return { ...data, avatar_url: avatar.data.avatar_url };
        }
      }
      return data;
    } catch (error) {
      LoggerService.error("获取店铺详情失败:", error);
      return null;
    }
  },

  async updateStoreInfo(storeId: string, updates: any) {
    try {
      const { data, error } = await queryDeliveryStores((columns) =>
        supabase
          .from("delivery_stores")
          .update(updates)
          .eq("id", storeId)
          .select(columns as '*')
          .single(),
      );

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      if (updates?.avatar_url !== undefined && isMissingAvatarColumn(error)) {
        return { success: false, error: { ...error, code: "NO_AVATAR_COLUMN" } };
      }
      LoggerService.error("更新商店信息失败:", error);
      return { success: false, error };
    }
  },

  async uploadStoreAvatar(storeId: string, imageUri: string): Promise<string | null> {
    try {
      if (!storeId || !imageUri) throw new Error("missing store avatar upload args");
      const bytes = await readLocalImageBytes(imageUri);
      let lastError: unknown = null;

      for (const bucket of STORE_AVATAR_BUCKETS) {
        const fileName = storeAvatarObjectPath(storeId);
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, bytes, {
            contentType: "image/jpeg",
            upsert: true,
            cacheControl: "60",
          });
        if (uploadError) {
          lastError = uploadError;
          LoggerService.warn(`店铺头像上传到 ${bucket}/${fileName} 失败:`, uploadError);
          continue;
        }
        return publicUrlFor(bucket, fileName);
      }

      throw lastError || new Error("store avatar upload failed");
    } catch (error) {
      LoggerService.error("上传店铺头像失败:", error);
      return null;
    }
  },

  async removeStoreAvatar(storeId: string): Promise<void> {
    await this.updateStoreInfo(storeId, { avatar_url: "" });
    for (const bucket of STORE_AVATAR_BUCKETS) {
      try {
        await supabase.storage.from(bucket).remove([storeAvatarObjectPath(storeId)]);
      } catch (err) {
        LoggerService.warn(`删除 ${bucket} 店铺头像失败:`, err);
      }
    }
  },
};
