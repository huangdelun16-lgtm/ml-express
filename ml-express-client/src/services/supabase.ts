import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jdhxmgudwevvmntqvyai.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkaHhtZ3Vkd2V2dm1udHF2eWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM4ODUzNzIsImV4cCI6MjA0OTQ2MTM3Mn0.PvH5UfgXvCHzFvdKZGEn-mAWt9Dc7qZcEDcm2rJkEn0';

export const supabase = createClient(supabaseUrl, supabaseKey);

// 客户接口
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  created_at: string;
}

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

// 客户服务
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
      const { data, error } = await supabase
        .from('customers')
        .insert([{
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
          password: customerData.password,
          address: customerData.address,
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('注册失败:', error);
      return { success: false, error };
    }
  },

  // 登录
  async login(email: string, password: string) {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('登录失败:', error);
      return { success: false, error };
    }
  },

  // 获取客户信息
  async getCustomer(customerId: string) {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('获取客户信息失败:', error);
      return null;
    }
  },

  // 更新客户信息
  async updateCustomer(customerId: string, updates: Partial<Customer>) {
    try {
      const { error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', customerId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('更新客户信息失败:', error);
      return false;
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

