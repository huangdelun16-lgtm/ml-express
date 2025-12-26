import { supabase } from './supabase';
import LoggerService from './LoggerService';
import { orderCache, userCache, settingsCache, preloadManager, CacheUtils } from '../utils/CacheManager';

// API响应类型
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}
// 分页参数
interface PaginationParams {
  page: number;
  pageSize: number;
  userId?: string;
}

// 订单服务优化版本
export const optimizedPackageService = {
  // 获取用户订单（带分页和缓存）
  async getOrdersWithPagination(params: PaginationParams): Promise<ApiResponse<any>> {
    const { page, pageSize, userId } = params;
    const cacheKey = CacheUtils.generateKey('user_orders', userId || 'all', page.toString());
    
    try {
      // 先检查缓存
      const cachedData = await orderCache.getPage(cacheKey, page);
      if (cachedData) {
        return { success: true, data: cachedData };
      }
      // 从API获取数据
      const offset = (page - 1) * pageSize;
      let query = supabase
        .from('packages')
        .select('*')
        .order('create_time', { ascending: false })
        .range(offset, offset + pageSize - 1);
      if (userId && userId !== 'guest') {
        query = query.like('description', `[客户ID: ${userId}]%`);
      }
      const { data, error, count } = await query;
      if (error) {
        return { success: false, error: { message: error.message, code: error.code } };
      }
      const paginatedData = {
        data: data || [],
        page,
        pageSize,
        total: count || 0,
        hasMore: (data?.length || 0) === pageSize,
      };
      // 缓存数据
      await orderCache.setPage(cacheKey, page, paginatedData);
      return { success: true, data: paginatedData };
    } catch (error: any) {
      return { success: false, error: { message: error.message } };
    }
  },
  // 获取所有订单（使用缓存）
  async getAllOrders(userId: string): Promise<ApiResponse<any>> {
    const cacheKey = CacheUtils.generateKey('user_orders', userId);
      // 先尝试从缓存获取所有页面
      const cachedData = await orderCache.getAllPages(cacheKey);
      if (cachedData.length > 0) {
        return { success: true, data: { orders: cachedData } };
      }
      // 缓存未命中，从API获取
      let query = supabase
        .from('packages')
        .select('*')
        .order('create_time', { ascending: false });
      const { data, error } = await query;
      // 缓存第一页数据
      const firstPageData = {
        page: 1,
        pageSize: 20,
        total: data?.length || 0,
        hasMore: false,
      };
      await orderCache.setPage(cacheKey, 1, firstPageData);
      return { success: true, data: { orders: data || [] } };
    } catch (error: any) {
      return { success: false, error: { message: error.message } };
    }
  },

  // 获取订单详情（带缓存）
  async getOrderById(orderId: string): Promise<any> {
    const cacheKey = CacheUtils.generateKey('order_detail', orderId);
    try {
      // 检查缓存
      const cachedData = await orderCache.getPage(cacheKey, 1);
      if (cachedData && cachedData.data.length > 0) {
        return cachedData.data[0];
      }
      // 从API获取
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('id', orderId)
        .single();
        throw error;
      const cacheData = {
        data: [data],
        pageSize: 1,
        total: 1,
      await orderCache.setPage(cacheKey, 1, cacheData);
      return data;
      LoggerService.error('获取订单详情失败:', error);
      throw error;
  // 创建订单（清除相关缓存）
  async createPackage(packageData: any): Promise<ApiResponse<any>> {
      const result = await supabase
        .insert([packageData])
        .select()
      if (result.error) {
        return { success: false, error: { message: result.error.message } };
      // 清除用户订单缓存
      if (packageData.customer_id) {
        const cacheKey = CacheUtils.generateKey('user_orders', packageData.customer_id);
        await orderCache.clearPages(cacheKey);
      return { success: true, data: result.data };
  // 更新订单状态（更新缓存）
  async updateOrderStatus(orderId: string, status: string): Promise<ApiResponse<any>> {
        .update({ status })
        return { success: false, error: { message: error.message } };
      // 更新缓存中的订单状态
      // 这里需要找到包含该订单的缓存页面并更新
      // 简化实现：清除相关缓存，让下次重新加载
      const cacheKeys = ['user_orders_all', 'user_orders_pending', 'user_orders_inTransit', 'user_orders_delivered'];
      for (const key of cacheKeys) {
        await orderCache.clearPages(key);
      return { success: true, data };
  // 追踪订单（带缓存）
  async trackOrder(trackingCode: string): Promise<any> {
    const cacheKey = CacheUtils.generateKey('track_order', trackingCode);
        .or(`sender_code.eq.${trackingCode},transfer_code.eq.${trackingCode}`)
        .maybeSingle();
      if (data) {
        // 缓存数据
        const cacheData = {
          data: [data],
          page: 1,
          pageSize: 1,
          total: 1,
          hasMore: false,
        };
        await orderCache.setPage(cacheKey, 1, cacheData);
      LoggerService.error('追踪订单失败:', error);
};
// 用户服务优化版本
export const optimizedCustomerService = {
  // 获取用户信息（带缓存）
  async getUserInfo(userId: string): Promise<any> {
    const cacheKey = CacheUtils.generateKey('user_info', userId);
      const cachedData = userCache.get(cacheKey);
        return cachedData;
        .from('users')
        .eq('id', userId)
      userCache.set(cacheKey, data);
      LoggerService.error('获取用户信息失败:', error);
  // 登录（更新用户缓存）
  async login(email: string, password: string): Promise<ApiResponse<any>> {
        .eq('email', email)
        .eq('password', password)
        return { success: false, error: { message: '邮箱或密码错误' } };
      // 缓存用户信息
      const cacheKey = CacheUtils.generateKey('user_info', data.id);
// 系统设置服务优化版本
export const optimizedSystemSettingsService = {
  // 获取计费规则（带缓存）
  async getPricingSettings(region?: string): Promise<any> {
    const cacheKey = region ? `pricing_settings_${region.toLowerCase()}` : 'pricing_settings_global';
    try {
      const cachedData = await settingsCache.get(cacheKey);
      if (cachedData) return cachedData;

      const { data, error } = await supabase
        .from('system_settings')
        .select('settings_key, settings_value')
        .like('settings_key', 'pricing.%');

      let pricingSettings = {
        base_fee: 1500,
        per_km_fee: 250,
        weight_surcharge: 150,
        urgent_surcharge: 500,
        scheduled_surcharge: 200,
        oversize_surcharge: 300,
        fragile_surcharge: 300,
        food_beverage_surcharge: 300,
        free_km_threshold: 3,
      };

      if (data && data.length > 0) {
        // 如果指定了区域，优先应用区域设置
        if (region) {
          const regionPrefix = `pricing.${region.toLowerCase()}.`;
          const regionSpecificData = data.filter(item => item.settings_key.startsWith(regionPrefix));
          
          if (regionSpecificData.length > 0) {
            regionSpecificData.forEach((item: any) => {
              const key = item.settings_key.replace(regionPrefix, '');
              let value = item.settings_value;
              if (typeof value === 'string') {
                try { value = JSON.parse(value); } catch { value = parseFloat(value) || 0; }
              }
              (pricingSettings as any)[key] = typeof value === 'number' ? value : parseFloat(value) || 0;
            });
            await settingsCache.set(cacheKey, pricingSettings);
            return pricingSettings;
          }
        }

        // 应用全局默认设置（排除掉其他领区的设置）
        data.forEach((item: any) => {
          if (!item.settings_key.match(/\.(mandalay|yangon|maymyo|naypyidaw|taunggyi|lashio|muse)\./)) {
            const key = item.settings_key.replace('pricing.', '');
            let value = item.settings_value;
            if (typeof value === 'string') {
              try { value = JSON.parse(value); } catch { value = parseFloat(value) || 0; }
            }
            (pricingSettings as any)[key] = typeof value === 'number' ? value : parseFloat(value) || 0;
          }
        });
      }

      await settingsCache.set(cacheKey, pricingSettings);
      return pricingSettings;
    } catch (error) {
      LoggerService.error('获取计费规则失败:', error);
      // 返回默认值
      return {
        base_fee: 1500,
        per_km_fee: 250,
        weight_surcharge: 150,
        urgent_surcharge: 500,
        scheduled_surcharge: 200,
        oversize_surcharge: 300,
        fragile_surcharge: 300,
        food_beverage_surcharge: 300,
        free_km_threshold: 3,
      };
    }
  },
};
// 预加载服务
export const preloadService = {
  // 预加载用户数据
  async preloadUserData(userId: string): Promise<void> {
    preloadManager.addPreloadTask(async () => {
      try {
        // 预加载用户信息
        await optimizedCustomerService.getUserInfo(userId);
        
        // 预加载用户订单（第一页）
        await optimizedPackageService.getOrdersWithPagination({
          pageSize: 10,
          userId,
        });
        // 预加载系统设置
        await optimizedSystemSettingsService.getPricingSettings();
      } catch (error) {
        LoggerService.error('预加载用户数据失败:', error);
    });
  // 预加载首页数据
  async preloadHomeData(userId: string): Promise<void> {
        // 预加载最近订单
          pageSize: 5,
        // 预加载订单统计
        const { data } = await optimizedPackageService.getAllOrders(userId);
        if (data?.orders) {
          // 计算统计信息
          const stats = {
            total: data.orders.length,
            pending: data.orders.filter((o: any) => o.status === '待取件').length,
            inTransit: data.orders.filter((o: any) => o.status === '配送中').length,
            delivered: data.orders.filter((o: any) => o.status === '已送达').length,
            cancelled: data.orders.filter((o: any) => o.status === '已取消').length,
          };
          
          // 缓存统计信息
          const statsCacheKey = CacheUtils.generateKey('order_stats', userId);
          userCache.set(statsCacheKey, stats);
        LoggerService.error('预加载首页数据失败:', error);
  // 预加载订单详情
  async preloadOrderDetails(orderIds: string[]): Promise<void> {
        const promises = orderIds.map(id => 
          optimizedPackageService.getOrderById(id)
        );
        await Promise.all(promises);
        LoggerService.error('预加载订单详情失败:', error);
// 缓存管理工具
export const cacheManager = {
  // 清除用户相关缓存
  async clearUserCache(userId: string): Promise<void> {
    const cacheKeys = [
      CacheUtils.generateKey('user_info', userId),
      CacheUtils.generateKey('user_orders', userId),
      CacheUtils.generateKey('order_stats', userId),
    ];
    for (const key of cacheKeys) {
      userCache.delete(key);
      await orderCache.clearPages(key);
  // 清除所有缓存
  async clearAllCache(): Promise<void> {
    userCache.clear();
    await orderCache.clearPages('user_orders_all');
    await settingsCache.clear();
    preloadManager.clear();
  // 获取缓存统计
  getCacheStats() {
    return {
      userCache: userCache.getStats(),
      orderCache: orderCache.getStats(),
    };
