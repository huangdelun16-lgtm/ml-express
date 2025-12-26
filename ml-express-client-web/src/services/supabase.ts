import { createClient } from '@supabase/supabase-js';
import LoggerService from './LoggerService';

// 使用环境变量配置 Supabase（不再使用硬编码密钥）
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

// 验证 API key 是否有效
if (!supabaseUrl || !supabaseKey) {
  LoggerService.error('❌ 错误：Supabase 环境变量未配置！');
  LoggerService.error('请在 Netlify Dashboard → Site settings → Environment variables 中配置：');
  LoggerService.error('  - REACT_APP_SUPABASE_URL');
  LoggerService.error('  - REACT_APP_SUPABASE_ANON_KEY');
  throw new Error('REACT_APP_SUPABASE_URL 和 REACT_APP_SUPABASE_ANON_KEY 环境变量必须配置！');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// 包裹数据类型定义
export interface Package {
  id: string;
  sender_name: string;
  sender_phone: string;
  sender_address: string;
  sender_latitude?: number;
  sender_longitude?: number;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  receiver_latitude?: number;
  receiver_longitude?: number;
  package_type: string;
  weight: string;
  description?: string;
  delivery_speed?: string;
  scheduled_delivery_time?: string;
  delivery_distance?: number;
  status: string;
  create_time: string;
  pickup_time: string;
  delivery_time: string;
  courier: string;
  price: string;
  region?: string;
  created_at?: string;
  updated_at?: string;
  delivery_store_id?: string;
  delivery_store_name?: string;
  store_receive_code?: string;
  sender_code?: string;
  transfer_code?: string;
  payment_method?: 'qr' | 'cash'; // 支付方式：qr=二维码支付，cash=现金支付
  cod_amount?: number; // 代收款金额 (Cash on Delivery)
  customer_id?: string; // 客户ID
  customer_email?: string; // 客户邮箱
  customer_name?: string; // 客户姓名
  cod_settled?: boolean; // 代收款是否已结清
  cod_settled_at?: string; // 代收款结清时间
}

// 广告横幅接口
export interface Banner {
  id?: string;
  title: string;
  subtitle?: string;
  burmese_title?: string;
  image_url?: string;
  link_url?: string;
  bg_color_start?: string;
  bg_color_end?: string;
  display_order?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// 客户端包裹服务（只包含客户端需要的功能）
export const packageService = {
  // 获取所有包裹（用于跟踪页面）
  async getAllPackages(): Promise<Package[]> {
    try {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        LoggerService.error('获取包裹列表失败:', error);
        return [];
      }
      
      return data || [];
    } catch (err) {
      LoggerService.error('获取包裹列表异常:', err);
      return [];
    }
  },

  // 创建新包裹
  async createPackage(packageData: Omit<Package, 'id' | 'created_at' | 'updated_at'>): Promise<Package | null> {
    try {
      LoggerService.debug('尝试创建包裹:', packageData);
      
      // 如果 customer_email 或 customer_name 字段不存在，从数据中移除它们
      // 这样可以避免数据库列不存在的错误
      const dataToInsert: any = { ...packageData };
      
      // 检查并处理可能不存在的字段
      // 如果数据库表中没有这些字段，尝试插入时会失败
      // 所以我们先尝试插入，如果失败则移除这些字段重试
      let { data, error } = await supabase
        .from('packages')
        .insert([dataToInsert])
        .select()
        .single();
      
      // 如果错误是因为列不存在，移除这些字段后重试
      if (error && (
        error.message.includes('customer_email') || 
        error.message.includes('customer_name') || 
        error.message.includes('sender_code') || 
        error.message.includes('delivery_store_id') || 
        error.message.includes('delivery_store_name') || 
        error.message.includes('cod_amount') ||
        error.code === 'PGRST204'
      )) {
        LoggerService.warn('检测到列不存在，尝试移除可选字段后重试:', error.message);
        
        // 如果是特定字段错误，只移除该字段；如果是通用错误(PGRST204)，移除所有可能的新字段
        if (error.message.includes('customer_')) {
          delete dataToInsert.customer_email;
          delete dataToInsert.customer_name;
        }
        if (error.message.includes('sender_code') || error.message.includes('delivery_store_')) {
          delete dataToInsert.sender_code;
          delete dataToInsert.delivery_store_id;
          delete dataToInsert.delivery_store_name;
        }
        if (error.message.includes('cod_amount')) {
          delete dataToInsert.cod_amount;
        }
        
        // 如果是通用错误，移除所有可能导致问题的可选字段
        if (error.code === 'PGRST204') {
          delete dataToInsert.customer_email;
          delete dataToInsert.customer_name;
          delete dataToInsert.sender_code;
          delete dataToInsert.delivery_store_id;
          delete dataToInsert.delivery_store_name;
          delete dataToInsert.cod_amount;
        }
        
        // 重试插入
        const retryResult = await supabase
          .from('packages')
          .insert([dataToInsert])
          .select()
          .single();
        
        if (retryResult.error) {
          error = retryResult.error;
        } else {
          data = retryResult.data;
          error = null;
        }
      }
      
      if (error) {
        LoggerService.error('【Supabase错误】创建包裹失败:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        
        // 检查是否是 API key 错误
        if (error.message && error.message.includes('Invalid API key')) {
          const errorMsg = `API Key 配置错误：${error.message}\n\n` +
            `请检查 Netlify Dashboard 中的环境变量配置：\n` +
            `1. 访问 Netlify Dashboard → Site settings → Environment variables\n` +
            `2. 确认已配置 REACT_APP_SUPABASE_ANON_KEY\n` +
            `3. 确认 API Key 值正确且完整\n` +
            `4. 重新部署网站以应用更改`;
          throw new Error(errorMsg);
        }
        
        throw new Error(`数据库错误: ${error.message} (代码: ${error.code || '未知'})`);
      }
      
      LoggerService.debug('包裹创建成功:', data);
      return data;
    } catch (err: any) {
      LoggerService.error('【服务层异常】创建包裹时发生未知错误:', err);
      throw err;
    }
  },

  // 根据ID获取包裹（用于跟踪）
  async getPackageById(id: string): Promise<Package | null> {
    try {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        LoggerService.error('获取包裹详情失败:', error);
        return null;
      }
      
      return data;
    } catch (err) {
      LoggerService.error('获取包裹详情异常:', err);
      return null;
    }
  },

  // 根据订单号搜索包裹（支持模糊搜索）
  async searchPackage(trackingNumber: string): Promise<Package | null> {
    try {
      // 先尝试精确匹配
      let { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('id', trackingNumber.toUpperCase())
        .single();
      
      if (error || !data) {
        // 如果精确匹配失败，尝试模糊搜索
        const { data: searchData, error: searchError } = await supabase
          .from('packages')
          .select('*')
          .ilike('id', `%${trackingNumber.toUpperCase()}%`)
          .limit(1)
          .single();
        
        if (searchError || !searchData) {
          return null;
        }
        return searchData;
      }
      
      return data;
    } catch (err) {
      LoggerService.error('搜索包裹异常:', err);
      return null;
    }
  },

  // 根据用户邮箱或手机号获取该用户的所有包裹
  // startDate: 可选，如果有值，只查询该时间之后的订单（用于解决新账户看到旧手机号关联的历史订单问题）
  async getPackagesByUser(email?: string, phone?: string, startDate?: string): Promise<Package[]> {
    try {
      if (!email && !phone) {
        LoggerService.debug('getPackagesByUser: 没有邮箱和手机号，返回空数组');
        return [];
      }

      LoggerService.debug('getPackagesByUser: 开始查询，email:', email, 'phone:', phone, 'startDate:', startDate);

      // 构建查询条件：根据邮箱或手机号查询
      // 查询条件：customer_email 匹配 OR sender_phone 匹配 OR receiver_phone 匹配
      let query = supabase.from('packages').select('*');

      // 如果有开始时间，添加时间过滤
      if (startDate) {
        query = query.gte('created_at', startDate);
      }

      const conditions: string[] = [];
      
      // 优先使用手机号查询（因为 customer_email 字段可能不存在）
      if (phone) {
        // 同时查询 sender_phone 和 receiver_phone
        conditions.push(`sender_phone.eq.${phone}`);
        conditions.push(`receiver_phone.eq.${phone}`);
        LoggerService.debug('添加查询条件: sender_phone =', phone, '和 receiver_phone =', phone);
      }

      if (conditions.length > 0) {
        // 使用 OR 连接所有条件
        const orCondition = conditions.join(',');
        LoggerService.debug('最终查询条件:', orCondition);
        query = query.or(orCondition);
      } else {
        LoggerService.debug('没有查询条件，返回空数组');
        return [];
      }

      let { data, error } = await query.order('created_at', { ascending: false });
      
      // 如果查询失败且是因为 customer_email 字段不存在，只使用手机号查询
      if (error && (error.message.includes('customer_email') || error.code === 'PGRST204')) {
        LoggerService.warn('customer_email 字段不存在，只使用手机号查询');
        // 重新构建查询，只使用手机号
        if (phone) {
          query = supabase.from('packages').select('*');
          query = query.or(`sender_phone.eq.${phone},receiver_phone.eq.${phone}`);
          const retryResult = await query.order('created_at', { ascending: false });
          if (retryResult.error) {
            error = retryResult.error;
          } else {
            data = retryResult.data;
            error = null;
          }
        }
      }
      
      if (error) {
        LoggerService.error('获取用户包裹列表失败:', error);
        LoggerService.error('错误详情:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        LoggerService.error('查询条件:', conditions);
        return [];
      }
      
      // 如果邮箱存在，在结果中进一步过滤（客户端过滤，避免数据库查询错误）
      if (email && data) {
        LoggerService.debug('使用邮箱过滤结果，邮箱:', email);
        data = data.filter((pkg: any) => {
          // 如果包裹有 customer_email 字段且匹配，或者通过手机号匹配
          return pkg.customer_email === email || 
                 pkg.sender_phone === phone || 
                 pkg.receiver_phone === phone;
        });
        LoggerService.debug('过滤后的包裹数量:', data.length);
      }
      
      LoggerService.debug('查询成功，包裹数量:', data?.length || 0);
      if (data && data.length > 0) {
        LoggerService.debug('包裹ID列表:', data.map(p => p.id));
      }
      return data || [];
    } catch (err) {
      LoggerService.error('获取用户包裹列表异常:', err);
      return [];
    }
  },

  // 获取合伙店铺代收款统计
  async getPartnerStats(userId: string, storeName?: string, month?: string) {
    try {
      // 构建查询函数
      const runQuery = async (fields: string) => {
        let q = supabase
          .from('packages')
          .select(fields)
          .eq('status', '已送达')
          .gt('cod_amount', 0);

        const conditions = [`delivery_store_id.eq.${userId}`];
        if (storeName) {
          conditions.push(`sender_name.eq.${storeName}`);
        }
        
        q = q.or(conditions.join(','));
        
        // 如果指定了月份，添加日期过滤
        if (month) {
          const [year, monthNum] = month.split('-');
          const startDate = `${year}-${monthNum}-01`;
          const endDate = new Date(parseInt(year), parseInt(monthNum), 0).toISOString().split('T')[0];
          q = q.gte('delivery_time', startDate).lte('delivery_time', endDate);
        }
        
        return q;
      };

      // 尝试查询所有字段
      let { data, error } = await runQuery('cod_amount, cod_settled, cod_settled_at, status, delivery_time');

      // 如果报错字段不存在 (42703)，降级查询（不查 cod_settled 相关字段）
      if (error && error.code === '42703') {
        LoggerService.warn('cod_settled 字段不存在，使用降级查询');
        const retryResult = await runQuery('cod_amount, status, delivery_time');
        data = retryResult.data;
        error = retryResult.error;
      }

      if (error) throw error;

      // 类型断言：确保 data 是正确的类型
      const packages = (data || []) as Array<{
        cod_amount?: number;
        cod_settled?: boolean;
        cod_settled_at?: string;
        status?: string;
        delivery_time?: string;
      }>;

      const totalCOD = packages.reduce((sum, pkg) => sum + (pkg.cod_amount || 0), 0);
      
      // 如果没有 cod_settled 字段，data 中该属性为 undefined，!undefined 为 true，即默认未结清
      const unclearedPackages = packages.filter(pkg => !pkg.cod_settled);
      const unclearedCOD = unclearedPackages.reduce((sum, pkg) => sum + (pkg.cod_amount || 0), 0);
      const unclearedCount = unclearedPackages.length;
      
      const settledPackages = packages.filter(pkg => pkg.cod_settled);
      const settledCOD = settledPackages.reduce((sum, pkg) => sum + (pkg.cod_amount || 0), 0);
      
      // 计算最后结清日期
      const settledPackagesWithDate = settledPackages.filter(pkg => pkg.cod_settled_at);
      let lastSettledAt: string | null = null;
      if (settledPackagesWithDate.length > 0) {
        settledPackagesWithDate.sort((a, b) => new Date(b.cod_settled_at!).getTime() - new Date(a.cod_settled_at!).getTime());
        lastSettledAt = settledPackagesWithDate[0].cod_settled_at || null;
      }

      return {
        totalCOD,
        unclearedCOD,
        unclearedCount,
        settledCOD,
        lastSettledAt
      };
    } catch (error) {
      LoggerService.error('获取合伙人统计失败:', error);
      return {
        totalCOD: 0,
        unclearedCOD: 0,
        unclearedCount: 0,
        settledCOD: 0,
        lastSettledAt: null
      };
    }
  },

  // 获取指定月份的有代收款的订单列表
  async getPartnerCODOrders(userId: string, storeName?: string, month?: string, settled?: boolean, page: number = 1, pageSize: number = 20) {
    try {
      let q = supabase
        .from('packages')
        .select('id, cod_amount, delivery_time, cod_settled', { count: 'exact' })
        .eq('status', '已送达')
        .gt('cod_amount', 0);

      const conditions = [`delivery_store_id.eq.${userId}`];
      if (storeName) {
        conditions.push(`sender_name.eq.${storeName}`);
      }
      
      q = q.or(conditions.join(','));
      
      // 如果指定了结算状态
      if (settled !== undefined) {
        if (settled) {
          q = q.eq('cod_settled', true);
        } else {
          // 处理 cod_settled 为 false 或 null 的情况
          q = q.or('cod_settled.eq.false,cod_settled.is.null');
        }
      }
      
      // 如果指定了月份，添加日期过滤
      if (month) {
        const [year, monthNum] = month.split('-');
        const startDate = `${year}-${monthNum}-01`;
        const endDate = new Date(parseInt(year), parseInt(monthNum), 0).toISOString().split('T')[0];
        q = q.gte('delivery_time', startDate).lte('delivery_time', endDate);
      }
      
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      const { data, error, count } = await q
        .order('delivery_time', { ascending: false })
        .range(from, to);
      
      if (error) throw error;
      
      const orders = (data || []).map(pkg => ({
        orderId: pkg.id,
        codAmount: pkg.cod_amount || 0,
        deliveryTime: pkg.delivery_time
      }));
      
      // 为了兼容Web端现有调用，直接返回数组，但也返回total以防未来需要
      // 注意：Web端目前期望返回 Promise<Array<...>>，所以这里可能需要改Web端代码或者稍微hack一下
      // 实际上，Web端调用是 const orders = await ...; setCodOrders(orders);
      // 所以我必须返回数组，或者改Web端。
      // 为了简单，我让它返回 { orders, total }，然后去改Web端。
      return { orders, total: count || 0 };
    } catch (error) {
      LoggerService.error('获取代收款订单列表失败:', error);
      return { orders: [], total: 0 };
    }
  }
};

// 广告服务
export const bannerService = {
  // 获取所有启用的广告
  async getActiveBanners(): Promise<Banner[]> {
    try {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) {
        LoggerService.error('获取广告列表失败:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      LoggerService.error('获取广告列表异常:', error);
      return [];
    }
  }
};

// 简化的用户服务（客户端使用）
export interface User {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  password?: string;
  user_type: 'customer' | 'courier';
  created_at?: string;
}

export const userService = {
  // 根据手机号获取用户
  async getUserByPhone(phone: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('phone', phone)
        .eq('user_type', 'customer')
        .single();
      
      if (error || !data) {
        return null;
      }
      return data;
    } catch (err) {
      LoggerService.error('获取用户失败:', err);
      return null;
    }
  },

  // 创建客户
  async createCustomer(userData: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    password?: string;
  }): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([{
          ...userData,
          user_type: 'customer'
        }])
        .select()
        .single();
      
      if (error) {
        LoggerService.error('创建用户失败:', error);
        return null;
      }
      return data;
    } catch (err) {
      LoggerService.error('创建用户异常:', err);
      return null;
    }
  },

  // 更新用户统计（简化版）
  async updateUserStats(userId: string, points: number): Promise<boolean> {
    // 客户端不需要更新统计，直接返回 true
    return true;
  }
};

// 临时订单服务（客户端使用）
export interface PendingOrder {
  id?: string;
  temp_order_id: string;
  sender_name: string;
  sender_phone: string;
  sender_address: string;
  sender_latitude?: number | null;
  sender_longitude?: number | null;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  receiver_latitude?: number | null;
  receiver_longitude?: number | null;
  package_type: string;
  weight: string;
  delivery_speed?: string | null;
  scheduled_delivery_time?: string | null;
  price: number;
  distance: number;
  payment_method: 'qr' | 'cash';
  cod_amount?: number; // 代收款金额
  customer_email?: string | null;
  customer_name?: string | null;
  created_at?: string;
  expires_at?: string;
}

export const pendingOrderService = {
  // 创建临时订单
  async createPendingOrder(orderData: Omit<PendingOrder, 'id' | 'created_at' | 'expires_at'>): Promise<PendingOrder | null> {
    try {
      const { data, error } = await supabase
        .from('pending_orders')
        .insert([{
          ...orderData,
          id: orderData.temp_order_id // 使用temp_order_id作为主键
        }])
        .select()
        .single();
      
      if (error) {
        LoggerService.error('创建临时订单失败:', error);
        return null;
      }
      return data;
    } catch (err) {
      LoggerService.error('创建临时订单异常:', err);
      return null;
    }
  },

  // 根据临时订单ID获取订单
  async getPendingOrderByTempId(tempOrderId: string): Promise<PendingOrder | null> {
    try {
      const { data, error } = await supabase
        .from('pending_orders')
        .select('*')
        .eq('temp_order_id', tempOrderId)
        .single();
      
      if (error || !data) {
        return null;
      }
      return data;
    } catch (err) {
      LoggerService.error('获取临时订单异常:', err);
      return null;
    }
  },

  // 删除临时订单
  async deletePendingOrder(tempOrderId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('pending_orders')
        .delete()
        .eq('temp_order_id', tempOrderId);
      
      if (error) {
        LoggerService.error('删除临时订单失败:', error);
        return false;
      }
      return true;
    } catch (err) {
      LoggerService.error('删除临时订单异常:', err);
      return false;
    }
  }
};

// 系统设置服务（客户端使用）
export const systemSettingsService = {
  // 获取计费规则
  async getPricingSettings(region?: string) {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('settings_key, settings_value')
        .like('settings_key', 'pricing.%');

      if (error) throw error;

      // 默认全局计费
      const settings: any = {
        baseFee: 1500,
        perKmFee: 250,
        weightSurcharge: 150,
        urgentSurcharge: 500,
        oversizeSurcharge: 300,
        scheduledSurcharge: 200,
        fragileSurcharge: 300,
        foodBeverageSurcharge: 300,
        freeKmThreshold: 3,
      };

      if (data && data.length > 0) {
        // 如果指定了区域，优先寻找该区域的配置
        if (region) {
          const regionPrefix = `pricing.${region.toLowerCase()}.`;
          const regionSettings = data.filter(item => item.settings_key.startsWith(regionPrefix));
          
          if (regionSettings.length > 0) {
            regionSettings.forEach((item: any) => {
              const key = item.settings_key.replace(regionPrefix, '');
              const camelKey = key.replace(/_([a-z])/g, (_: string, g: string) => g.toUpperCase());
              let value = item.settings_value;
              if (typeof value === 'string') {
                try { value = JSON.parse(value); } catch { value = parseFloat(value) || 0; }
              }
              settings[camelKey] = typeof value === 'number' ? value : parseFloat(value) || 0;
            });
            return settings;
          }
        }

        // 应用全局默认设置（排除掉其他领区的设置）
        data.forEach((item: any) => {
          if (!item.settings_key.match(/\.(mandalay|yangon|maymyo|naypyidaw|taunggyi|lashio|muse)\./)) {
            const key = item.settings_key.replace('pricing.', '');
            const camelKey = key.replace(/_([a-z])/g, (_: string, g: string) => g.toUpperCase());
            let value = item.settings_value;
            if (typeof value === 'string') {
              try { value = JSON.parse(value); } catch { value = parseFloat(value) || 0; }
            }
            settings[camelKey] = typeof value === 'number' ? value : parseFloat(value) || 0;
          }
        });
      }

      return settings;
    } catch (error) {
      LoggerService.error('获取计费设置异常:', error);
      return {
        baseFee: 1500,
        perKmFee: 250,
        weightSurcharge: 150,
        urgentSurcharge: 500,
        oversizeSurcharge: 300,
        scheduledSurcharge: 200,
        fragileSurcharge: 300,
        foodBeverageSurcharge: 300,
        freeKmThreshold: 3
      };
    }
  }
};

// 测试连接（简化版）
export const testConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('packages').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
};

