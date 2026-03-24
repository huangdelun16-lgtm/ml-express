import { createClient } from '@supabase/supabase-js';

// 使用环境变量配置 Supabase（不再使用硬编码密钥）
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 错误：Supabase 环境变量未配置！');
  console.error('请在 Netlify Dashboard 中配置：');
  console.error('  - REACT_APP_SUPABASE_URL');
  console.error('  - REACT_APP_SUPABASE_ANON_KEY');
  throw new Error('REACT_APP_SUPABASE_URL 和 REACT_APP_SUPABASE_ANON_KEY 环境变量必须配置！');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// 包裹数据类型定义 - 匹配数据库字段名
export interface Package {
  id: string;
  sender_name: string;
  sender_phone: string;
  sender_address: string;
  sender_latitude?: number; // 寄件地址纬度
  sender_longitude?: number; // 寄件地址经度
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  receiver_latitude?: number; // 收件地址纬度
  receiver_longitude?: number; // 收件地址经度
  package_type: string;
  weight: string;
  description?: string;
  delivery_speed?: string; // 配送速度（准时达/急送达/定时达）
  scheduled_delivery_time?: string; // 定时达的指定时间
  delivery_distance?: number; // 配送距离（km）
  status: string;
  create_time: string;
  pickup_time: string;
  delivery_time: string;
  courier: string;
  price: string;
  region?: string; // 区域字段：'yangon', 'mandalay', 'other' 等
  created_at?: string;
  updated_at?: string;
  // 新增字段：店铺关联
  delivery_store_id?: string; // 送达店铺ID
  delivery_store_name?: string; // 送达店铺名称
  store_receive_code?: string; // 店铺收件码
  sender_code?: string; // 寄件码（客户提交订单后自动生成的二维码）
  transfer_code?: string; // 中转码（包裹在中转站的唯一标识码）
  payment_method?: 'qr' | 'cash' | 'balance'; // 🚀 支付方式：qr=二维码支付，cash=现金支付, balance=余额支付
  cod_amount?: number; // 代收款金额
  customer_email?: string; // 客户邮箱
  customer_name?: string; // 客户姓名
  // 费用明细字段
  store_fee?: string | number; // 待付款（店铺填写）
  delivery_fee?: string | number; // 跑腿费（客户下单时系统自动生成的费用）
  cod_settled?: boolean; // 代收款是否已结清
  cod_settled_at?: string; // 代收款结清时间
  rider_settled?: boolean; // 骑手是否已结清
  rider_settled_at?: string; // 骑手结清时间
}

export interface Tutorial {
  id?: string;
  title_zh: string;
  title_en?: string;
  title_my?: string;
  content_zh: string;
  content_en?: string;
  content_my?: string;
  image_url?: string;
  display_order?: number;
  is_active?: boolean;
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
  created_by?: string;
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
  signal_strength?: number; // 🚀 新增：网络信号强度 (0-100)
}

export interface SystemSetting {
  id?: string;
  category: string;
  settings_key: string;
  settings_value: any;
  description?: string;
  updated_by?: string;
  updated_at?: string;
}

export interface AdminAccount {
  id?: string;
  username: string;
  password?: string;
  employee_name: string;
  employee_id: string;
  phone: string;
  email: string;
  department: string;
  position: string;
  salary?: number;
  role: 'admin' | 'manager' | 'operator' | 'finance';
  status: 'active' | 'inactive' | 'suspended';
  hire_date: string;
  id_number?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  address?: string;
  notes?: string;
  region?: string; // 员工所属区域
  cv_images?: string[]; // 新增CV图片字段
  permissions?: string[]; // 账号特有权限列表
  created_by?: string;
  last_login?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DeliveryStore {
  id?: string;
  store_name: string;
  store_code: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  email?: string;
  manager_name: string;
  manager_phone: string;
  store_type: 'restaurant' | 'drinks_snacks' | 'breakfast' | 'cake_shop' | 'tea_shop' | 'flower_shop' | 'clothing_store' | 'grocery' | 'hardware_store' | 'supermarket' | 'transit_station' | 'other';
  status: 'active' | 'inactive' | 'maintenance';
  operating_hours: string;
  service_area_radius: number;
  capacity: number;
  current_load: number;
  facilities: string[];
  notes?: string;
  password?: string; // 合伙店铺登录密码
  region?: string; // 店铺所属区域
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  balance?: number; // 🚀 新增：账户余额
  vacation_dates?: string[]; // 🚀 新增：休假日期列表 (YYYY-MM-DD)
  cod_settlement_day?: '7' | '10' | '15' | '30'; // 🚀 新增：COD 结清日
}

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

// 🚀 新增：充值申请接口
export interface RechargeRequest {
  id?: string;
  user_id: string;
  user_name: string;
  amount: number;
  status: 'pending' | 'completed' | 'rejected';
  proof_url?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  register_region?: string; // 🚀 新增：用户所属地区
  user_balance?: number; // 🚀 新增：用户当前余额 (用于判断VIP)
}

// 审计日志数据类型定义
export interface AuditLog {
  id?: string;
  user_id: string;
  user_name: string;
  action_type: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'view' | 'export';
  module: 'packages' | 'users' | 'couriers' | 'finance' | 'settings' | 'accounts' | 'system' | 'delivery_stores';
  target_id?: string;
  target_name?: string;
  action_description: string;
  old_value?: string;
  new_value?: string;
  ip_address?: string;
  user_agent?: string;
  action_time?: string;
  created_at?: string;
}

// 🚀 新增：使用教学服务
export const tutorialService = {
  async getAllTutorials(): Promise<Tutorial[]> {
    try {
      const { data, error } = await supabase
        .from('tutorials')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) {
        console.error('获取教学列表失败:', error);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error('获取教学列表异常:', err);
      return [];
    }
  },

  async createTutorial(tutorial: Omit<Tutorial, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> {
    try {
      const { error } = await supabase.from('tutorials').insert([tutorial]);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('创建教学失败:', err);
      return false;
    }
  },

  async updateTutorial(id: string, tutorial: Partial<Tutorial>): Promise<boolean> {
    try {
      const { error } = await supabase.from('tutorials').update(tutorial).eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('更新教学失败:', err);
      return false;
    }
  },

  async deleteTutorial(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('tutorials').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('删除教学失败:', err);
      return false;
    }
  }
};

// 测试数据库连接
export const testConnection = async () => {
  try {
    // 使用更简单的查询来测试连接
    const { error } = await supabase
      .from('packages')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('数据库连接测试失败:', error);
      return false;
    }
    
    console.log('数据库连接测试成功');
    return true;
  } catch (err) {
    console.error('数据库连接异常:', err);
    // 如果是网络错误，返回false但不阻止应用运行
    if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
      console.warn('网络连接问题，将使用离线模式');
      return false;
    }
    return false;
  }
};

// 包裹数据库操作
export const packageService = {
  // 结清合伙店铺代收款
  async settleMerchantCOD(storeId: string, storeName: string) {
    try {
      const now = new Date().toISOString();
      
      // 1. 更新通过 delivery_store_id 匹配的订单
      const { error: error1 } = await supabase
        .from('packages')
        .update({ 
          cod_settled: true,
          cod_settled_at: now
        })
        .eq('status', '已送达')
        // .is('cod_settled', false) // 处理 null 或 false
        .or('cod_settled.is.false,cod_settled.is.null')
        .gt('cod_amount', 0)
        .eq('delivery_store_id', storeId);

      if (error1) throw error1;

      // 2. 更新通过 sender_name 匹配的订单（兼容旧数据）
      // 仅更新 delivery_store_id 为空的，避免重复操作（虽然幂等操作也无妨）
      const { error: error2 } = await supabase
        .from('packages')
        .update({ 
          cod_settled: true,
          cod_settled_at: now
        })
        .eq('status', '已送达')
        .or('cod_settled.is.false,cod_settled.is.null')
        .gt('cod_amount', 0)
        .is('delivery_store_id', null) 
        .eq('sender_name', storeName);

      if (error2) throw error2;

      return { success: true };
    } catch (error) {
      console.error('结清代收款失败:', error);
      return { success: false, error };
    }
  },

  // 结清骑手现金（包括跑腿费和代收款）
  async settleRiderCash(packageIds: string[]) {
    try {
      if (!packageIds || packageIds.length === 0) return { success: true };

      const { error } = await supabase
        .from('packages')
        .update({ 
          rider_settled: true,
          rider_settled_at: new Date().toISOString()
        })
        .in('id', packageIds);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('结清骑手现金失败:', error);
      return { success: false, error };
    }
  },

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
        console.error('【Supabase错误】创建包裹失败:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        // 抛出错误，以便UI层可以捕获
        throw new Error(`数据库错误: ${error.message} (代码: ${error.code})`);
      }
      
      console.log('包裹创建成功:', data);
      return data;
    } catch (err: any) {
      console.error('【服务层异常】创建包裹时发生未知错误:', err);
      // 重新抛出错误，确保UI层能接收到
      throw err;
    }
  },

  // 更新包裹状态
  async updatePackageStatus(
    id: string, 
    status: string, 
    pickupTime?: string, 
    deliveryTime?: string, 
    courierName?: string,
    transferCode?: string,
    storeInfo?: { storeId: string, storeName: string, receiveCode: string },
    courierLocation?: { latitude: number, longitude: number }
  ): Promise<boolean> {
    console.log('📦 更新包裹状态:', { id, status, pickupTime, deliveryTime, courierName });
    
    const updateData: any = { status };
    
    if (pickupTime) updateData.pickup_time = pickupTime;
    if (deliveryTime) updateData.delivery_time = deliveryTime;
    if (courierName) updateData.courier = courierName;
    if (transferCode) updateData.transfer_code = transferCode;
    
    // 如果是送达状态且有店铺信息，记录店铺关联
    if (status === '已送达' && storeInfo) {
      updateData.delivery_store_id = storeInfo.storeId;
      updateData.delivery_store_name = storeInfo.storeName;
      updateData.store_receive_code = storeInfo.receiveCode;
    }
    
    console.log('📦 更新数据:', updateData);
    
    const { error } = await supabase
      .from('packages')
      .update(updateData)
      .eq('id', id);
    
    if (error) {
      console.error('❌ 更新包裹状态失败:', error);
      console.error('错误详情:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return false;
    }
    
    console.log('✅ 包裹状态更新成功');
    
    // 🚀 新增：自动记录审计日志 (Admin Web)
    try {
      const currentUserId = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser') || 'admin_system';
      const currentUserName = sessionStorage.getItem('currentUserName') || localStorage.getItem('currentUserName') || '系统管理员';
      
      await supabase.from('audit_logs').insert([{
        user_id: currentUserId,
        user_name: currentUserName,
        action_type: 'update',
        module: 'packages',
        target_id: id,
        target_name: `包裹 ${id}`,
        action_description: `更新状态为：${status}${courierName ? ' (分配给骑手: ' + courierName + ')' : ''}`,
        new_value: JSON.stringify({ status, courier: courierName }),
        action_time: new Date().toISOString()
      }]);
    } catch (logError) {
      console.warn('记录管理端审计日志失败:', logError);
    }
    
    // 🔍 如果是完成配送状态，自动检测违规行为
    if (status === '已送达' && courierLocation && courierName) {
      try {
        console.log('🔍 开始检测配送违规行为...', {
          packageId: id,
          courierName,
          courierLocation
        });
        
        // 获取骑手ID
        const { data: courierData } = await supabase
          .from('couriers')
          .select('id')
          .eq('name', courierName)
          .single();
        
        if (courierData) {
          console.log('✅ 找到骑手ID:', courierData.id);
          
          // 异步执行违规检测，不阻塞主流程
          detectViolationsAsync(id, courierData.id, courierLocation.latitude, courierLocation.longitude)
            .catch(error => {
              console.error('❌ 配送违规检测失败:', error);
            });
        } else {
          console.warn('⚠️ 找不到骑手:', courierName);
        }
      } catch (alertError) {
        console.error('❌ 配送警报检测异常:', alertError);
      }
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
  },

  // 获取特定店铺的入库包裹（已送达的）
  async getPackagesByStore(storeId: string): Promise<Package[]> {
    try {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('delivery_store_id', storeId)
        .eq('status', '已送达')
        .order('delivery_time', { ascending: false });

      if (error) {
        console.error(`获取店铺 ${storeId} 包裹失败:`, error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error(`获取店铺 ${storeId} 包裹异常:`, err);
      return [];
    }
  },

  // 获取与店铺相关的所有包裹（包括提交和送达的）
  async getPackagesByStoreId(storeId: string): Promise<Package[]> {
    try {
      // 先获取店铺信息以获取坐标
      const { data: storeData, error: storeError } = await supabase
        .from('delivery_stores')
        .select('latitude, longitude, store_name')
        .eq('id', storeId)
        .single();

      if (storeError || !storeData) {
        console.error(`获取店铺信息失败:`, storeError);
        // 如果获取店铺信息失败，只查询送达店铺的包裹
        const { data, error } = await supabase
          .from('packages')
          .select('*')
          .eq('delivery_store_id', storeId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error(`获取店铺 ${storeId} 包裹失败:`, error);
          return [];
        }

        return data || [];
      }

      // 计算距离函数（公里）
      const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
        const R = 6371; // 地球半径（公里）
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      };

      // 查询所有包裹
      const { data: allPackages, error } = await supabase
        .from('packages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error(`获取包裹列表失败:`, error);
        return [];
      }

      if (!allPackages) {
        return [];
      }

      // 筛选与店铺相关的包裹：
      // 1. 送达店铺ID匹配
      // 2. 或者寄件地址在店铺附近（5公里内）
      const relatedPackages = allPackages.filter(pkg => {
        // 检查是否是送达店铺
        if (pkg.delivery_store_id === storeId) {
          return true;
        }

        // 检查寄件地址是否在店铺附近（5公里内）
        if (pkg.sender_latitude && pkg.sender_longitude) {
          const distance = calculateDistance(
            storeData.latitude,
            storeData.longitude,
            pkg.sender_latitude,
            pkg.sender_longitude
          );
          if (distance <= 5) { // 5公里内
            return true;
          }
        }

        return false;
      });

      return relatedPackages;
    } catch (err) {
      console.error(`获取店铺 ${storeId} 包裹异常:`, err);
      return [];
    }
  },

  // 删除单个包裹
  async deletePackage(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('packages')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('删除包裹失败:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('删除包裹异常:', err);
      return false;
    }
  },

  // 批量删除包裹
  async deletePackages(ids: string[]): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const id of ids) {
      try {
        const { error } = await supabase
          .from('packages')
          .delete()
          .eq('id', id);

        if (error) {
          console.error(`删除包裹 ${id} 失败:`, error);
          failed++;
          errors.push(`${id}: ${error.message}`);
        } else {
          success++;
        }
      } catch (err: any) {
        console.error(`删除包裹 ${id} 异常:`, err);
        failed++;
        errors.push(`${id}: ${err.message || '未知错误'}`);
      }
    }

    return { success, failed, errors };
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
      .in('status', ['待取件', '待收款', '已取件', '配送中']); // 添加'待收款'状态

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
  },

  // 新增：模拟骑手位置上报（用于测试和演示）
  async simulateCourierMovement(courierId: string, packageId?: string): Promise<boolean> {
    try {
      // 仰光市区的一些真实坐标点（模拟配送路线）
      const yangonRoutes = [
        { lat: 16.8661, lng: 96.1951, location: '仰光市政厅' },
        { lat: 16.7967, lng: 96.1610, location: '昂山市场' },
        { lat: 16.8409, lng: 96.1735, location: '苏雷宝塔' },
        { lat: 16.8700, lng: 96.1300, location: '茵雅湖' },
        { lat: 16.8200, lng: 96.1400, location: '皇家湖' },
        { lat: 16.7800, lng: 96.1200, location: '仰光大学' },
        { lat: 16.9000, lng: 96.1800, location: '北奥卡拉帕' },
        { lat: 16.7500, lng: 96.1100, location: '南达贡' }
      ];

      // 随机选择一个位置点
      const randomPoint = yangonRoutes[Math.floor(Math.random() * yangonRoutes.length)];
      
      // 添加一些随机偏移，模拟真实移动
      const lat = randomPoint.lat + (Math.random() - 0.5) * 0.01;
      const lng = randomPoint.lng + (Math.random() - 0.5) * 0.01;

      // 更新骑手位置
      const locationData: Omit<CourierLocation, 'id' | 'created_at'> = {
        courier_id: courierId,
        latitude: lat,
        longitude: lng,
        heading: Math.floor(Math.random() * 360),
        speed: Math.floor(Math.random() * 50) + 10, // 10-60 km/h
        last_update: new Date().toISOString(),
        battery_level: Math.floor(Math.random() * 30) + 70, // 70-100%
        status: 'active'
      };

      await this.updateCourierLocation(locationData);

      // 如果有关联包裹，添加跟踪事件
      if (packageId) {
        const eventData: Omit<TrackingEvent, 'id' | 'created_at'> = {
          package_id: packageId,
          courier_id: courierId,
          status: '配送中',
          latitude: lat,
          longitude: lng,
          speed: locationData.speed,
          battery_level: locationData.battery_level,
          note: `骑手正在 ${randomPoint.location} 附近配送`,
          event_time: new Date().toISOString()
        };

        await this.addTrackingEvent(eventData);
      }

      return true;
    } catch (error) {
      console.error('模拟骑手移动失败:', error);
      return false;
    }
  },

  // 新增：批量初始化骑手位置数据
  async initializeCourierLocations(): Promise<boolean> {
    try {
      // 获取所有活跃骑手
      const couriers = await this.getActiveCouriers();
      
      if (couriers.length === 0) {
        console.log('没有找到活跃的骑手');
        return false;
      }

      // 为每个骑手生成初始位置
      const promises = couriers.map(courier => 
        this.simulateCourierMovement(courier.id)
      );

      await Promise.all(promises);
      console.log(`已为 ${couriers.length} 名骑手初始化位置数据`);
      return true;
    } catch (error) {
      console.error('初始化骑手位置失败:', error);
      return false;
    }
  },

  // 新增：获取骑手详细信息（包含位置）
  async getCourierWithLocation(courierId: string): Promise<any> {
    try {
      const [courierResult, locationResult] = await Promise.all([
        supabase.from('couriers').select('*').eq('id', courierId).single(),
        supabase.from('courier_locations').select('*').eq('courier_id', courierId).single()
      ]);

      if (courierResult.error) {
        console.error('获取骑手信息失败:', courierResult.error);
        return null;
      }

      return {
        ...courierResult.data,
        location: locationResult.data || null
      };
    } catch (error) {
      console.error('获取骑手详细信息失败:', error);
      return null;
    }
  },

  // 新增：为包裹分配骑手并开始跟踪
  async assignCourierToPackage(packageId: string, courierId: string): Promise<boolean> {
    try {
      // 更新包裹的骑手分配
      const { error: updateError } = await supabase
        .from('packages')
        .update({ 
          courier: courierId,
          status: '已取件'
        })
        .eq('id', packageId);

      if (updateError) {
        console.error('分配骑手失败:', updateError);
        return false;
      }

      // 添加取件事件
      const eventData: Omit<TrackingEvent, 'id' | 'created_at'> = {
        package_id: packageId,
        courier_id: courierId,
        status: '已取件',
        latitude: 16.8661, // 默认取件点（仰光市政厅）
        longitude: 96.1951,
        note: '骑手已取件，开始配送',
        event_time: new Date().toISOString()
      };

      await this.addTrackingEvent(eventData);

      // 开始模拟骑手移动
      await this.simulateCourierMovement(courierId, packageId);

      return true;
    } catch (error) {
      console.error('分配骑手并开始跟踪失败:', error);
      return false;
    }
  }
};

export const systemSettingsService = {
  async getAllSettings(): Promise<SystemSetting[]> {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('category', { ascending: true })
        .order('settings_key', { ascending: true });

      if (error) {
        console.error('获取系统设置失败:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('获取系统设置异常:', err);
      return [];
    }
  },

  async getSettingsByKeys(keys: string[]): Promise<SystemSetting[]> {
    if (!keys.length) return [];

    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .in('settings_key', keys);

      if (error) {
        console.error('按键获取系统设置失败:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('按键获取系统设置异常:', err);
      return [];
    }
  },

  async upsertSetting(setting: Omit<SystemSetting, 'id'>): Promise<boolean> {
    try {
      const payload = {
        ...setting,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('system_settings')
        .upsert(payload, { onConflict: 'settings_key' });

      if (error) {
        console.error(`更新系统设置 ${setting.settings_key} 失败:`, error);
        return false;
      }

      return true;
    } catch (err) {
      console.error(`更新系统设置 ${setting.settings_key} 异常:`, err);
      return false;
    }
  },

  async upsertSettings(settings: Array<Omit<SystemSetting, 'id'>>): Promise<boolean> {
    if (!settings.length) return true;

    try {
      const payload = settings.map(setting => ({
        ...setting,
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('system_settings')
        .upsert(payload, { onConflict: 'settings_key' });

      if (error) {
        console.error('批量更新系统设置失败:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('批量更新系统设置异常:', err);
      return false;
    }
  },

  // 获取计费规则（管理端专用格式）
  async getPricingSettings(region?: string): Promise<Record<string, any>> {
    try {
      const prefix = region ? `pricing.${region}.` : 'pricing.';
      const { data, error } = await supabase
        .from('system_settings')
        .select('settings_key, settings_value')
        .like('settings_key', 'pricing.%');

      if (error) throw error;

      const settings: Record<string, any> = {
        base_fee: 1500,
        per_km_fee: 250,
        weight_surcharge: 150,
        urgent_surcharge: 500,
        oversize_surcharge: 300,
        scheduled_surcharge: 200,
        fragile_surcharge: 300,
        food_beverage_surcharge: 300,
        free_km_threshold: 3,
        courier_km_rate: 500
      };

      // 如果提供了 region，先尝试寻找该区域的配置，如果没有则使用全局配置
      if (region) {
        const regionPrefix = `pricing.${region}.`;
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

      // 如果没有指定区域或该区域没有特殊配置，使用默认的 pricing. 前缀配置
      data?.forEach((item: any) => {
        if (!item.settings_key.includes('.mandalay.') && 
            !item.settings_key.includes('.yangon.') && 
            !item.settings_key.includes('.maymyo.') &&
            !item.settings_key.includes('.naypyidaw.') &&
            !item.settings_key.includes('.taunggyi.') &&
            !item.settings_key.includes('.lashio.') &&
            !item.settings_key.includes('.muse.')) {
          
          const key = item.settings_key.replace('pricing.', '');
          let value = item.settings_value;
          if (typeof value === 'string') {
            try { value = JSON.parse(value); } catch { value = parseFloat(value) || 0; }
          }
          settings[key] = typeof value === 'number' ? value : parseFloat(value) || 0;
        }
      });

      return settings;
    } catch (err) {
      console.error('获取计费规则失败:', err);
      return {
        base_fee: 1500,
        per_km_fee: 250,
        weight_surcharge: 150,
        urgent_surcharge: 500,
        oversize_surcharge: 300,
        scheduled_surcharge: 200,
        fragile_surcharge: 300,
        food_beverage_surcharge: 300,
        free_km_threshold: 3,
        courier_km_rate: 500
      };
    }
  }
};

// 通知接口
export interface Notification {
  id: string;
  recipient_id: string;
  recipient_type: 'courier' | 'customer' | 'admin';
  notification_type: 'package_assigned' | 'status_update' | 'urgent' | 'system';
  title: string;
  message: string;
  package_id?: string;
  is_read: boolean;
  created_at: string;
  read_at?: string;
  metadata?: any;
}

// 通知服务
export const notificationService = {
  /**
   * 发送包裹分配通知给快递员
   */
  async sendPackageAssignedNotification(
    courierId: string,
    courierName: string,
    packageId: string,
    packageDetails: {
      sender: string;
      receiver: string;
      receiverAddress: string;
      deliverySpeed?: string;
    }
  ): Promise<boolean> {
    try {
      // 检查系统设置中是否启用通知
      const settings = await systemSettingsService.getSettingsByKeys([
        'notification.sms_enabled',
        'notification.email_enabled'
      ]);
      
      const notificationEnabled = settings.some(s => 
        (s.settings_key === 'notification.sms_enabled' || 
         s.settings_key === 'notification.email_enabled') && 
        s.settings_value === 'true'
      );

      if (!notificationEnabled) {
        console.log('通知功能未启用，跳过发送');
        // 即使通知功能未启用，也创建通知记录供移动端读取
        console.log('📝 创建通知记录供移动端读取...');
      }

      // 构建通知标题和内容
      let title = '📦 新包裹分配通知';
      let message = `您好 ${courierName}，系统已为您分配新包裹！\n\n`;
      message += `📋 包裹编号：${packageId}\n`;
      message += `📤 寄件人：${packageDetails.sender}\n`;
      message += `📥 收件人：${packageDetails.receiver}\n`;
      message += `📍 送达地址：${packageDetails.receiverAddress}\n`;
      
      if (packageDetails.deliverySpeed) {
        const speedText = packageDetails.deliverySpeed === '急送达' ? '⚡ 急送达' : 
                         packageDetails.deliverySpeed === '定时达' ? '⏰ 定时达' : 
                         '✓ 准时达';
        message += `⏱️ 配送速度：${speedText}\n`;
      }
      
      message += `\n请及时取件并开始配送！`;

      // 插入通知记录
      const { error } = await supabase
        .from('notifications')
        .insert([{
          recipient_id: courierId,
          recipient_type: 'courier',
          notification_type: 'package_assigned',
          title: title,
          message: message,
          package_id: packageId,
          is_read: false,
          metadata: {
            package_details: packageDetails,
            assigned_at: new Date().toISOString(),
            assigned_by: 'system'
          }
        }]);

      if (error) {
        console.error('发送通知失败:', error);
        return false;
      }

      console.log(`✅ 通知已发送给快递员 ${courierName} (${courierId})`);
      return true;
    } catch (err) {
      console.error('发送通知异常:', err);
      return false;
    }
  },

  /**
   * 获取快递员的未读通知数量
   */
  async getUnreadCount(courierId: string): Promise<number> {
    try {
      const { data, error, count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', courierId)
        .eq('recipient_type', 'courier')
        .eq('is_read', false);

      if (error) {
        console.error('获取未读通知数量失败:', error);
        return 0;
      }

      return count || 0;
    } catch (err) {
      console.error('获取未读通知数量异常:', err);
      return 0;
    }
  },

  /**
   * 获取快递员的通知列表
   */
  async getCourierNotifications(
    courierId: string,
    limit: number = 50
  ): Promise<Notification[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', courierId)
        .eq('recipient_type', 'courier')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('获取通知列表失败:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('获取通知列表异常:', err);
      return [];
    }
  },

  /**
   * 标记通知为已读
   */
  async markAsRead(notificationIds: string[]): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .in('id', notificationIds);

      if (error) {
        console.error('标记通知已读失败:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('标记通知已读异常:', err);
      return false;
    }
  },

  /**
   * 删除通知
   */
  async deleteNotifications(notificationIds: string[]): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .in('id', notificationIds);

      if (error) {
        console.error('删除通知失败:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('删除通知异常:', err);
      return false;
    }
  }
};

// 广告管理服务
export const bannerService = {
  // 获取所有广告
  async getAllBanners(onlyActive: boolean = false): Promise<Banner[]> {
    try {
      let query = supabase
        .from('banners')
        .select('*')
        .order('display_order', { ascending: true });

      if (onlyActive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('获取广告列表失败:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('获取广告列表异常:', err);
      return [];
    }
  },

  // 创建新广告
  async createBanner(bannerData: Omit<Banner, 'id' | 'created_at' | 'updated_at'>): Promise<Banner | null> {
    try {
      const { data, error } = await supabase
        .from('banners')
        .insert([bannerData])
        .select()
        .single();

      if (error) {
        console.error('创建广告失败:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('创建广告异常:', err);
      return null;
    }
  },

  // 更新广告
  async updateBanner(id: string, updateData: Partial<Banner>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('banners')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('更新广告失败:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('更新广告异常:', err);
      return false;
    }
  },

  // 删除广告
  async deleteBanner(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('banners')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('删除广告失败:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('删除广告异常:', err);
      return false;
    }
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
    password?: string;
  }): Promise<any | null> {
    try {
      const newId = `USR${Date.now().toString().slice(-6)}`;
      const userData = {
        id: newId,
        name: customerData.name,
        phone: customerData.phone,
        email: customerData.email || '',
        address: customerData.address,
        password: customerData.password || '123456', // 默认密码
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

// 管理员账号数据库操作
export const adminAccountService = {
  // 登录验证（使用加密密码验证）
  async login(username: string, password: string): Promise<AdminAccount | null> {
    try {
      // 使用 Netlify Function 验证登录（包含密码加密验证）
      const response = await fetch('/.netlify/functions/admin-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // 重要：包含 Cookie（登录成功后设置）
        body: JSON.stringify({
          action: 'login',
          username,
          password
        })
      });

      const result = await response.json();

      if (!result.success || !result.account) {
        console.error('登录失败:', result.error || '未知错误');
        return null;
      }

      // 更新最后登录时间
      if (result.account.id) {
        await supabase
          .from('admin_accounts')
          .update({ last_login: new Date().toISOString() })
          .eq('id', result.account.id);
      }

      // 返回账户信息（不包含密码）
      return result.account as AdminAccount;
    } catch (err) {
      console.error('登录异常:', err);
      // 如果 Function 调用失败，回退到旧的验证方式（向后兼容）
      try {
        const { data, error } = await supabase
          .from('admin_accounts')
          .select('*')
          .eq('username', username)
          .eq('password', password)
          .eq('status', 'active')
          .single();

        if (error || !data) {
          return null;
        }

        // 更新最后登录时间
        if (data?.id) {
          await supabase
            .from('admin_accounts')
            .update({ last_login: new Date().toISOString() })
            .eq('id', data.id);
        }

        return data;
      } catch (fallbackErr) {
        console.error('回退登录验证失败:', fallbackErr);
        return null;
      }
    }
  },

  // 获取所有账号
  async getAllAccounts(): Promise<AdminAccount[]> {
    try {
      const { data, error } = await supabase
        .from('admin_accounts')
        .select('id, username, employee_name, employee_id, phone, email, department, position, salary, role, status, hire_date, last_login, created_at, region, permissions')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('获取账号列表失败:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('获取账号列表异常:', err);
      return [];
    }
  },

  // 创建新账号（密码会自动加密）
  async createAccount(accountData: Omit<AdminAccount, 'id' | 'status' | 'created_at' | 'updated_at'>): Promise<AdminAccount | null> {
    try {
      const isCourierAccount = accountData.position === '骑手' || accountData.position === '骑手队长';
      const plainPassword = accountData.password || '';

      let ensureAuthUserId = '';
      if (isCourierAccount) {
        if (!plainPassword || plainPassword.startsWith('$2a$') || plainPassword.startsWith('$2b$') || plainPassword.startsWith('$2y$')) {
          throw new Error('骑手账号必须填写明文密码用于 Auth 绑定');
        }

        const baseEmail = (accountData.email || '').trim();
        const fallbackEmail = `${(accountData.employee_id || accountData.username || accountData.employee_name || 'courier').toString().toLowerCase()}@mlexpress.app`;
        const authEmail = baseEmail || fallbackEmail;

        const ensureAuthResponse = await fetch(`${supabaseUrl}/functions/v1/ensure-courier-auth`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey
          },
          body: JSON.stringify({ email: authEmail, password: plainPassword })
        });

        const ensureAuthPayload = await ensureAuthResponse.json();
        if (!ensureAuthResponse.ok) {
          throw new Error(ensureAuthPayload?.error || '骑手 Auth 绑定失败');
        }
        ensureAuthUserId = ensureAuthPayload?.userId || '';
      }

      // 如果提供了密码，先加密
      let encryptedPassword = accountData.password;
      if (accountData.password && !accountData.password.startsWith('$2a$') && !accountData.password.startsWith('$2b$') && !accountData.password.startsWith('$2y$')) {
        // 密码是明文，需要加密
        try {
          const response = await fetch('/.netlify/functions/admin-password', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              action: 'hash',
              plainPassword: accountData.password
            })
          });

          const result = await response.json();
          if (result.hashedPassword) {
            encryptedPassword = result.hashedPassword;
          }
        } catch (hashError) {
          console.warn('密码加密失败，使用明文存储（不推荐）:', hashError);
          // 如果加密失败，继续使用明文（向后兼容，但不推荐）
        }
      }

      const { data, error } = await supabase
        .from('admin_accounts')
        .insert([{
          ...accountData,
          password: encryptedPassword,
          status: 'active'
        }])
        .select()
        .single();

      if (error) {
        console.error('创建账号失败 - 详细错误:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        // 抛出错误以便在UI层捕获
        throw new Error(error.message || '创建账号失败');
      }

      // 如果是骑手账号，尝试同步 couriers 表的 auth_user_id（存在时）
      if (isCourierAccount && ensureAuthUserId) {
        await supabase
          .from('couriers')
          .update({ auth_user_id: ensureAuthUserId })
          .or(`employee_id.eq.${accountData.employee_id},name.eq.${accountData.employee_name}`)
          .limit(1);
      }

      // 返回时不包含密码
      const { password: _, ...accountWithoutPassword } = data;
      return accountWithoutPassword as AdminAccount;
    } catch (err: any) {
      console.error('创建账号异常:', err);
      throw err; // 重新抛出错误
    }
  },

  // 更新账号状态
  async updateAccountStatus(id: string, status: 'active' | 'inactive' | 'suspended'): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('admin_accounts')
        .update({ status })
        .eq('id', id);

      if (error) {
        console.error('更新账号状态失败:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('更新账号状态异常:', err);
      return false;
    }
  },

  // 更新账号信息（如果更新密码，会自动加密）
  async updateAccount(id: string, updateData: Partial<AdminAccount>): Promise<boolean> {
    try {
      // 如果更新了密码，先加密
      if (updateData.password && !updateData.password.startsWith('$2a$') && !updateData.password.startsWith('$2b$') && !updateData.password.startsWith('$2y$')) {
        // 密码是明文，需要加密
        try {
          const response = await fetch('/.netlify/functions/admin-password', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include', // 包含 Cookie（如果需要认证）
            body: JSON.stringify({
              action: 'hash',
              plainPassword: updateData.password
            })
          });

          const result = await response.json();
          if (result.hashedPassword) {
            updateData.password = result.hashedPassword;
          }
        } catch (hashError) {
          console.warn('密码加密失败，使用明文存储（不推荐）:', hashError);
          // 如果加密失败，继续使用明文（向后兼容，但不推荐）
        }
      }

      const { error } = await supabase
        .from('admin_accounts')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('更新账号信息失败:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('更新账号信息异常:', err);
      return false;
    }
  },

  // 删除账号
  async deleteAccount(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('admin_accounts')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('删除账号失败:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('删除账号异常:', err);
      return false;
    }
  }
};

// 快递店数据库操作
export const deliveryStoreService = {
  // 获取所有快递店
  async getAllStores(): Promise<DeliveryStore[]> {
    try {
      const { data, error } = await supabase
        .from('delivery_stores')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('获取快递店列表失败:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('获取快递店列表异常:', err);
      return [];
    }
  },

  // 创建新快递店
  async createStore(storeData: Omit<DeliveryStore, 'id' | 'current_load' | 'status' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; data?: DeliveryStore; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('delivery_stores')
        .insert([{
          ...storeData,
          current_load: 0,
          status: 'active' // Status is set internally
        }])
        .select()
        .single();

      if (error) {
        console.error('创建快递店失败:', error);
        // 检查是否是唯一约束错误
        if (error.code === '23505') {
          if (error.message.includes('store_code')) {
            return { success: false, error: '店铺代码已存在，请使用其他代码' };
          } else if (error.message.includes('store_name')) {
            return { success: false, error: '店铺名称已存在，请使用其他名称' };
          }
        }
        // 检查是否是检查约束错误
        if (error.code === '23514') {
          if (error.message.includes('store_type_check')) {
            return { success: false, error: '店铺类型无效，请联系管理员更新数据库约束' };
          }
        }
        return { success: false, error: '创建失败，请重试' };
      }

      return { success: true, data };
    } catch (err) {
      console.error('创建快递店异常:', err);
      return { success: false, error: '创建失败，请重试' };
    }
  },

  // 更新快递店状态
  async updateStoreStatus(id: string, status: 'active' | 'inactive' | 'maintenance'): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('delivery_stores')
        .update({ status })
        .eq('id', id);

      if (error) {
        console.error('更新快递店状态失败:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('更新快递店状态异常:', err);
      return false;
    }
  },

  // 更新快递店负载
  async updateStoreLoad(id: string, load: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('delivery_stores')
        .update({ current_load: load })
        .eq('id', id);

      if (error) {
        console.error('更新快递店负载失败:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('更新快递店负载异常:', err);
      return false;
    }
  },

  // 更新快递店信息
  async updateStore(id: string, updateData: Partial<DeliveryStore>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('delivery_stores')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('更新快递店信息失败:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('更新快递店信息异常:', err);
      return false;
    }
  },

  // 删除快递店
  async deleteStore(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('delivery_stores')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('删除快递店失败:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('删除快递店异常:', err);
      return false;
    }
  },

  // 根据位置查找附近的快递店
  async getNearbyStores(latitude: number, longitude: number, radius: number = 10): Promise<DeliveryStore[]> {
    try {
      const { data, error } = await supabase
        .from('delivery_stores')
        .select('*')
        .eq('status', 'active');

      if (error) {
        console.error('查找附近快递店失败:', error);
        return [];
      }

      // 简单的距离计算（实际项目中建议使用PostGIS）
      const nearbyStores = (data || []).filter(store => {
        const distance = Math.sqrt(
          Math.pow(store.latitude - latitude, 2) + 
          Math.pow(store.longitude - longitude, 2)
        ) * 111; // 粗略转换为公里
        return distance <= radius;
      });

      return nearbyStores;
    } catch (err) {
      console.error('查找附近快递店异常:', err);
      return [];
    }
  }
};

// 审计日志服务
export const auditLogService = {
  // 记录操作日志
  async log(logData: Omit<AuditLog, 'id' | 'created_at' | 'action_time'>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('audit_logs')
        .insert([{
          ...logData,
          action_time: new Date().toISOString()
        }]);

      if (error) {
        console.error('记录审计日志失败:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('记录审计日志异常:', err);
      return false;
    }
  },

  // 获取所有日志
  async getAllLogs(limit: number = 5000): Promise<AuditLog[]> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('action_time', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('获取审计日志失败:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('获取审计日志异常:', err);
      return [];
    }
  },

  // 根据用户筛选日志
  async getLogsByUser(userId: string, limit: number = 200): Promise<AuditLog[]> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', userId)
        .order('action_time', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('获取用户审计日志失败:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('获取用户审计日志异常:', err);
      return [];
    }
  },

  // 根据目标 ID 获取日志（如包裹 ID）
  async getLogsByTargetId(targetId: string, limit: number = 50): Promise<AuditLog[]> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('target_id', targetId)
        .order('action_time', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('获取目标审计日志失败:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('获取目标审计日志异常:', err);
      return [];
    }
  },

  // 根据模块筛选日志
  async getLogsByModule(module: string, limit: number = 200): Promise<AuditLog[]> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('module', module)
        .order('action_time', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('获取模块审计日志失败:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('获取模块审计日志异常:', err);
      return [];
    }
  },

  // 根据操作类型筛选日志
  async getLogsByActionType(actionType: string, limit: number = 200): Promise<AuditLog[]> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('action_type', actionType)
        .order('action_time', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('获取操作类型审计日志失败:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('获取操作类型审计日志异常:', err);
      return [];
    }
  },

  // 根据时间范围筛选日志
  async getLogsByDateRange(startDate: string, endDate: string): Promise<AuditLog[]> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .gte('action_time', startDate)
        .lte('action_time', endDate)
        .order('action_time', { ascending: false });

      if (error) {
        console.error('获取时间范围审计日志失败:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('获取时间范围审计日志异常:', err);
      return [];
    }
  },

  // 删除指定天数前的旧日志
  async deleteOldLogs(days: number): Promise<boolean> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const cutoffDateStr = cutoffDate.toISOString();

      console.log(`🗑️  开始删除 ${days} 天前的审计日志 (早于 ${cutoffDateStr})`);

      // 先查询要删除的记录数
      const { count: queryCount } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .lt('action_time', cutoffDateStr);

      // 执行删除
      const { error } = await supabase
        .from('audit_logs')
        .delete()
        .lt('action_time', cutoffDateStr);

      if (error) {
        console.error('删除旧审计日志失败:', error);
        return false;
      }

      console.log(`✅ 已删除 ${queryCount || 0} 条旧审计日志`);
      return true;
    } catch (err) {
      console.error('删除旧审计日志异常:', err);
      return false;
    }
  }
};

// 配送照片服务
export const deliveryPhotoService = {
  // 保存配送照片
  async saveDeliveryPhoto(photoData: {
    packageId: string;
    photoUrl?: string;
    photoBase64?: string;
    courierName: string;
    courierId?: string;
    latitude?: number;
    longitude?: number;
    locationName?: string;
  }): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('delivery_photos')
        .insert([{
          package_id: photoData.packageId,
          photo_url: photoData.photoUrl,
          photo_base64: photoData.photoBase64,
          courier_name: photoData.courierName,
          courier_id: photoData.courierId,
          latitude: photoData.latitude,
          longitude: photoData.longitude,
          location_name: photoData.locationName,
          upload_time: new Date().toISOString()
        }]);

      if (error) {
        console.error('保存配送照片失败:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('保存配送照片异常:', err);
      return false;
    }
  },

  // 获取包裹的配送照片
  async getPackagePhotos(packageId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('delivery_photos')
        .select('*')
        .eq('package_id', packageId)
        .order('upload_time', { ascending: false });

      if (error) {
        console.error('获取包裹照片失败:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('获取包裹照片异常:', err);
      return [];
    }
  },

  // 删除配送照片
  async deleteDeliveryPhoto(photoId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('delivery_photos')
        .delete()
        .eq('id', photoId);

      if (error) {
        console.error('删除配送照片失败:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('删除配送照片异常:', err);
      return false;
    }
  }
};

// =====================================================
// 骑手工资管理相关接口
// =====================================================

export interface CourierSalary {
  id?: number;
  courier_id: string;
  courier_name: string;
  
  // 结算周期
  settlement_period: 'weekly' | 'monthly';
  period_start_date: string;
  period_end_date: string;
  
  // 工资组成
  base_salary: number; // 基本工资
  km_fee: number; // 公里费
  delivery_bonus: number; // 配送奖金（按单数）
  performance_bonus: number; // 绩效奖金
  overtime_pay: number; // 加班费
  tip_amount: number; // 小费
  
  // 扣款项
  deduction_amount: number; // 扣款（违规、赔偿等）
  
  // 统计数据
  total_deliveries: number; // 总配送单数
  total_km: number; // 总配送公里数
  on_time_deliveries: number; // 准时送达数
  late_deliveries: number; // 延迟送达数
  
  // 工资总额
  gross_salary: number; // 应发工资
  net_salary: number; // 实发工资
  
  // 状态
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  
  // 支付信息
  payment_method?: string;
  payment_reference?: string;
  payment_date?: string;
  
  // 备注
  notes?: string;
  admin_notes?: string;
  
  // 审核信息
  approved_by?: string;
  approved_at?: string;
  
  // 时间戳
  created_at?: string;
  updated_at?: string;
  
  // 新增字段：关联的包裹ID
  related_package_ids?: string[];
}

export interface CourierSalaryDetail {
  id?: number;
  salary_id: number;
  courier_id: string;
  detail_type: 'base_salary' | 'km_fee' | 'delivery_bonus' | 'performance_bonus' | 'overtime' | 'tip' | 'deduction';
  description: string;
  amount: number;
  package_id?: string;
  related_date?: string;
  created_at?: string;
}

export interface CourierPaymentRecord {
  id?: number;
  salary_id: number;
  courier_id: string;
  courier_name: string;
  amount: number;
  payment_method: string;
  payment_reference?: string;
  payment_status: 'pending' | 'success' | 'failed';
  account_holder?: string;
  account_number?: string;
  bank_name?: string;
  notes?: string;
  failure_reason?: string;
  processed_by?: string;
  processed_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CourierPerformance {
  id?: number;
  courier_id: string;
  courier_name: string;
  period_start_date: string;
  period_end_date: string;
  total_deliveries: number;
  completed_deliveries: number;
  on_time_rate: number;
  customer_rating: number;
  complaint_count: number;
  reward_points: number;
  penalty_points: number;
  bonus_amount: number;
  deduction_amount: number;
  performance_grade?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// 骑手工资管理服务
export const courierSalaryService = {
  // 获取所有工资记录
  async getAllSalaries(): Promise<CourierSalary[]> {
    try {
      const { data, error } = await supabase
        .from('courier_salaries')
        .select('*')
        .order('period_end_date', { ascending: false });

      if (error) {
        console.error('获取工资记录失败:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('获取工资记录异常:', err);
      return [];
    }
  },

  // 根据骑手ID获取工资记录
  async getSalariesByCourier(courierId: string): Promise<CourierSalary[]> {
    try {
      const { data, error } = await supabase
        .from('courier_salaries')
        .select('*')
        .eq('courier_id', courierId)
        .order('period_end_date', { ascending: false });

      if (error) {
        console.error('获取骑手工资记录失败:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('获取骑手工资记录异常:', err);
      return [];
    }
  },

  // 根据状态获取工资记录
  async getSalariesByStatus(status: CourierSalary['status']): Promise<CourierSalary[]> {
    try {
      const { data, error } = await supabase
        .from('courier_salaries')
        .select('*')
        .eq('status', status)
        .order('period_end_date', { ascending: false });

      if (error) {
        console.error('获取指定状态工资记录失败:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('获取指定状态工资记录异常:', err);
      return [];
    }
  },

  // 创建工资记录
  async createSalary(salary: Omit<CourierSalary, 'id'>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('courier_salaries')
        .insert([salary]);

      if (error) {
        console.error('创建工资记录失败:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('创建工资记录异常:', err);
      return false;
    }
  },

  // 更新工资记录
  async updateSalary(id: number, updates: Partial<CourierSalary>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('courier_salaries')
        .update(updates)
        .eq('id', id);

      if (error) {
        console.error('更新工资记录失败:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('更新工资记录异常:', err);
      return false;
    }
  },

  // 批量审核工资
  async batchApproveSalaries(ids: number[], approvedBy: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('courier_salaries')
        .update({
          status: 'approved',
          approved_by: approvedBy,
          approved_at: new Date().toISOString()
        })
        .in('id', ids);

      if (error) {
        console.error('批量审核工资失败:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('批量审核工资异常:', err);
      return false;
    }
  },

  // 发放工资
  async paySalary(id: number, paymentInfo: {
    payment_method: string;
    payment_reference?: string;
    payment_date: string;
  }): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('courier_salaries')
        .update({
          status: 'paid',
          ...paymentInfo
        })
        .eq('id', id);

      if (error) {
        console.error('发放工资失败:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('发放工资异常:', err);
      return false;
    }
  },

  // 删除工资记录
  async deleteSalary(id: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('courier_salaries')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('删除工资记录失败:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('删除工资记录异常:', err);
      return false;
    }
  },

  // 获取工资明细
  async getSalaryDetails(salaryId: number): Promise<CourierSalaryDetail[]> {
    try {
      const { data, error } = await supabase
        .from('courier_salary_details')
        .select('*')
        .eq('salary_id', salaryId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('获取工资明细失败:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('获取工资明细异常:', err);
      return [];
    }
  },

  // 添加工资明细
  async addSalaryDetail(detail: Omit<CourierSalaryDetail, 'id'>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('courier_salary_details')
        .insert([detail]);

      if (error) {
        console.error('添加工资明细失败:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('添加工资明细异常:', err);
      return false;
    }
  },

  // 获取支付记录
  async getPaymentRecords(salaryId?: number): Promise<CourierPaymentRecord[]> {
    try {
      let query = supabase
        .from('courier_payment_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (salaryId) {
        query = query.eq('salary_id', salaryId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('获取支付记录失败:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('获取支付记录异常:', err);
      return [];
    }
  },

  // 创建支付记录
  async createPaymentRecord(record: Omit<CourierPaymentRecord, 'id'>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('courier_payment_records')
        .insert([record]);

      if (error) {
        console.error('创建支付记录失败:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('创建支付记录异常:', err);
      return false;
    }
  },

  // 获取绩效记录
  async getPerformanceRecords(courierId?: string): Promise<CourierPerformance[]> {
    try {
      let query = supabase
        .from('courier_performance')
        .select('*')
        .order('period_end_date', { ascending: false });

      if (courierId) {
        query = query.eq('courier_id', courierId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('获取绩效记录失败:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('获取绩效记录异常:', err);
      return [];
    }
  },

  // 创建绩效记录
  async createPerformance(performance: Omit<CourierPerformance, 'id'>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('courier_performance')
        .insert([performance]);

      if (error) {
        console.error('创建绩效记录失败:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('创建绩效记录异常:', err);
      return false;
    }
  },

  // 更新绩效记录
  async updatePerformance(id: number, updates: Partial<CourierPerformance>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('courier_performance')
        .update(updates)
        .eq('id', id);

      if (error) {
        console.error('更新绩效记录失败:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('更新绩效记录异常:', err);
      return false;
    }
  },

  // 新增：批量标记包裹为已结算
  async markPackagesAsSettled(packageIds: string[]): Promise<boolean> {
    if (!packageIds || packageIds.length === 0) {
      return true; // 没有需要标记的包裹，直接返回成功
    }
    
    try {
      const { error } = await supabase
        .from('packages')
        .update({ is_settled: true })
        .in('id', packageIds);

      if (error) {
        console.error('批量标记包裹为已结算失败:', error);
        return false;
      }

      console.log(`成功标记 ${packageIds.length} 个包裹为已结算`);
      return true;
    } catch (err) {
      console.error('批量标记包裹为已结算异常:', err);
      return false;
    }
  }
};

// 计算两点间距离（米）
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // 地球半径（米）
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// 异步检测违规行为
async function detectViolationsAsync(
  packageId: string,
  courierId: string,
  courierLat: number,
  courierLng: number
): Promise<void> {
  try {
    console.log('🔍 开始违规检测...', { packageId, courierId, courierLat, courierLng });
    
    // 1. 检测位置违规
    const { data: packageData } = await supabase
      .from('packages')
      .select('receiver_latitude, receiver_longitude, courier')
      .eq('id', packageId)
      .single();

    if (packageData && packageData.receiver_latitude && packageData.receiver_longitude) {
      const destLat = packageData.receiver_latitude;
      const destLng = packageData.receiver_longitude;
      
      const distance = calculateDistance(courierLat, courierLng, destLat, destLng);
      console.log('📍 距离计算:', { distance, courierLat, courierLng, destLat, destLng });
      
      if (distance > 100) {
        console.warn('⚠️ 检测到位置违规:', { distance });
        
        // 创建位置违规警报
        const alertData = {
          package_id: packageId,
          courier_id: courierId,
          courier_name: packageData.courier,
          alert_type: 'location_violation',
          severity: 'high',
          title: '位置违规 - 距离收件地址过远',
          description: `骑手在距离收件地址 ${distance.toFixed(0)} 米处完成配送，超出100米安全范围`,
          status: 'pending',
          courier_latitude: courierLat,
          courier_longitude: courierLng,
          destination_latitude: destLat,
          destination_longitude: destLng,
          distance_from_destination: distance,
          action_attempted: 'complete_delivery',
          metadata: {
            auto_detected: true,
            detection_time: new Date().toISOString()
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const { error: alertError } = await supabase
          .from('delivery_alerts')
          .insert(alertData);
          
        if (alertError) {
          console.error('❌ 创建位置违规警报失败:', alertError);
        } else {
          console.log('✅ 位置违规警报创建成功!');
        }
      } else {
        console.log('✅ 位置验证通过:', { distance });
      }
    } else {
      console.warn('⚠️ 包裹缺少收件地址坐标');
    }
    
    // 2. 检测照片违规（延迟5秒检测）
    setTimeout(async () => {
      try {
        const { data: photos } = await supabase
          .from('delivery_photos')
          .select('photo_url')
          .eq('package_id', packageId);
          
        if (!photos || photos.length === 0) {
          console.warn('⚠️ 检测到照片违规: 未上传配送照片');
          
          // 创建照片违规警报
          const alertData = {
            package_id: packageId,
            courier_id: courierId,
            courier_name: packageData?.courier || '未知',
            alert_type: 'photo_violation',
            severity: 'medium',
            title: '照片违规 - 未上传配送照片',
            description: '骑手完成配送但未上传配送照片，无法提供配送证明',
            status: 'pending',
            courier_latitude: courierLat,
            courier_longitude: courierLng,
            action_attempted: 'complete_delivery',
            metadata: {
              auto_detected: true,
              detection_time: new Date().toISOString(),
              photo_count: 0
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          const { error: alertError } = await supabase
            .from('delivery_alerts')
            .insert(alertData);
            
          if (alertError) {
            console.error('❌ 创建照片违规警报失败:', alertError);
          } else {
            console.log('✅ 照片违规警报创建成功!');
          }
        } else {
          console.log('✅ 照片验证通过:', { photoCount: photos.length });
        }
      } catch (photoError) {
        console.error('❌ 照片验证失败:', photoError);
      }
    }, 5000);
    
  } catch (error) {
    console.error('❌ 违规检测异常:', error);
  }
}
// 🚀 新增：充值管理服务
export const rechargeService = {
  // 获取所有充值申请
  async getAllRequests(): Promise<RechargeRequest[]> {
    try {
      // 1. 获取所有充值申请
      const { data: requests, error } = await supabase
        .from('recharge_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (!requests || requests.length === 0) return [];

      // 2. 获取所有相关的用户信息（用于提取地区和余额）
      const userIds = Array.from(new Set(requests.map(r => r.user_id)));
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, register_region, balance')
        .in('id', userIds);

      // 3. 建立 ID 映射
      const userExtraMap: Record<string, { region: string, balance: number }> = {};
      if (!userError && users) {
        users.forEach(u => {
          userExtraMap[u.id] = {
            region: u.register_region || 'mandalay',
            balance: u.balance || 0
          };
        });
      }
      
      // 4. 合并数据
      return requests.map(req => ({
        ...req,
        register_region: userExtraMap[req.user_id]?.region || 'mandalay',
        user_balance: userExtraMap[req.user_id]?.balance || 0
      }));
    } catch (err) {
      console.error('获取充值申请失败:', err);
      return [];
    }
  },

  // 审批充值申请
  async updateRequestStatus(id: string, userId: string, status: 'completed' | 'rejected', amount: number): Promise<boolean> {
    try {
      // 1. 更新申请状态
      const { error: updateError } = await supabase
        .from('recharge_requests')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (updateError) throw updateError;

      // 2. 如果是完成，更新用户余额
      if (status === 'completed') {
        // 先获取当前余额
        const { data: user, error: fetchError } = await supabase
          .from('users')
          .select('balance')
          .eq('id', userId)
          .single();
        
        if (fetchError) throw fetchError;

        const newBalance = (user.balance || 0) + amount;

        const { error: balanceError } = await supabase
          .from('users')
          .update({ balance: newBalance, updated_at: new Date().toISOString() })
          .eq('id', userId);
        
        if (balanceError) throw balanceError;
      }

      return true;
    } catch (err) {
      console.error('审批充值申请异常:', err);
      return false;
    }
  },

  // 手动调整用户余额
  async manualAdjustBalance(userId: string, amount: number, notes: string): Promise<boolean> {
    try {
      // 1. 获取当前余额
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('balance, name')
        .eq('id', userId)
        .single();
      
      if (fetchError) throw fetchError;

      const newBalance = (user.balance || 0) + amount;

      // 2. 更新余额
      const { error: balanceError } = await supabase
        .from('users')
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq('id', userId);
      
      if (balanceError) throw balanceError;

      // 3. 记录到充值表作为记录
      await supabase.from('recharge_requests').insert([{
        user_id: userId,
        user_name: user.name,
        amount: amount,
        status: 'completed',
        notes: `手动调整: ${notes}`
      }]);

      return true;
    } catch (err) {
      console.error('手动调整余额异常:', err);
      return false;
    }
  }
};
