import { Platform } from "react-native";
import { supabase } from "./supabaseClient";
import { rewritePublicStorageUrl } from "./nativeSupabaseUrl";
import LoggerService from "../LoggerService";
import type { Product, ProductCategory, ProductPendingUpdate } from "./types";
import {
  isProductLiveApproved,
  buildPendingUpdateFromProduct,
  normalizePendingPayload,
  toDirectProductPatch,
} from "../_shared/productReview";

// 商家服务 (外卖/零售)
export const merchantService = {
  // 获取商店的所有商品
  async getStoreProducts(storeId: string): Promise<Product[]> {
    try {
      if (!storeId || storeId === "undefined" || storeId === "null") {
        LoggerService.warn("获取商店商品失败: 缺少有效 storeId", storeId);
        return [];
      }
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      LoggerService.error("获取商店商品失败:", error);
      return [];
    }
  },

  // 获取商店分类
  async getStoreCategories(storeId: string): Promise<ProductCategory[]> {
    try {
      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .eq("store_id", storeId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      LoggerService.error("获取商店分类失败:", error);
      return [];
    }
  },

  /** 新建商品：始终待审，客户端不可见直至 Admin 通过 */
  async addProduct(
    product: Omit<Product, "id" | "created_at" | "updated_at" | "sales_count">,
  ) {
    try {
      const {
        listing_status: _ls,
        sales_count: _sc,
        pending_update: _pu,
        ...rest
      } = product as Product;
      const { data, error } = await supabase
        .from("products")
        .insert([
          {
            ...rest,
            sales_count: 0,
            listing_status: "pending" as const,
            is_available: false,
            pending_update: null,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data, pendingReview: true as const };
    } catch (error: any) {
      LoggerService.error("添加商品失败:", error);
      return { success: false, error };
    }
  },

  /** 内部直写主表（库存/上下架快捷操作勿直接调用，请用 submitMerchantProductChange） */
  async updateProduct(productId: string, updates: Partial<Product>) {
    try {
      const { pending_update: _pu, ...safeUpdates } = updates as Partial<Product> & {
        pending_update?: unknown;
      };
      const { data, error } = await supabase
        .from("products")
        .update({
          ...safeUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", productId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      LoggerService.error("更新商品失败:", error);
      return { success: false, error };
    }
  },

  /**
   * 商家侧任意商品资料变更（编辑表单 / 上下架 / 改价等）统一入口。
   * 已上架 → pending_update；未上架 → 直写主表并保持 pending。
   */
  async submitMerchantProductChange(
    product: Product,
    changes: Partial<ProductPendingUpdate> & Record<string, unknown>,
  ) {
    try {
      const snapshot = buildPendingUpdateFromProduct(product, normalizePendingPayload(changes));

      if (isProductLiveApproved(product.listing_status)) {
        const pending_update: ProductPendingUpdate = {
          ...snapshot,
          submitted_at: new Date().toISOString(),
        };
        const { data, error } = await supabase
          .from("products")
          .update({
            pending_update,
            updated_at: new Date().toISOString(),
          })
          .eq("id", product.id)
          .select()
          .single();
        if (error) throw error;
        return { success: true, data, pendingReview: true as const };
      }

      const payload: Partial<Product> = {
        ...toDirectProductPatch(snapshot),
        updated_at: new Date().toISOString(),
        pending_update: null,
      };
      const ls = (product.listing_status ?? "pending").trim();
      if (ls === "rejected") {
        payload.listing_status = "pending";
      }
      return this.updateProduct(product.id, payload);
    } catch (error: any) {
      LoggerService.error("提交商品变更失败:", error);
      return { success: false, error };
    }
  },

  /** @deprecated 请用 saveMerchantProduct 或 submitMerchantProductChange */
  async submitProductEdit(
    productId: string,
    updates: Partial<ProductPendingUpdate> & Record<string, unknown>,
    listingStatus?: string | null,
  ) {
    const { data: row } = await supabase.from("products").select("*").eq("id", productId).single();
    if (!row) return { success: false, error: { message: "Product not found" } };
    const product = row as Product;
    if (listingStatus !== undefined) {
      product.listing_status = listingStatus as Product["listing_status"];
    }
    return this.submitMerchantProductChange(product, updates);
  },

  /** 添加/编辑商品表单保存 */
  async saveMerchantProduct(params: {
    mode: "create" | "edit";
    product?: Product | null;
    storeId: string;
    draft: Partial<ProductPendingUpdate> & Record<string, unknown>;
  }) {
    const snapshot = normalizePendingPayload(params.draft);
    if (params.mode === "create") {
      return this.addProduct({
        store_id: params.storeId,
        ...toDirectProductPatch(snapshot),
        sales_count: 0,
      } as Omit<Product, "id" | "created_at" | "updated_at" | "sales_count">);
    }
    if (!params.product) {
      return { success: false, error: { message: "Product required for edit" } };
    }
    return this.submitMerchantProductChange(params.product, snapshot);
  },

  async toggleAvailability(product: Product) {
    return this.submitMerchantProductChange(product, { is_available: !product.is_available });
  },

  async updateStock(product: Product, newStock: number) {
    return this.submitMerchantProductChange(product, { stock: newStock });
  },

  // 删除商品
  async deleteProduct(productId: string) {
    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      LoggerService.error("删除商品失败:", error);
      return { success: false, error };
    }
  },

  // 上传商品图片
  async uploadProductImage(
    storeId: string,
    imageUri: string,
  ): Promise<string | null> {
    try {
      if (!imageUri) {
        throw new Error("imageUri is empty");
      }

      const fileName = `${storeId}/${Date.now()}.jpg`;
      console.log("开始准备上传商品图片:", imageUri);

      // 🚀 确保 URI 格式正确
      let formattedUri = imageUri;
      if (
        !imageUri.startsWith("file://") &&
        !imageUri.startsWith("content://")
      ) {
        formattedUri = Platform.OS === "ios" ? `file://${imageUri}` : imageUri;
      }

      console.log("正在读取商品图片并转换为字节流...", formattedUri);

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
        throw new Error("读取商品图片内容为空");
      }

      console.log("二进制转换成功，字节数:", bytes.length);

      // 上传到 storage
      console.log("正在执行 Supabase Storage 商品图片上传:", fileName);
      const { error: uploadError } = await supabase.storage
        .from("product_images")
        .upload(fileName, bytes, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        console.error("Supabase Storage 商品图片详细错误:", uploadError);
        throw uploadError;
      }

      // 获取公共 URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("product_images").getPublicUrl(fileName);

      console.log("获取商品图片 URL 成功:", publicUrl);
      return rewritePublicStorageUrl(publicUrl);
    } catch (error: any) {
      LoggerService.error("uploadProductImage 核心异常:", error);
      console.error("uploadProductImage 核心异常详情:", error);
      return null;
    }
  },

  // 🚀 新增：搜索商品
  async searchProductsByName(query: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(
          `
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
        `,
        )
        .ilike("name", `%${query}%`)
        .eq("is_available", true)
        .limit(20);

      if (error) throw error;
      return (data || []).filter((row) => {
        const store = row.delivery_stores as { store_type?: string; mall_visible?: boolean } | null;
        if (!store) return false;
        if (store.mall_visible === false) return false;
        return store.store_type !== "transit_station";
      });
    } catch (error) {
      LoggerService.error("搜索商品失败:", error);
      return [];
    }
  },
};
