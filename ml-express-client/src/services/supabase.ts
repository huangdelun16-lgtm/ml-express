import { createClient } from '@supabase/supabase-js';
import NotificationService from './notificationService';
import { errorService } from './ErrorService';
import { retry } from '../utils/retry';

// 使用环境变量配置 Supabase
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('EXPO_PUBLIC_SUPABASE_URL 和 EXPO_PUBLIC_SUPABASE_ANON_KEY 环境变量必须配置！');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// 用户接口（与Web端users表对应）
export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  password?: string;
  user_type: 'customer' | 'courier' | 'admin';
  status: 'active' | 'inactive' | 'suspended';
  registration_date: string;
  last_login: string;
  total_orders: number;
  total_spent: number;
  rating: number;
  notes: string;
  created_at?: string;
  updated_at?: string;
}

// 客户接口（兼容旧代码）
export interface Customer extends User {}

// 包裹接口
export interface Package {
  id: string;
  customer_id: string;
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
  price: string;
  status: string;
  courier?: string;
  delivery_speed?: string;
  scheduled_delivery_time?: string;
  qr_code?: string;
  created_at: string;
  pickup_time?: string;
  delivery_time?: string;
  delivery_distance?: number;
  customer_rating?: number;
  customer_comment?: string;
  rating_time?: string;
  payment_method?: 'qr' | 'cash'; // 支付方式：qr=二维码支付，cash=现金支付
  cod_amount?: number; // 代收款金额
}

// 客户服务（使用users表）
export const customerService = {
  // 注册客户
  async register(customerData: {
    name: string;
    email: string;
    phone: string;
    password: string;
    address?: string;
  }) {
    try {
      // 1. 检查邮箱是否已存在
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', customerData.email)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingUser) {
        return { 
          success: false, 
          error: { message: '该邮箱已被注册' }
        };
      }

      // 2. 检查手机号是否已存在
      const { data: existingPhone, error: phoneCheckError } = await supabase
        .from('users')
        .select('id, phone')
        .eq('phone', customerData.phone)
        .maybeSingle();

      if (phoneCheckError && phoneCheckError.code !== 'PGRST116') {
        throw phoneCheckError;
      }

      if (existingPhone) {
        return { 
          success: false, 
          error: { message: '该手机号已被注册' }
        };
      }

      // 3. 生成用户ID
      const newId = `USR${Date.now().toString().slice(-8)}`;
      
      // 4. 创建用户记录
      const userData = {
        id: newId,
        name: customerData.name,
        phone: customerData.phone,
        email: customerData.email,
        address: customerData.address || '',
        password: customerData.password, // 注意：实际项目中应该加密
        user_type: 'customer',
        status: 'active',
        registration_date: new Date().toLocaleDateString('zh-CN'),
        last_login: '从未登录',
        total_orders: 0,
        total_spent: 0,
        rating: 0,
        notes: '通过客户端APP注册'
      };

      const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single();

      if (error) {
        console.error('注册失败:', error);
        throw error;
      }

      return { success: true, data };
    } catch (error: any) {
      const appError = errorService.handleError(error, { context: 'customerService.register', silent: true });
      return { 
        success: false, 
        error: appError
      };
    }
  },

  // 更新用户信息
  async updateUser(userId: string, updateData: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  }) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('更新用户信息失败:', error);
        throw error;
      }

      return { success: true, data };
    } catch (error: any) {
      console.error('更新用户信息失败:', error);
      return { 
        success: false, 
        error: { message: error.message || '更新失败，请重试' }
      };
    }
  },

  // 登录
  async login(email: string, password: string) {
    try {
      // 1. 查找用户（支持邮箱或手机号登录）
      const { data: userData, error: findError } = await supabase
        .from('users')
        .select('*')
        .or(`email.eq.${email},phone.eq.${email}`)
        .eq('user_type', 'customer')
        .maybeSingle();

      if (findError && findError.code !== 'PGRST116') {
        throw findError;
      }

      if (!userData) {
        return { 
          success: false, 
          error: { message: '用户不存在' }
        };
      }

      // 2. 检查用户状态
      if (userData.status !== 'active') {
        return { 
          success: false, 
          error: { message: '账号已被停用，请联系客服' }
        };
      }

      // 3. 验证密码
      if (userData.password !== password) {
        return { 
          success: false, 
          error: { message: '密码错误' }
        };
      }

      // 4. 更新最后登录时间
      const now = new Date();
      await supabase
        .from('users')
        .update({ 
          last_login: now.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          })
        })
        .eq('id', userData.id);

      // 5. 返回用户信息（不包含密码）
      const { password: _, ...userDataWithoutPassword } = userData;
      return { success: true, data: userDataWithoutPassword };
    } catch (error: any) {
      const appError = errorService.handleError(error, { context: 'customerService.login', silent: true });
      return { 
        success: false, 
        error: appError
      };
    }
  },

  // 获取客户信息
  async getCustomer(customerId: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', customerId)
        .eq('user_type', 'customer')
        .single();

      if (error) throw error;
      
      // 不返回密码
      if (data) {
        const { password: _, ...userDataWithoutPassword } = data;
        return userDataWithoutPassword;
      }
      return null;
    } catch (error) {
      console.error('获取客户信息失败:', error);
      return null;
    }
  },

  // 更新客户信息
  async updateCustomer(customerId: string, updates: Partial<User>) {
    try {
      // 移除不应该直接更新的字段
      const { id, user_type, total_orders, total_spent, rating, created_at, ...allowedUpdates } = updates;
      
      const { error } = await supabase
        .from('users')
        .update(allowedUpdates)
        .eq('id', customerId)
        .eq('user_type', 'customer');

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('更新客户信息失败:', error);
      return false;
    }
  },

  // 修改密码
  async changePassword(customerId: string, oldPassword: string, newPassword: string) {
    try {
      // 1. 验证旧密码
      const { data: user, error: findError } = await supabase
        .from('users')
        .select('password')
        .eq('id', customerId)
        .eq('user_type', 'customer')
        .single();

      if (findError) throw findError;

      if (user.password !== oldPassword) {
        return { 
          success: false, 
          error: { message: '原密码错误' }
        };
      }

      // 2. 更新密码
      const { error: updateError } = await supabase
        .from('users')
        .update({ password: newPassword })
        .eq('id', customerId);

      if (updateError) throw updateError;

      return { success: true };
    } catch (error: any) {
      console.error('修改密码失败:', error);
      return { 
        success: false, 
        error: { message: error.message || '修改密码失败' }
      };
    }
  },

  // 重置密码（通过手机号）
  async resetPassword(phone: string, newPassword: string) {
    try {
      const { data: user, error: findError } = await supabase
        .from('users')
        .select('id')
        .eq('phone', phone)
        .eq('user_type', 'customer')
        .maybeSingle();

      if (findError && findError.code !== 'PGRST116') {
        throw findError;
      }

      if (!user) {
        return { 
          success: false, 
          error: { message: '该手机号未注册' }
        };
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({ password: newPassword })
        .eq('id', user.id);

      if (updateError) throw updateError;

      return { success: true };
    } catch (error: any) {
      console.error('重置密码失败:', error);
      return { 
        success: false, 
        error: { message: error.message || '重置密码失败' }
      };
    }
  },
};

// 包裹服务
export const packageService = {
  // 创建订单
  async createOrder(packageData: {
    customer_id: string;
    sender_name: string;
    sender_phone: string;
    sender_address: string;
    receiver_name: string;
    receiver_phone: string;
    receiver_address: string;
    package_type: string;
    weight: string;
    description?: string;
    price: string;
    delivery_speed?: string;
    scheduled_delivery_time?: string;
  }) {
    try {
      const { data, error } = await supabase
        .from('packages')
        .insert([{
          ...packageData,
          status: '待取件',
        }])
        .select()
        .single();

      if (error) throw error;
      
      // 更新用户订单统计
      const { data: user } = await supabase
        .from('users')
        .select('total_orders, total_spent')
        .eq('id', packageData.customer_id)
        .single();

      if (user) {
        await supabase
          .from('users')
          .update({
            total_orders: (user.total_orders || 0) + 1,
            total_spent: (user.total_spent || 0) + parseFloat(packageData.price || '0')
          })
          .eq('id', packageData.customer_id);
      }

      return { success: true, data };
    } catch (error) {
      const appError = errorService.handleError(error, { context: 'packageService.createOrder', silent: true });
      return { success: false, error: appError };
    }
  },

  // createPackage 别名（为了兼容性，接受完整的包裹数据）
  async createPackage(packageData: any) {
    try {
      // console.log('开始创建订单，数据：', packageData); // 使用统一日志服务后可移除

      // 提取需要的字段并添加默认值
      // 注意：packages表没有customer_id字段，我们将客户ID添加到description中
      const customerNote = packageData.customer_id ? `[客户ID: ${packageData.customer_id}]` : '';
      const fullDescription = `${customerNote} ${packageData.description || ''}`.trim();

      const insertData: any = {
        // 添加 customer_id 和 customer_email (需先运行数据库迁移脚本)
        customer_id: packageData.customer_id,
        customer_email: packageData.customer_email,
        sender_name: packageData.sender_name,
        sender_phone: packageData.sender_phone,
        sender_address: packageData.sender_address,
        sender_latitude: packageData.sender_latitude,
        sender_longitude: packageData.sender_longitude,
        receiver_name: packageData.receiver_name,
        receiver_phone: packageData.receiver_phone,
        receiver_address: packageData.receiver_address,
        receiver_latitude: packageData.receiver_latitude,
        receiver_longitude: packageData.receiver_longitude,
        package_type: packageData.package_type,
        weight: packageData.weight,
        description: fullDescription, // 将客户ID包含在描述中 (保留用于兼容旧数据)
        price: String(packageData.price || '0'), // 确保是字符串
        delivery_speed: packageData.delivery_speed || '准时达',
        scheduled_delivery_time: packageData.scheduled_delivery_time || null,
        delivery_distance: packageData.delivery_distance || 0,
        status: '待取件',
        create_time: packageData.create_time || new Date().toLocaleString('zh-CN'),
        pickup_time: '',
        delivery_time: '',
        courier: '待分配',
        payment_method: packageData.payment_method || 'cash', // 添加支付方式
        cod_amount: packageData.cod_amount || 0, // 添加代收款
      };

      // 如果提供了自定义ID，使用它
      if (packageData.id) {
        insertData.id = packageData.id;
      }

      // console.log('准备插入数据库的数据：', insertData);

      const { data, error } = await supabase
        .from('packages')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      // console.log('订单创建成功：', data);
      
      // 更新用户订单统计（如果提供了customer_id）
      if (packageData.customer_id) {
        try {
          const { data: user } = await supabase
            .from('users')
            .select('total_orders, total_spent')
            .eq('id', packageData.customer_id)
            .single();

          if (user) {
            await supabase
              .from('users')
              .update({
                total_orders: (user.total_orders || 0) + 1,
                total_spent: (user.total_spent || 0) + parseFloat(packageData.price || '0')
              })
              .eq('id', packageData.customer_id);
          }
        } catch (updateError) {
          // 统计更新失败不影响订单创建，仅记录
          errorService.handleError(updateError, { context: 'createPackage.updateStats', silent: true });
        }
      }

      // 发送订单创建通知
      try {
        const notificationService = NotificationService.getInstance();
        await notificationService.sendOrderUpdateNotification({
          orderId: data.id,
          status: '待取件',
          customerName: packageData.sender_name,
          customerPhone: packageData.sender_phone,
        });
      } catch (notificationError) {
        errorService.handleError(notificationError, { context: 'createPackage.sendNotification', silent: true });
      }

      return { success: true, data };
    } catch (error: any) {
      const appError = errorService.handleError(error, { context: 'packageService.createPackage', silent: true });
      return { 
        success: false, 
        error: appError 
      };
    }
  },

  // 获取客户的所有订单（通过description中的客户ID匹配）
  async getCustomerOrders(customerId: string) {
    return retry(async () => {
      try {
        const { data, error } = await supabase
          .from('packages')
          .select('*')
          .ilike('description', `%[客户ID: ${customerId}]%`)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
      } catch (error) {
        throw error; // 抛出错误以触发重试
      }
    }, {
      retries: 2,
      delay: 1000,
      shouldRetry: (error) => error.message?.includes('Network request failed') || error.message?.includes('timeout')
    }).catch(error => {
      errorService.handleError(error, { context: 'packageService.getCustomerOrders', silent: true });
      return [];
    });
  },

  // 获取客户最近的订单（支持合伙人和普通客户）
  async getRecentOrders(userId: string, limit: number = 5, email?: string, phone?: string, userType?: string) {
    try {
      let query = supabase
        .from('packages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (userType === 'partner') {
        // 合伙人：检查 delivery_store_id 或 customer_email (等于store_code)
        const conditions = [`delivery_store_id.eq.${userId}`];
        if (email) conditions.push(`customer_email.eq.${email}`);
        
        query = query.or(conditions.join(','));
      } else {
        // 普通客户
        const conditions = [`customer_id.eq.${userId}`];
        if (email) conditions.push(`customer_email.eq.${email}`);
        // 兼容旧数据：检查description
        conditions.push(`description.ilike.%[客户ID: ${userId}]%`);
        
        query = query.or(conditions.join(','));
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('获取最近订单失败:', error);
      return [];
    }
  },

  // 获取客户订单统计（通过description匹配）
  // 获取订单统计（针对客户ID、邮箱或手机号）
  async getOrderStats(userId: string, email?: string, phone?: string, userType?: string) {
    try {
      let query = supabase
        .from('packages')
        .select('status, description');

      if (userType === 'partner') {
        // 合伙人：检查 delivery_store_id 或 customer_email (等于store_code)
        const conditions = [`delivery_store_id.eq.${userId}`];
        if (email) conditions.push(`customer_email.eq.${email}`);
        
        // 使用 OR 连接条件
        query = query.or(conditions.join(','));
      } else {
        // 普通客户：检查 customer_id 或 邮箱 或 手机号 或 description中的ID
        const conditions = [`customer_id.eq.${userId}`];
        if (email) conditions.push(`customer_email.eq.${email}`);
        if (phone) conditions.push(`sender_phone.eq.${phone}`);
        conditions.push(`description.ilike.%[客户ID: ${userId}]%`);
        
        query = query.or(conditions.join(','));
      }

      const { data, error } = await query;

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        pending: data?.filter(p => p.status === '待取件').length || 0,
        inTransit: data?.filter(p => ['已取件', '配送中'].includes(p.status)).length || 0,
        delivered: data?.filter(p => p.status === '已送达').length || 0,
        cancelled: data?.filter(p => p.status === '已取消').length || 0,
      };

      return stats;
    } catch (error) {
      console.error('获取订单统计失败:', error);
      return {
        total: 0,
        pending: 0,
        inTransit: 0,
        delivered: 0,
        cancelled: 0,
      };
    }
  },

  // 根据ID获取订单
  async getOrderById(orderId: string) {
    try {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('获取订单详情失败:', error);
      return null;
    }
  },

  // 追踪订单（通过包裹ID）
  async trackOrder(trackingCode: string) {
    try {
      console.log('正在查询订单:', trackingCode);
      
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('id', trackingCode.trim())
        .maybeSingle();

      console.log('查询结果:', { data, error });

      if (error && error.code !== 'PGRST116') {
        console.error('Supabase查询错误:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('追踪订单失败:', error);
      return null;
    }
  },

  // 取消订单（增强版，带权限检查）
  async cancelOrder(orderId: string, customerId: string) {
    try {
      // 1. 检查订单状态和所有者
      const { data: order, error: checkError } = await supabase
        .from('packages')
        .select('status, description')
        .eq('id', orderId)
        .single();

      if (checkError) throw checkError;

      if (!order) {
        return { success: false, message: '订单不存在' };
      }

      // 2. 从description中提取客户ID（因为packages表没有customer_id字段）
      const customerIdFromDescription = order.description?.match(/\[客户ID: ([^\]]+)\]/)?.[1];
      
      if (customerIdFromDescription !== customerId) {
        return { success: false, message: '无权操作此订单' };
      }

      if (order.status !== '待取件') {
        return { success: false, message: '只有待取件状态的订单可以取消' };
      }

      // 3. 更新状态
      const { error } = await supabase
        .from('packages')
        .update({ 
          status: '已取消',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;
      return { success: true, message: '订单已取消' };
    } catch (error) {
      console.error('取消订单失败:', error);
      return { success: false, message: '取消订单失败' };
    }
  },

  // 评价订单
  async rateOrder(orderId: string, customerId: string, rating: number, comment?: string) {
    try {
      // 1. 检查订单状态和所有者
      const { data: order, error: checkError } = await supabase
        .from('packages')
        .select('status, description, customer_rating')
        .eq('id', orderId)
        .single();

      if (checkError) throw checkError;

      if (!order) {
        return { success: false, message: '订单不存在' };
      }

      // 2. 从description中提取客户ID（因为packages表没有customer_id字段）
      const customerIdFromDescription = order.description?.match(/\[客户ID: ([^\]]+)\]/)?.[1];
      
      if (customerIdFromDescription !== customerId) {
        return { success: false, message: '无权操作此订单' };
      }

      if (order.status !== '已送达') {
        return { success: false, message: '只有已送达的订单可以评价' };
      }

      if (order.customer_rating) {
        return { success: false, message: '该订单已评价过' };
      }

      // 3. 添加评价
      const { error } = await supabase
        .from('packages')
        .update({ 
          customer_rating: rating,
          customer_comment: comment || '',
          rating_time: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;
      return { success: true, message: '评价成功' };
    } catch (error) {
      console.error('评价订单失败:', error);
      return { success: false, message: '评价订单失败' };
    }
  },

  // 获取追踪历史
  async getTrackingHistory(orderId: string) {
    try {
      const { data, error } = await supabase
        .from('tracking_events')
        .select('*')
        .eq('package_id', orderId)
        .order('event_time', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('获取追踪历史失败:', error);
      return [];
    }
  },

  // 获取所有订单（带筛选和分页，通过description匹配）
  // 获取所有订单（支持分页和筛选，支持合伙人）
  async getAllOrders(userId: string, options?: {
    status?: string;
    limit?: number;
    offset?: number;
    email?: string;
    phone?: string;
    userType?: string;
    storeName?: string; // 合伙人店铺名称，用于匹配 sender_name
  }) {
    try {
      let query = supabase
        .from('packages')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (options?.userType === 'partner') {
        // 合伙人订单查询：优先使用 delivery_store_id，如果没有则通过 sender_name 匹配
        const conditions: string[] = [];
        
        // 通过 delivery_store_id 匹配
        conditions.push(`delivery_store_id.eq.${userId}`);
        
        // 如果提供了店铺名称，也通过 sender_name 匹配（兼容旧数据）
        if (options.storeName) {
          // 精确匹配店铺名称
          conditions.push(`sender_name.eq.${options.storeName}`);
        }
        
        if (options.email) {
          conditions.push(`customer_email.eq.${options.email}`);
        }
        
        // 使用 or 查询，匹配任一条件
        if (conditions.length > 0) {
          query = query.or(conditions.join(','));
        }
      } else {
        const conditions = [`customer_id.eq.${userId}`];
        if (options?.email) conditions.push(`customer_email.eq.${options.email}`);
        // 兼容旧数据
        conditions.push(`description.ilike.%[客户ID: ${userId}]%`);
        
        query = query.or(conditions.join(','));
      }

      if (options?.status && options.status !== 'all') {
        query = query.eq('status', options.status);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error, count } = await query;

      if (error) throw error;
      return { orders: data || [], total: count || 0 };
    } catch (error) {
      console.error('获取订单列表失败:', error);
      return { orders: [], total: 0 };
    }
  },
};

// 系统设置服务
export const systemSettingsService = {
  async getSettings() {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('获取系统设置失败:', error);
      return null;
    }
  },

  // 获取计费规则
  async getPricingSettings() {
    return retry(async () => {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('settings_key, settings_value')
          .like('settings_key', 'pricing.%');

        if (error) throw error;

        // 转换为对象格式
        const settings: any = {};
        data?.forEach((item: any) => {
          const key = item.settings_key.replace('pricing.', '');
          // settings_value 可能是 JSON 字符串，需要解析
          let value = item.settings_value;
          if (typeof value === 'string') {
            try {
              value = JSON.parse(value);
            } catch {
              value = parseFloat(value) || 0;
            }
          }
          settings[key] = typeof value === 'number' ? value : parseFloat(value) || 0;
        });

        return {
          base_fee: settings.base_fee || 1000,
          per_km_fee: settings.per_km_fee || 500,
          weight_surcharge: settings.weight_surcharge || 150,
          urgent_surcharge: settings.urgent_surcharge || 1500,
          scheduled_surcharge: settings.scheduled_surcharge || 500,
          oversize_surcharge: settings.oversize_surcharge || 300,
          fragile_surcharge: settings.fragile_surcharge || 400,
          food_beverage_surcharge: settings.food_beverage_surcharge || 300,
          free_km_threshold: settings.free_km_threshold || 3,
        };
      } catch (error) {
        throw error; // 抛出错误以触发重试
      }
    }, {
      retries: 3, // 计费规则很重要，多试几次
      delay: 1000,
      shouldRetry: (error) => error.message?.includes('Network request failed') || error.message?.includes('timeout')
    }).catch(error => {
      errorService.handleError(error, { context: 'systemSettingsService.getPricingSettings', silent: true });
      // 返回默认值
      return {
        base_fee: 1000,
        per_km_fee: 500,
        weight_surcharge: 150,
        urgent_surcharge: 1500,
        scheduled_surcharge: 500,
        oversize_surcharge: 300,
        fragile_surcharge: 400,
        food_beverage_surcharge: 300,
        free_km_threshold: 3,
      };
    });
  },
};
