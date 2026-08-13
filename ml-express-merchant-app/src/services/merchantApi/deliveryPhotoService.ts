import { supabase } from "./supabaseClient";
import LoggerService from "../LoggerService";

// 配送照片服务
export const deliveryPhotoService = {
  // 获取包裹的配送照片
  async getPackagePhotos(packageId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from("delivery_photos")
        .select("*")
        .eq("package_id", packageId)
        .order("upload_time", { ascending: false });

      if (error) {
        LoggerService.error("获取包裹照片失败:", error);
        return [];
      }

      return data || [];
    } catch (err) {
      LoggerService.error("获取包裹照片异常:", err);
      return [];
    }
  },
};
