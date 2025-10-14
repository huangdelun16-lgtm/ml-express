import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jdhxmgudwevvmntqvyai.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkaHhtZ3Vkd2V2dm1udHF2eWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM4ODUzNzIsImV4cCI6MjA0OTQ2MTM3Mn0.PvH5UfgXvCHzFvdKZGEn-mAWt9Dc7qZcEDcm2rJkEn0';

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
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
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
      console.error('注册失败:', error);
      return { 
        success: false, 
        error: { message: error.message || '注册失败，请重试' }
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
      console.error('登录失败:', error);
      return { 
        success: false, 
        error: { message: error.message || '登录失败，请重试' }
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
      console.error('创建订单失败:', error);
      return { success: false, error };
    }
  },

  // 获取客户的所有订单
  async getCustomerOrders(customerId: string) {
    try {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('获取订单失败:', error);
      return [];
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

  // 追踪订单（通过包裹ID或QR码）
  async trackOrder(trackingCode: string) {
    try {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .or(`id.eq.${trackingCode},qr_code.eq.${trackingCode}`)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('追踪订单失败:', error);
      return null;
    }
  },

  // 取消订单
  async cancelOrder(orderId: string) {
    try {
      const { error } = await supabase
        .from('packages')
        .update({ status: '已取消' })
        .eq('id', orderId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('取消订单失败:', error);
      return false;
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
};
