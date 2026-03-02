import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import LoggerService from './../services/LoggerService';
import NotificationService from './notificationService';
import { errorService } from './ErrorService';
import { retry } from '../utils/retry';

// 使用环境变量配置 Supabase
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// 关键：不要在顶层 throw 错误，这会导致整个 JS Bundle 崩溃，从而出现白屏
if (!supabaseUrl || !supabaseKey) {
  LoggerService.error('Supabase 环境变量未配置！请检查 EXPO_PUBLIC_SUPABASE_URL 和 EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

// 即使没有环境变量也创建客户端（它会报错但不会导致 Bundle 级崩溃）
// 或者可以使用一个占位符 URL 以防止 createClient 崩溃
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseKey || 'placeholder-key'
);

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
  balance?: number; // 🚀 新增：账户余额
  rating: number;
  notes: string;
  created_at?: string;
  updated_at?: string;
}

// 客户接口（兼容旧代码）
export interface Customer extends User {}

// 商店接口
export interface DeliveryStore {
  id: string;
  store_name: string;
  store_code?: string;
  address: string;
  phone: string;
  manager_phone?: string;
  store_type: string;
  status: string;
  operating_hours?: string;
  is_closed_today?: boolean;
  latitude?: number;
  longitude?: number;
  created_at?: string;
  updated_at?: string;
  vacation_dates?: string[]; // 🚀 新增：休假日期列表 (YYYY-MM-DD)
}

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
  delivery_store_id?: string; // 🚀 新增：配送店ID
}

// 商店评价接口
export interface StoreReview {
  id: string;
  store_id: string;
  order_id: string;
  user_id: string;
  user_name: string;
  rating: number;
  comment: string;
  images: string[];
  reply_text?: string;
  replied_at?: string;
  is_anonymous: boolean;
  status: 'pending' | 'published' | 'hidden';
  created_at?: string;
  updated_at?: string;
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

// 常用地址接口
export interface AddressItem {
  id?: string;
  user_id: string;
  label: string;
  contact_name: string;
  contact_phone: string;
  address_text: string;
  latitude?: number;
  longitude?: number;
  is_default?: boolean;
}

// 通知接口
export interface UserNotification {
  id: string;
  user_id: string;
  title: string;
  content: string;
  type: 'system' | 'order' | 'promotion';
  is_read: boolean;
  related_id?: string;
  created_at: string;
}

// 商品接口
export interface Product {
  id: string;
  store_id: string;
  category_id?: string;
  name: string;
  description?: string;
  price: number;
  original_price?: number;
  image_url?: string;
  stock: number;
  is_available: boolean;
  sales_count: number;
  created_at?: string;
  updated_at?: string;
}

// 商品分类接口
export interface ProductCategory {
  id: string;
  store_id: string;
  name: string;
  display_order: number;
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
        LoggerService.error('注册失败:', error);
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
  }, userType: string = 'customer') {
    try {
      const isMerchant = userType === 'merchant';
      const table = isMerchant ? 'delivery_stores' : 'users';
      
      // 🚀 核心改进：显式构建 payload，绝不包含任何多余字段
      const payload: any = {};
      
      if (isMerchant) {
        // 商家表映射
        if (updateData.name) payload.store_name = updateData.name;
        if (updateData.phone) payload.phone = updateData.phone; // 数据库列名是 phone
        if (updateData.email) payload.email = updateData.email;
        if (updateData.address) payload.address = updateData.address;
      } else {
        // 客户表映射
        if (updateData.name) payload.name = updateData.name;
        if (updateData.phone) payload.phone = updateData.phone;
        if (updateData.email) payload.email = updateData.email;
        if (updateData.address) payload.address = updateData.address;
      }

      console.log(`[updateUser] 正在更新 ${table} 表, 载荷:`, payload);

      const { data, error } = await supabase
        .from(table)
        .update(payload)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        LoggerService.error(`更新用户信息失败 (${table}):`, error);
        throw error;
      }

      // 映射返回数据
      const resultData = { ...data };
      if (isMerchant) {
        resultData.name = data.store_name;
        // phone 已经是 data.phone
      }

      return { success: true, data: resultData };
    } catch (error: any) {
      LoggerService.error('更新用户信息失败:', error);
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
      LoggerService.error('获取客户信息失败:', error);
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
      LoggerService.error('更新客户信息失败:', error);
      return false;
    }
  },

  // 修改密码
  async changePassword(userId: string, oldPassword: string, newPassword: string, userType: string = 'customer') {
    try {
      const table = userType === 'merchant' ? 'delivery_stores' : 'users';
      
      // 1. 验证旧密码
      const { data: user, error: findError } = await supabase
        .from(table)
        .select('password')
        .eq('id', userId)
        .single();

      if (findError) {
        LoggerService.error(`[changePassword] 查找用户失败 (${table}):`, findError);
        throw findError;
      }

      if (user.password !== oldPassword) {
        return { 
          success: false, 
          error: { message: '原密码错误' }
        };
      }

      // 2. 更新密码
      const { error: updateError } = await supabase
        .from(table)
        .update({ password: newPassword })
        .eq('id', userId);

      if (updateError) {
        LoggerService.error(`[changePassword] 更新密码失败 (${table}):`, updateError);
        throw updateError;
      }

      return { success: true };
    } catch (error: any) {
      LoggerService.error('修改密码异常:', error);
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
      LoggerService.error('重置密码失败:', error);
      return { 
        success: false, 
        error: { message: error.message || '重置密码失败' }
      };
    }
  },

  // 注销账号 (Account Deletion - iOS App Store Requirement)
  async deleteAccount(userId: string) {
    try {
      // 1. 检查是否有进行中的订单
      const { data: activeOrders, error: orderError } = await supabase
        .from('packages')
        .select('id')
        .or(`description.ilike.%[客户ID: ${userId}]%,customer_id.eq.${userId}`)
        .in('status', ['待取件', '已取件', '配送中']);

      if (orderError && orderError.code !== 'PGRST116') {
        LoggerService.warn('检查订单状态时出错:', orderError);
      }

      if (activeOrders && activeOrders.length > 0) {
        return { 
          success: false, 
          error: { message: '您还有正在进行中的订单，请等待订单完成后再注销账号' }
        };
      }

      // 2. 删除用户记录
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (deleteError) {
        LoggerService.error('删除用户记录失败:', deleteError);
        throw deleteError;
      }

      return { success: true };
    } catch (error: any) {
      LoggerService.error('注销账号失败:', error);
      return { 
        success: false, 
        error: { message: error.message || '注销账号失败，请稍后重试' }
      };
    }
  },
};

// 地址簿服务
export const addressService = {
  async getAddresses(userId: string): Promise<AddressItem[]> {
    try {
      const { data, error } = await supabase
        .from('address_book')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      LoggerService.error('获取地址列表失败:', error);
      return [];
    }
  },

  async addAddress(address: AddressItem) {
    try {
      // 如果设置为默认，先取消其他默认
      if (address.is_default) {
        await supabase
          .from('address_book')
          .update({ is_default: false })
          .eq('user_id', address.user_id);
      }

      const { data, error } = await supabase
        .from('address_book')
        .insert([address])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      LoggerService.error('添加地址失败:', error);
      return { success: false, error };
    }
  },

  async updateAddress(id: string, address: Partial<AddressItem>) {
    try {
      if (address.is_default && address.user_id) {
        await supabase
          .from('address_book')
          .update({ is_default: false })
          .eq('user_id', address.user_id);
      }

      const { data, error } = await supabase
        .from('address_book')
        .update(address)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      LoggerService.error('更新地址失败:', error);
      return { success: false, error };
    }
  },

  async deleteAddress(id: string) {
    try {
      const { error } = await supabase
        .from('address_book')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      LoggerService.error('删除地址失败:', error);
      return { success: false, error };
    }
  }
};

// 配送店/合伙商户服务
export const deliveryStoreService = {
  async getActiveStores() {
    try {
      const { data, error } = await supabase
        .from('delivery_stores')
        .select('*')
        .eq('status', 'active')
        .order('store_name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      LoggerService.error('获取配送店列表失败:', error);
      return [];
    }
  },

  async getStoreById(storeId: string) {
    try {
      const { data, error } = await supabase
        .from('delivery_stores')
        .select('*')
        .eq('id', storeId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      LoggerService.error('获取店铺详情失败:', error);
      return null;
    }
  },

  async updateStoreInfo(storeId: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from('delivery_stores')
        .update(updates)
        .eq('id', storeId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      LoggerService.error('更新商店信息失败:', error);
      return { success: false, error };
    }
  }
};

// 用户通知服务
export const userNotificationService = {
  async getNotifications(userId: string): Promise<UserNotification[]> {
    try {
      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      LoggerService.error('获取通知列表失败:', error);
      return [];
    }
  },

  async markAsRead(notificationId: string) {
    try {
      const { error } = await supabase
        .from('user_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
      return true;
    } catch (error) {
      LoggerService.error('标记已读失败:', error);
      return false;
    }
  },

  async markAllAsRead(userId: string) {
    try {
      const { error } = await supabase
        .from('user_notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return true;
    } catch (error) {
      LoggerService.error('全部标记已读失败:', error);
      return false;
    }
  },

  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('user_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      LoggerService.error('获取未读通知数失败:', error);
      return 0;
    }
  }
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
      // LoggerService.debug('开始创建订单，数据：', packageData); // 使用统一日志服务后可移除

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
        status: packageData.status || '待取件',
        delivery_store_id: packageData.delivery_store_id || null, // 🚀 新增：保存配送店ID
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

      // LoggerService.debug('准备插入数据库的数据：', insertData);

      const { data, error } = await supabase
        .from('packages')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      // LoggerService.debug('订单创建成功：', data);
      
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

  // 获取客户最近的订单（支持商家和普通客户）
  async getRecentOrders(userId: string, limit: number = 5, email?: string, phone?: string, userType?: string) {
    try {
      const runQuery = async (includeCustomerId: boolean) => {
        let query = supabase
          .from('packages')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (userType === 'merchant') {
          // 商家：检查 delivery_store_id 或 customer_email (等于store_code)
          const conditions = [`delivery_store_id.eq.${userId}`];
          if (email) conditions.push(`customer_email.eq.${email}`);
          query = query.or(conditions.join(','));
        } else {
          // 普通客户：使用多种方式匹配订单
          const conditions: string[] = [];
          if (includeCustomerId) conditions.push(`customer_id.eq.${userId}`);
          conditions.push(`description.ilike.%[客户ID: ${userId}]%`);
          if (email) conditions.push(`customer_email.eq.${email}`);
          if (phone) conditions.push(`sender_phone.eq.${phone}`);
          query = query.or(conditions.join(','));
        }

        const { data, error } = await query;

        if (error) throw error;
        return data || [];
      };

      try {
        return await runQuery(true);
      } catch (error: any) {
        const message = error?.message || '';
        if (message.includes('customer_id') && message.includes('does not exist')) {
          return await runQuery(false);
        }
        throw error;
      }
    } catch (error) {
      LoggerService.error('获取最近订单失败:', error);
      return [];
    }
  },

  // 获取客户订单统计（通过description匹配）
  // 获取订单统计（针对客户ID、邮箱或手机号）
  // 注意：此方法使用与 getAllOrders 完全相同的查询逻辑，确保统计准确
  async getOrderStats(userId: string, email?: string, phone?: string, userType?: string, storeName?: string) {
    try {
      const runQuery = async (includeCustomerId: boolean) => {
        // 使用与 getAllOrders 完全相同的查询逻辑，但只选择 status 字段用于统计
        let query = supabase
          .from('packages')
          .select('status')
          .order('created_at', { ascending: false });

        if (userType === 'merchant') {
          // 商家：检查 delivery_store_id 或 customer_email (等于store_code)
          // 与 getAllOrders 保持完全一致
          const conditions: string[] = [];
          conditions.push(`delivery_store_id.eq.${userId}`);
          if (email) {
            conditions.push(`customer_email.eq.${email}`);
          }
          if (storeName) {
            conditions.push(`sender_name.eq.${storeName}`);
          }
          if (conditions.length > 0) {
            query = query.or(conditions.join(','));
          }
        } else {
          // 普通客户：使用与 getAllOrders 完全相同的查询逻辑
          const conditions: string[] = [];
          if (includeCustomerId) conditions.push(`customer_id.eq.${userId}`);
          conditions.push(`description.ilike.%[客户ID: ${userId}]%`);
          if (email) {
            conditions.push(`customer_email.eq.${email}`);
          }
          if (phone) {
            conditions.push(`sender_phone.eq.${phone}`);
          }
          query = query.or(conditions.join(','));
        }

        const { data, error } = await query;

        if (error) {
          LoggerService.error('获取订单统计失败:', error);
          throw error;
        }

        const stats = {
          total: data?.length || 0,
          pending: data?.filter(p => ['待确认', '待取件', '待收款'].includes(p.status)).length || 0,
          inTransit: data?.filter(p => ['已取件', '配送中'].includes(p.status)).length || 0,
          delivered: data?.filter(p => p.status === '已送达').length || 0,
          cancelled: data?.filter(p => p.status === '已取消').length || 0,
        };

        return stats;
      };

      try {
        return await runQuery(true);
      } catch (error: any) {
        const message = error?.message || '';
        if (message.includes('customer_id') && message.includes('does not exist')) {
          return await runQuery(false);
        }
        throw error;
      }
    } catch (error) {
      LoggerService.error('获取订单统计失败:', error);
      return {
        total: 0,
        pending: 0,
        inTransit: 0,
        delivered: 0,
        cancelled: 0,
      };
    }
  },

  // 获取商家代收款统计
  async getMerchantStats(userId: string, storeName?: string, month?: string) {
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

      const statsData = (data || []) as any[];
      const totalCOD = statsData.reduce((sum, pkg) => sum + (pkg.cod_amount || 0), 0) || 0;
      
      // 如果没有 cod_settled 字段，data 中该属性为 undefined，!undefined 为 true，即默认未结清
      const settledPackages = statsData.filter(pkg => pkg.cod_settled) || [];
      const settledCOD = settledPackages.reduce((sum, pkg) => sum + (pkg.cod_amount || 0), 0);
      
      const unclearedPackages = statsData.filter(pkg => !pkg.cod_settled) || [];
      const unclearedCOD = unclearedPackages.reduce((sum, pkg) => sum + (pkg.cod_amount || 0), 0);
      const unclearedCount = unclearedPackages.length;
      
      // 计算最后结清日期
      const settledWithDatePackages = statsData.filter(pkg => pkg.cod_settled && pkg.cod_settled_at) || [];
      let lastSettledAt = null;
      if (settledWithDatePackages.length > 0) {
        settledWithDatePackages.sort((a, b) => new Date(b.cod_settled_at!).getTime() - new Date(a.cod_settled_at!).getTime());
        lastSettledAt = settledWithDatePackages[0].cod_settled_at || null;
      }

      return {
        totalCOD: totalCOD || 0,
        settledCOD: settledCOD || 0,
        unclearedCOD: unclearedCOD || 0,
        unclearedCount: unclearedCount || 0,
        lastSettledAt: lastSettledAt
      };
    } catch (error) {
      LoggerService.error('获取商家统计失败:', error);
      return {
        totalCOD: 0,
        settledCOD: 0,
        unclearedCOD: 0,
        unclearedCount: 0,
        lastSettledAt: null
      };
    }
  },

  // 获取指定月份的有代收款的订单列表
  async getMerchantCODOrders(userId: string, storeName?: string, month?: string, settled?: boolean, page: number = 1, pageSize: number = 20) {
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
      
      LoggerService.debug(`[getMerchantCODOrders] Fetched ${data?.length} orders, total count: ${count}`);
      
      const orders = (data || []).map(pkg => ({
        orderId: pkg.id,
        codAmount: pkg.cod_amount || 0,
        deliveryTime: pkg.delivery_time
      }));
      
      return { orders, total: count || 0 };
    } catch (error) {
      LoggerService.error('获取代收款订单列表失败:', error);
      return { orders: [], total: 0 };
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
      LoggerService.error('获取订单详情失败:', error);
      return null;
    }
  },

  // 追踪订单（通过包裹ID）
  async trackOrder(trackingCode: string) {
    try {
      LoggerService.debug('正在查询订单:', trackingCode);
      
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('id', trackingCode.trim())
        .maybeSingle();

      LoggerService.debug('查询结果:', { data, error });

      if (error && error.code !== 'PGRST116') {
        LoggerService.error('Supabase查询错误:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      LoggerService.error('追踪订单失败:', error);
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
      LoggerService.error('取消订单失败:', error);
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
      LoggerService.error('评价订单失败:', error);
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
      LoggerService.error('获取追踪历史失败:', error);
      return [];
    }
  },

  // 获取所有订单（带筛选和分页，通过description匹配）
  // 获取所有订单（支持分页和筛选，支持商家）
  async getAllOrders(userId: string, options?: {
    status?: string;
    limit?: number;
    offset?: number;
    email?: string;
    phone?: string;
    userType?: string;
    storeName?: string; // 商家店铺名称，用于匹配 sender_name
  }) {
    try {
      const runQuery = async (includeCustomerId: boolean) => {
        let query = supabase
          .from('packages')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false });

        if (options?.userType === 'merchant') {
          // 商家订单查询：优先使用 delivery_store_id，如果没有则通过 sender_name 匹配
          const conditions: string[] = [];
          conditions.push(`delivery_store_id.eq.${userId}`);
          if (options.storeName) {
            conditions.push(`sender_name.eq.${options.storeName}`);
          }
          if (options.email) {
            conditions.push(`customer_email.eq.${options.email}`);
          }
          if (conditions.length > 0) {
            query = query.or(conditions.join(','));
          }
        } else {
          // 普通客户查询：使用多种方式匹配订单
          const conditions: string[] = [];
          if (includeCustomerId) {
            conditions.push(`customer_id.eq.${userId}`);
          }
          conditions.push(`description.ilike.%[客户ID: ${userId}]%`);
          if (options?.email) {
            conditions.push(`customer_email.eq.${options.email}`);
          }
          if (options?.phone) {
            conditions.push(`sender_phone.eq.${options.phone}`);
          }
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
      };

      try {
        return await runQuery(true);
      } catch (error: any) {
        const message = error?.message || '';
        if (message.includes('customer_id') && message.includes('does not exist')) {
          return await runQuery(false);
        }
        throw error;
      }
    } catch (error) {
      LoggerService.error('获取订单列表失败:', error);
      return { orders: [], total: 0 };
    }
  },
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
      LoggerService.error('获取系统设置失败:', error);
      return null;
    }
  },

  // 获取计费规则
  async getPricingSettings(region?: string) {
    return retry(async () => {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('settings_key, settings_value')
          .like('settings_key', 'pricing.%');

        if (error) throw error;

        // 默认全局计费
        const settings: any = {
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

        // 如果指定了区域，尝试寻找该区域的配置
        if (region) {
          const regionPrefix = `pricing.${region.toLowerCase()}.`;
          const regionSettings = data?.filter(item => item.settings_key.startsWith(regionPrefix));
          
          if (regionSettings && regionSettings.length > 0) {
            regionSettings.forEach((item: any) => {
              const key = item.settings_key.replace(regionPrefix, '');
              let value = item.settings_value;
              if (typeof value === 'string') {
                try { value = JSON.parse(value); } catch { value = parseFloat(value) || 0; }
              }
              settings[key] = typeof value === 'number' ? value : parseFloat(value) || 0;
            });
            return settings;
          }
        }

        // 如果没有指定区域或没有特殊配置，使用默认的全局配置（排除掉带区域后缀的）
        data?.forEach((item: any) => {
          if (!item.settings_key.match(/\.(mandalay|yangon|maymyo|naypyidaw|taunggyi|lashio|muse)\./)) {
            const key = item.settings_key.replace('pricing.', '');
            let value = item.settings_value;
            if (typeof value === 'string') {
              try { value = JSON.parse(value); } catch { value = parseFloat(value) || 0; }
            }
            settings[key] = typeof value === 'number' ? value : parseFloat(value) || 0;
          }
        });

        return settings;
      } catch (error) {
        throw error;
      }
    }, {
      retries: 3,
      delay: 1000,
      shouldRetry: (error) => error.message?.includes('Network request failed') || error.message?.includes('timeout')
    }).catch(error => {
      errorService.handleError(error, { context: 'systemSettingsService.getPricingSettings', silent: true });
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
    });
  },
};

// 充值服务
export const rechargeService = {
  // 上传充值凭证
  async uploadProof(userId: string, imageUri: string): Promise<string | null> {
    try {
      if (!imageUri) {
        throw new Error('imageUri is empty');
      }

      const fileName = `recharge_${userId}_${Date.now()}.jpg`;
      console.log('开始准备上传凭证:', imageUri);
      
      // 🚀 确保 URI 格式正确
      let formattedUri = imageUri;
      if (!imageUri.startsWith('file://') && !imageUri.startsWith('content://')) {
        formattedUri = Platform.OS === 'ios' ? `file://${imageUri}` : imageUri;
      }
      
      console.log('正在读取图片并转换为字节流...', formattedUri);
      
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
        throw new Error('读取图片内容为空');
      }

      console.log('二进制转换成功，字节数:', bytes.length);

      // 上传到 storage
      console.log('正在执行 Supabase Storage 上传:', fileName);
      const { error: uploadError } = await supabase.storage
        .from('payment_proofs')
        .upload(fileName, bytes, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) {
        console.error('Supabase Storage 详细错误:', uploadError);
        throw uploadError;
      }

      // 获取公共 URL
      const { data: { publicUrl } } = supabase.storage
        .from('payment_proofs')
        .getPublicUrl(fileName);

      console.log('获取 URL 成功:', publicUrl);
      return publicUrl;
    } catch (error: any) {
      LoggerService.error('uploadProof 核心异常:', error);
      console.error('uploadProof 核心异常详情:', error);
      return null;
    }
  },

  // 创建充值申请
  async createRequest(requestData: {
    user_id: string;
    user_name: string;
    amount: number;
    proof_url: string;
    status: 'pending' | 'completed' | 'rejected';
    notes?: string;
  }) {
    try {
      const { data, error } = await supabase
        .from('recharge_requests')
        .insert([{
          ...requestData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      LoggerService.error('创建充值申请失败:', error?.message || '未知错误');
      return { success: false, error };
    }
  }
};

// 商家服务 (外卖/零售)
export const merchantService = {
  // 获取商店的所有商品
  async getStoreProducts(storeId: string): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      LoggerService.error('获取商店商品失败:', error);
      return [];
    }
  },

  // 获取商店分类
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

  // 添加商品
  async addProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'sales_count'>) {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([product])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      LoggerService.error('添加商品失败:', error);
      return { success: false, error };
    }
  },

  // 更新商品
  async updateProduct(productId: string, updates: Partial<Product>) {
    try {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', productId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      LoggerService.error('更新商品失败:', error);
      return { success: false, error };
    }
  },

  // 删除商品
  async deleteProduct(productId: string) {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      LoggerService.error('删除商品失败:', error);
      return { success: false, error };
    }
  },

  // 更新库存
  async updateStock(productId: string, newStock: number) {
    return this.updateProduct(productId, { stock: newStock });
  },

  // 上下架切换
  async toggleAvailability(productId: string, isAvailable: boolean) {
    return this.updateProduct(productId, { is_available: isAvailable });
  },

  // 上传商品图片
  async uploadProductImage(storeId: string, imageUri: string): Promise<string | null> {
    try {
      if (!imageUri) {
        throw new Error('imageUri is empty');
      }

      const fileName = `${storeId}/${Date.now()}.jpg`;
      console.log('开始准备上传商品图片:', imageUri);
      
      // 🚀 确保 URI 格式正确
      let formattedUri = imageUri;
      if (!imageUri.startsWith('file://') && !imageUri.startsWith('content://')) {
        formattedUri = Platform.OS === 'ios' ? `file://${imageUri}` : imageUri;
      }
      
      console.log('正在读取商品图片并转换为字节流...', formattedUri);
      
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
        throw new Error('读取商品图片内容为空');
      }

      console.log('二进制转换成功，字节数:', bytes.length);

      // 上传到 storage
      console.log('正在执行 Supabase Storage 商品图片上传:', fileName);
      const { error: uploadError } = await supabase.storage
        .from('product_images')
        .upload(fileName, bytes, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) {
        console.error('Supabase Storage 商品图片详细错误:', uploadError);
        throw uploadError;
      }

      // 获取公共 URL
      const { data: { publicUrl } } = supabase.storage
        .from('product_images')
        .getPublicUrl(fileName);

      console.log('获取商品图片 URL 成功:', publicUrl);
      return publicUrl;
    } catch (error: any) {
      LoggerService.error('uploadProductImage 核心异常:', error);
      console.error('uploadProductImage 核心异常详情:', error);
      return null;
    }
  },

  // 🚀 新增：搜索商品
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
        .limit(20);

      if (error) throw error;
      return data || [];
    } catch (error) {
      LoggerService.error('搜索商品失败:', error);
      return [];
    }
  }
};

// 评价服务
export const reviewService = {
  // 提交评价
  async createReview(reviewData: Omit<StoreReview, 'id' | 'created_at' | 'updated_at' | 'status'>) {
    try {
      const { data, error } = await supabase
        .from('store_reviews')
        .insert([{
          ...reviewData,
          status: 'published',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
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
