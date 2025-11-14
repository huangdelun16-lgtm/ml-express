import { createClient } from '@supabase/supabase-js';

// 使用环境变量，如果不存在则回退到硬编码（仅用于开发环境）
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://uopkyuluxnrewvlmutam.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcGt5dWx1eG5yZXd2bG11dGFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDMwMDAsImV4cCI6MjA3NDYxOTAwMH0._6AilDWJcevT-qo90f6wInAKw3aKn2a8jIM8BEGQ3rY';

if (!process.env.REACT_APP_SUPABASE_URL || !process.env.REACT_APP_SUPABASE_ANON_KEY) {
  console.warn('⚠️ 警告：使用硬编码的 Supabase 密钥。生产环境应使用环境变量。');
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
        console.error('获取包裹列表失败:', error);
        return [];
      }
      
      return data || [];
    } catch (err) {
      console.error('获取包裹列表异常:', err);
      return [];
    }
  },

  // 创建新包裹
  async createPackage(packageData: Omit<Package, 'id' | 'created_at' | 'updated_at'>): Promise<Package | null> {
    try {
      console.log('尝试创建包裹:', packageData);
      
      const { data, error } = await supabase
        .from('packages')
        .insert([packageData])
        .select()
        .single();
      
      if (error) {
        console.error('【Supabase错误】创建包裹失败:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw new Error(`数据库错误: ${error.message} (代码: ${error.code})`);
      }
      
      console.log('包裹创建成功:', data);
      return data;
    } catch (err: any) {
      console.error('【服务层异常】创建包裹时发生未知错误:', err);
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
        console.error('获取包裹详情失败:', error);
        return null;
      }
      
      return data;
    } catch (err) {
      console.error('获取包裹详情异常:', err);
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
      console.error('搜索包裹异常:', err);
      return null;
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
      console.error('获取用户失败:', err);
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
        console.error('创建用户失败:', error);
        return null;
      }
      return data;
    } catch (err) {
      console.error('创建用户异常:', err);
      return null;
    }
  },

  // 更新用户统计（简化版）
  async updateUserStats(userId: string, points: number): Promise<boolean> {
    // 客户端不需要更新统计，直接返回 true
    return true;
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

