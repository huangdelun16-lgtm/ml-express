import { supabase } from './supabaseClient';
import LoggerService from '../LoggerService';
import { Platform } from 'react-native';
import type { StoreReview } from './types';

export const reviewService = {
  // 提交评价（若线上库未执行 migration 无 courier_rating 列，会自动去掉该字段重试一次）
  async createReview(reviewData: Omit<StoreReview, 'id' | 'created_at' | 'updated_at' | 'status'>) {
    const ts = new Date().toISOString();
    const row: Record<string, unknown> = {
      ...reviewData,
      status: 'published' as const,
      created_at: ts,
      updated_at: ts
    };
    const noCourier = (o: StoreReview) => {
      const { courier_rating: _c, ...rest } = o as StoreReview;
      return rest;
    };

    const trySyncPackage = async (withCourier: boolean) => {
      if (!reviewData.order_id) return;
      const now = new Date().toISOString();
      const base = {
        customer_rating: reviewData.rating,
        customer_comment: reviewData.comment ?? '',
        rating_time: now,
        updated_at: now
      } as Record<string, unknown>;
      if (withCourier) {
        base.courier_service_rating = reviewData.courier_rating ?? null;
      }
      const { error: pkgErr } = await supabase
        .from('packages')
        .update(base)
        .eq('id', reviewData.order_id);
      if (
        pkgErr &&
        withCourier &&
        String(pkgErr.message || '').toLowerCase().includes('courier_service_rating')
      ) {
        const { error: e2 } = await supabase
          .from('packages')
          .update({
            customer_rating: reviewData.rating,
            customer_comment: reviewData.comment ?? '',
            rating_time: now,
            updated_at: now
          })
          .eq('id', reviewData.order_id);
        if (e2) {
          LoggerService.error('评价已保存，同步订单评分失败:', e2);
        }
        return;
      }
      if (pkgErr) {
        LoggerService.error('评价已保存，同步订单评分失败:', pkgErr);
      }
    };

    try {
      let { data, error } = await supabase
        .from('store_reviews')
        .insert([row])
        .select()
        .single();

      if (
        error &&
        (String(error.message).includes('courier_rating') ||
          String(error.message).toLowerCase().includes('schema cache'))
      ) {
        const fallbackRow: Record<string, unknown> = {
          ...noCourier(reviewData as StoreReview),
          status: 'published' as const,
          created_at: ts,
          updated_at: ts
        };
        ({ data, error } = await supabase
          .from('store_reviews')
          .insert([fallbackRow])
          .select()
          .single());
        if (error) throw error;
        if (data && reviewData.order_id) {
          await trySyncPackage(false);
        }
        return { success: true, data, courierRatingSkipped: true as const };
      }

      if (error) throw error;
      if (data && reviewData.order_id) {
        await trySyncPackage(true);
      }
      return { success: true, data };
    } catch (error: any) {
      LoggerService.error('提交评价失败:', error?.message || '未知错误');
      return { success: false, error };
    }
  },

  // 获取店铺评价列表
  async getStoreReviews(storeId: string) {
    try {
      const { data, error } = await supabase
        .from('store_reviews')
        .select('*')
        .eq('store_id', storeId)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      LoggerService.error('获取评价列表失败:', error?.message || '未知错误');
      return [];
    }
  },

  // 获取店铺评分统计
  async getStoreReviewStats(storeId: string) {
    try {
      const { data, error } = await supabase
        .from('store_reviews')
        .select('rating')
        .eq('store_id', storeId)
        .eq('status', 'published');

      if (error) throw error;
      
      if (!data || data.length === 0) {
        return { average: 0, count: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };
      }

      const count = data.length;
      const sum = data.reduce((acc, curr) => acc + curr.rating, 0);
      const average = parseFloat((sum / count).toFixed(1));
      
      const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      data.forEach(r => {
        const rating = r.rating as keyof typeof distribution;
        distribution[rating] = (distribution[rating] || 0) + 1;
      });

      return { average, count, distribution };
    } catch (error: any) {
      LoggerService.error('获取评价统计失败:', error?.message || '未知错误');
      return { average: 0, count: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };
    }
  },

  // 🚀 新增：批量获取店铺评分统计 (大幅提升商场页面加载速度)
  async getMultipleStoresReviewStats(storeIds: string[]) {
    try {
      if (!storeIds || storeIds.length === 0) return {};

      const { data, error } = await supabase
        .from('store_reviews')
        .select('store_id, rating')
        .in('store_id', storeIds)
        .eq('status', 'published');

      if (error) throw error;

      const statsMap: Record<string, any> = {};
      
      // 初始化每个店铺的统计数据
      storeIds.forEach(id => {
        statsMap[id] = { average: 0, count: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };
      });

      // 填充评分数据
      if (data) {
        data.forEach(item => {
          const stats = statsMap[item.store_id];
          if (stats) {
            stats.count += 1;
            stats.totalSum = (stats.totalSum || 0) + item.rating;
            const rating = item.rating as keyof typeof stats.distribution;
            stats.distribution[rating] = (stats.distribution[rating] || 0) + 1;
          }
        });

        // 计算平均分
        Object.keys(statsMap).forEach(id => {
          const stats = statsMap[id];
          if (stats.count > 0) {
            stats.average = parseFloat((stats.totalSum / stats.count).toFixed(1));
            delete stats.totalSum; // 清理临时变量
          }
        });
      }

      return statsMap;
    } catch (error: any) {
      LoggerService.error('批量获取评价统计失败:', error?.message || '未知错误');
      return {};
    }
  },

  // 商家回复评价
  async replyToReview(reviewId: string, replyText: string) {
    try {
      const { data, error } = await supabase
        .from('store_reviews')
        .update({
          reply_text: replyText,
          replied_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', reviewId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      LoggerService.error('回复评价失败:', error?.message || '未知错误');
      return { success: false, error };
    }
  },

  // 上传评价图片 (移动端适配版本)
  async uploadReviewImage(userId: string, imageUri: string): Promise<string | null> {
    try {
      if (!imageUri) throw new Error('imageUri is empty');

      const fileName = `review_${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      
      // 🚀 确保 URI 格式正确
      let formattedUri = imageUri;
      if (!imageUri.startsWith('file://') && !imageUri.startsWith('content://')) {
        formattedUri = Platform.OS === 'ios' ? `file://${imageUri}` : imageUri;
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
      
      const { error: uploadError } = await supabase.storage
        .from('review_images')
        .upload(fileName, bytes, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('review_images')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      LoggerService.error('上传评价图片失败:', error);
      return null;
    }
  }
};

