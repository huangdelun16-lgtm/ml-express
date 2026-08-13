import { Platform } from "react-native";
import { supabase } from "./supabaseClient";
import LoggerService from "../LoggerService";

// 充值服务
export const rechargeService = {
  // 上传充值凭证
  async uploadProof(userId: string, imageUri: string): Promise<string | null> {
    try {
      if (!imageUri) {
        throw new Error("imageUri is empty");
      }

      const fileName = `recharge_${userId}_${Date.now()}.jpg`;
      console.log("开始准备上传凭证:", imageUri);

      // 🚀 确保 URI 格式正确
      let formattedUri = imageUri;
      if (
        !imageUri.startsWith("file://") &&
        !imageUri.startsWith("content://")
      ) {
        formattedUri = Platform.OS === "ios" ? `file://${imageUri}` : imageUri;
      }

      console.log("正在读取图片并转换为字节流...", formattedUri);

      // 🚀 使用 fetch 代替 deprecated 的 FileSystem.readAsStringAsync (Expo 54+ 兼容方案)
      const response = await fetch(formattedUri);
      const blob = await response.blob();
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });

      const bytes = new Uint8Array(arrayBuffer);
      if (!bytes || bytes.length === 0) {
        throw new Error("读取图片内容为空");
      }

      console.log("二进制转换成功，字节数:", bytes.length);

      // 上传到 storage
      console.log("正在执行 Supabase Storage 上传:", fileName);
      const { error: uploadError } = await supabase.storage
        .from("payment_proofs")
        .upload(fileName, bytes, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        console.error("Supabase Storage 详细错误:", uploadError);
        throw uploadError;
      }

      // 获取公共 URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("payment_proofs").getPublicUrl(fileName);

      console.log("获取 URL 成功:", publicUrl);
      return publicUrl;
    } catch (error: any) {
      LoggerService.error("uploadProof 核心异常:", error);
      console.error("uploadProof 核心异常详情:", error);
      return null;
    }
  },

  // 创建充值申请
  async createRequest(requestData: {
    user_id: string;
    user_name: string;
    amount: number;
    proof_url: string;
    status: "pending" | "completed" | "rejected";
    notes?: string;
  }) {
    try {
      const { data, error } = await supabase
        .from("recharge_requests")
        .insert([
          {
            ...requestData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      LoggerService.error("创建充值申请失败:", error?.message || "未知错误");
      return { success: false, error };
    }
  },
};
