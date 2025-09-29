import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uopkyuluxnrewvlmutam.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcGt5dWx1eG5yZXd2bG11dGFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDMwMDAsImV4cCI6MjA3NDYxOTAwMH0._6AilDWJcevT-qo90f6wInAKw3aKn2a8jIM8BEGQ3rY';

export const supabase = createClient(supabaseUrl, supabaseKey);

// 包裹数据类型定义 - 匹配数据库字段名
export interface Package {
  id: string;
  sender_name: string;
  sender_phone: string;
  sender_address: string;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  package_type: string;
  weight: string;
  description?: string;
  status: string;
  create_time: string;
  pickup_time: string;
  delivery_time: string;
  courier: string;
  price: string;
  created_at?: string;
  updated_at?: string;
}

export interface FinanceRecord {
  id: string;
  record_type: 'income' | 'expense';
  category: string;
  order_id: string;
  courier_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'cancelled';
  payment_method: string;
  reference?: string;
  record_date: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TrackingEvent {
  id: string;
  package_id: string;
  courier_id?: string;
  status: string;
  latitude: number;
  longitude: number;
  speed?: number;
  battery_level?: number;
  note?: string;
  event_time: string;
  created_at?: string;
}

export interface CourierLocation {
  id: string;
  courier_id: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  last_update: string;
  battery_level?: number;
  status: string;
  created_at?: string;
}

// 测试数据库连接
export const testConnection = async () => {
  try {
    const { error } = await supabase
      .from('packages')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('数据库连接测试失败:', error);
      return false;
    }
    
    console.log('数据库连接测试成功');
    return true;
  } catch (err) {
    console.error('数据库连接异常:', err);
    return false;
  }
};

// 包裹数据库操作
export const packageService = {
  // 获取所有包裹
  async getAllPackages(): Promise<Package[]> {
    try {
      console.log('尝试获取包裹列表...');
      
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('获取包裹列表失败:', error);
        console.error('错误详情:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        return [];
      }
      
      console.log('获取包裹列表成功:', data);
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
        console.error('创建包裹失败:', error);
        console.error('错误详情:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        return null;
      }
      
      console.log('包裹创建成功:', data);
      return data;
    } catch (err) {
      console.error('创建包裹异常:', err);
      return null;
    }
  },

  // 更新包裹状态
  async updatePackageStatus(id: string, status: string, pickupTime?: string, deliveryTime?: string): Promise<boolean> {
    const updateData: any = { status };
    
    if (pickupTime) updateData.pickup_time = pickupTime;
    if (deliveryTime) updateData.delivery_time = deliveryTime;
    
    const { error } = await supabase
      .from('packages')
      .update(updateData)
      .eq('id', id);
    
    if (error) {
      console.error('更新包裹状态失败:', error);
      return false;
    }
    
    return true;
  },

  // 根据ID获取包裹
  async getPackageById(id: string): Promise<Package | null> {
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
  }
};

// 财务数据库操作
export const financeService = {
  async getAllRecords(): Promise<FinanceRecord[]> {
    try {
      const { data, error } = await supabase
        .from('finances')
        .select('*')
        .order('record_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('获取财务记录失败:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('获取财务记录异常:', err);
      return [];
    }
  },

  async createRecord(recordData: Omit<FinanceRecord, 'created_at' | 'updated_at'>): Promise<FinanceRecord | null> {
    try {
      const payload = {
        ...recordData,
        amount: Number(recordData.amount)
      };

      const { data, error } = await supabase
        .from('finances')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error('创建财务记录失败:', error);
        console.error('请求数据:', payload);
        return null;
      }

      return data;
    } catch (err) {
      console.error('创建财务记录异常:', err);
      console.error('请求数据:', recordData);
      return null;
    }
  },

  async updateRecord(id: string, updateData: Partial<FinanceRecord>): Promise<boolean> {
    try {
      const payload: Partial<FinanceRecord> = { ...updateData };
      if (payload.amount !== undefined) {
        payload.amount = Number(payload.amount);
      }

      const { error } = await supabase
        .from('finances')
        .update(payload)
        .eq('id', id);

      if (error) {
        console.error('更新财务记录失败:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('更新财务记录异常:', err);
      return false;
    }
  },

  async deleteRecord(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('finances')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('删除财务记录失败:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('删除财务记录异常:', err);
      return false;
    }
  }
};

export const trackingService = {
  async getActivePackages() {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .in('status', ['待取件', '已取件', '配送中']);

    if (error) {
      console.error('获取实时跟踪包裹失败:', error);
      return [];
    }

    return data || [];
  },

  async getActiveCouriers() {
    const { data, error } = await supabase
      .from('couriers')
      .select('*')
      .eq('status', 'active');

    if (error) {
      console.error('获取在线快递员失败:', error);
      return [];
    }

    return data || [];
  },

  async getCourierLocations(): Promise<CourierLocation[]> {
    const { data, error } = await supabase
      .from('courier_locations')
      .select('*')
      .order('last_update', { ascending: false });

    if (error) {
      console.error('获取快递员位置失败:', error);
      return [];
    }

    return data || [];
  },

  async getTrackingEvents(packageId: string): Promise<TrackingEvent[]> {
    const { data, error } = await supabase
      .from('tracking_events')
      .select('*')
      .eq('package_id', packageId)
      .order('event_time', { ascending: false });

    if (error) {
      console.error('获取包裹轨迹失败:', error);
      return [];
    }

    return data || [];
  },

  async addTrackingEvent(eventData: Omit<TrackingEvent, 'id' | 'created_at'>): Promise<boolean> {
    const { error } = await supabase
      .from('tracking_events')
      .insert([eventData]);

    if (error) {
      console.error('新增轨迹事件失败:', error);
      return false;
    }

    return true;
  },

  async updateCourierLocation(location: Omit<CourierLocation, 'id' | 'created_at'>): Promise<boolean> {
    const { error } = await supabase
      .from('courier_locations')
      .upsert(location, { onConflict: 'courier_id' });

    if (error) {
      console.error('更新快递员位置失败:', error);
      return false;
    }

    return true;
  }
};

// 用户数据库操作
export const userService = {
  // 根据电话查找用户
  async getUserByPhone(phone: string): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('phone', phone)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('查找用户失败:', error);
        return null;
      }
      
      return data;
    } catch (err) {
      console.error('查找用户异常:', err);
      return null;
    }
  },

  // 创建新用户（客户）
  async createCustomer(customerData: {
    name: string;
    phone: string;
    email?: string;
    address: string;
  }): Promise<any | null> {
    try {
      const newId = `USR${Date.now().toString().slice(-6)}`;
      const userData = {
        id: newId,
        name: customerData.name,
        phone: customerData.phone,
        email: customerData.email || '',
        address: customerData.address,
        user_type: 'customer',
        status: 'active',
        registration_date: new Date().toLocaleDateString('zh-CN'),
        last_login: '从未登录',
        total_orders: 0,
        total_spent: 0,
        rating: 0,
        notes: '通过下单自动创建'
      };

      const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single();
      
      if (error) {
        console.error('创建客户失败:', error);
        return null;
      }
      
      console.log('客户创建成功:', data);
      return data;
    } catch (err) {
      console.error('创建客户异常:', err);
      return null;
    }
  },

  // 更新用户订单统计
  async updateUserStats(userId: string, orderValue: number): Promise<boolean> {
    try {
      // 先获取当前用户数据
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('total_orders, total_spent')
        .eq('id', userId)
        .single();
      
      if (fetchError) {
        console.error('获取用户统计失败:', fetchError);
        return false;
      }

      // 更新统计信息
      const { error } = await supabase
        .from('users')
        .update({
          total_orders: (user.total_orders || 0) + 1,
          total_spent: (user.total_spent || 0) + orderValue
        })
        .eq('id', userId);
      
      if (error) {
        console.error('更新用户统计失败:', error);
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('更新用户统计异常:', err);
      return false;
    }
  }
};
