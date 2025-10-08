import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uopkyuluxnrewvlmutam.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcGt5dWx1eG5yZXd2bG11dGFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDMwMDAsImV4cCI6MjA3NDYxOTAwMH0._6AilDWJcevT-qo90f6wInAKw3aKn2a8jIM8BEGQ3rY';

export const supabase = createClient(supabaseUrl, supabaseKey);

// 包裹数据类型
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
  // 新增店铺相关字段
  delivery_store_id?: string;
  delivery_store_name?: string;
  store_receive_code?: string;
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
  role: 'admin' | 'manager' | 'operator' | 'finance';
  status: 'active' | 'inactive' | 'suspended';
  last_login?: string;
}

export interface AuditLog {
  user_id: string;
  user_name: string;
  action_type: 'create' | 'update' | 'delete' | 'login' | 'logout';
  module: 'packages' | 'users' | 'couriers' | 'finance' | 'settings' | 'system';
  target_id?: string;
  target_name?: string;
  action_description: string;
  old_value?: string;
  new_value?: string;
}

// 快递员数据类型
export interface Courier {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  vehicle_type: string;
  license_number?: string;
  status: 'active' | 'inactive' | 'busy';
  join_date?: string;
  last_active?: string;
  total_deliveries?: number;
  rating?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  current_location?: {
    latitude: number;
    longitude: number;
  };
}

// 路线优化结果
export interface RouteOptimization {
  courier_id: string;
  courier_name: string;
  packages: Package[];
  total_distance: number;
  estimated_time: number;
  priority_score: number;
}

// 快递店数据类型
export interface DeliveryStore {
  id: string;
  store_name: string;
  manager_name: string;
  manager_phone: string;
  address: string;
  latitude: number;
  longitude: number;
  status: 'active' | 'inactive' | 'maintenance';
  created_at: string;
  updated_at: string;
}

// 管理员账号服务
export const adminAccountService = {
  async login(username: string, password: string): Promise<AdminAccount | null> {
    try {
      const { data, error } = await supabase
        .from('admin_accounts')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .eq('status', 'active')
        .single();

      if (error) {
        console.error('登录失败:', error);
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
    } catch (err) {
      console.error('登录异常:', err);
      return null;
    }
  }
};

// 包裹服务
export const packageService = {
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

  async createPackage(packageData: Package): Promise<Package | null> {
    try {
      const { data, error } = await supabase
        .from('packages')
        .insert([packageData])
        .select()
        .single();

      if (error) {
        console.error('创建包裹失败:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('创建包裹异常:', err);
      return null;
    }
  },

  async updatePackageStatus(
    id: string, 
    status: string, 
    pickupTime?: string, 
    deliveryTime?: string,
    courierName?: string,
    storeInfo?: { storeId: string, storeName: string, receiveCode: string }
  ): Promise<boolean> {
    const updateData: any = { status };
    
    if (pickupTime) updateData.pickup_time = pickupTime;
    if (deliveryTime) updateData.delivery_time = deliveryTime;
    if (courierName) updateData.courier = courierName;
    
    // 如果是送达状态且有店铺信息，记录店铺信息
    if (status === '已送达' && storeInfo) {
      updateData.delivery_store_id = storeInfo.storeId;
      updateData.delivery_store_name = storeInfo.storeName;
      updateData.store_receive_code = storeInfo.receiveCode;
    }
    
    console.log('更新包裹数据:', { id, updateData });
    
    const { error } = await supabase
      .from('packages')
      .update(updateData)
      .eq('id', id);
    
    if (error) {
      console.error('更新包裹状态失败:', error);
      return false;
    }
    
    console.log('包裹状态更新成功');
    return true;
  }
};

// 审计日志服务
export const auditLogService = {
  async log(logData: AuditLog): Promise<boolean> {
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
  }
};

// 快递员服务
export const courierService = {
  async getAllCouriers(): Promise<Courier[]> {
    try {
      const { data, error } = await supabase
        .from('couriers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('获取快递员列表失败:', error);
        return [];
      }
      
      return data || [];
    } catch (err) {
      console.error('获取快递员列表异常:', err);
      return [];
    }
  },

  async getActiveCouriers(): Promise<Courier[]> {
    try {
      const { data, error } = await supabase
        .from('couriers')
        .select('*')
        .eq('status', 'active')
        .order('total_deliveries', { ascending: true });
      
      if (error) {
        console.error('获取活跃快递员失败:', error);
        return [];
      }
      
      return data || [];
    } catch (err) {
      console.error('获取活跃快递员异常:', err);
      return [];
    }
  },

  async updateCourierStatus(courierId: string, status: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('couriers')
        .update({ 
          status,
          last_active: new Date().toLocaleString('zh-CN')
        })
        .eq('id', courierId);
      
      if (error) {
        console.error('更新快递员状态失败:', error);
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('更新快递员状态异常:', err);
      return false;
    }
  }
};

// 路线优化服务
export const routeService = {
  // 智能分配快递员
  async assignOptimalCourier(packages: Package[]): Promise<RouteOptimization[]> {
    try {
      const activeCouriers = await courierService.getActiveCouriers();
      if (activeCouriers.length === 0) {
        return [];
      }

      // 按区域分组包裹
      const packageGroups = this.groupPackagesByArea(packages);
      const optimizations: RouteOptimization[] = [];

      for (const group of packageGroups) {
        const bestCourier = this.findBestCourierForGroup(group, activeCouriers);
        if (bestCourier) {
          const optimization = await this.calculateRouteOptimization(bestCourier, group);
          optimizations.push(optimization);
        }
      }

      return optimizations.sort((a, b) => b.priority_score - a.priority_score);
    } catch (err) {
      console.error('分配快递员异常:', err);
      return [];
    }
  },

  // 按区域分组包裹（简化算法，基于收件人地址）
  groupPackagesByArea(packages: Package[]): Package[][] {
    const groups: { [key: string]: Package[] } = {};
    
    packages.forEach(pkg => {
      // 提取地址关键词（简化版）
      const areaKey = this.extractAreaKey(pkg.receiver_address);
      if (!groups[areaKey]) {
        groups[areaKey] = [];
      }
      groups[areaKey].push(pkg);
    });
    
    return Object.values(groups);
  },

  // 提取地址区域关键词
  extractAreaKey(address: string): string {
    // 简化的区域识别：取地址前几个字符作为区域标识
    const cleanAddress = address.replace(/\s+/g, '');
    if (cleanAddress.length >= 6) {
      return cleanAddress.substring(0, 6);
    }
    return cleanAddress.substring(0, Math.max(2, cleanAddress.length));
  },

  // 为包裹组找最佳快递员
  findBestCourierForGroup(packages: Package[], couriers: Courier[]): Courier | null {
    if (couriers.length === 0) return null;
    
    // 评分算法：考虑工作负载、车辆类型、历史表现
    let bestCourier = couriers[0];
    let bestScore = this.calculateCourierScore(bestCourier, packages);
    
    for (let i = 1; i < couriers.length; i++) {
      const score = this.calculateCourierScore(couriers[i], packages);
      if (score > bestScore) {
        bestScore = score;
        bestCourier = couriers[i];
      }
    }
    
    return bestCourier;
  },

  // 计算快递员评分
  calculateCourierScore(courier: Courier, packages: Package[]): number {
    let score = 100;
    
    // 工作负载评分（配送数量越少越好）
    const deliveryPenalty = (courier.total_deliveries || 0) * 2;
    score -= deliveryPenalty;
    
    // 车辆类型评分
    const hasHeavyPackages = packages.some(p => {
      const weight = parseFloat(p.weight) || 0;
      return weight > 5; // 超过5kg算重包裹
    });
    
    if (hasHeavyPackages && courier.vehicle_type === 'car') {
      score += 20; // 重包裹适合汽车配送
    } else if (!hasHeavyPackages && courier.vehicle_type === 'motorcycle') {
      score += 15; // 轻包裹适合摩托车配送
    }
    
    // 评分奖励
    const rating = courier.rating || 5.0;
    score += rating * 5;
    
    // 状态检查
    if (courier.status === 'busy') {
      score -= 50;
    }
    
    return score;
  },

  // 计算路线优化结果
  async calculateRouteOptimization(courier: Courier, packages: Package[]): Promise<RouteOptimization> {
    // 简化的距离和时间计算
    const totalDistance = packages.length * 3.5; // 平均每个包裹3.5公里
    const estimatedTime = packages.length * 25; // 平均每个包裹25分钟
    const priorityScore = this.calculateCourierScore(courier, packages);
    
    return {
      courier_id: courier.id,
      courier_name: courier.name,
      packages,
      total_distance: Math.round(totalDistance * 10) / 10,
      estimated_time: Math.round(estimatedTime),
      priority_score: Math.round(priorityScore)
    };
  },

  // 批量分配包裹给快递员
  async assignPackagesToCourier(packageIds: string[], courierId: string, courierName: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('packages')
        .update({ 
          courier: courierName,
          status: '已分配'
        })
        .in('id', packageIds);
      
      if (error) {
        console.error('分配包裹失败:', error);
        return false;
      }
      
      // 更新快递员状态为忙碌
      await courierService.updateCourierStatus(courierId, 'busy');
      
      return true;
    } catch (err) {
      console.error('分配包裹异常:', err);
      return false;
    }
  }
};

// 快递店服务
export const deliveryStoreService = {
  async getAllStores(): Promise<DeliveryStore[]> {
    try {
      const { data, error } = await supabase
        .from('delivery_stores')
        .select('*')
        .eq('status', 'active')
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

  async getStoreById(storeId: string): Promise<DeliveryStore | null> {
    try {
      const { data, error } = await supabase
        .from('delivery_stores')
        .select('*')
        .eq('id', storeId)
        .single();
      
      if (error) {
        console.error('获取快递店详情失败:', error);
        return null;
      }
      
      return data;
    } catch (err) {
      console.error('获取快递店详情异常:', err);
      return null;
    }
  }
};

// 用户服务
export const userService = {
  // 创建客户
  async createCustomer(customerData: {
    name: string;
    phone: string;
    address?: string;
  }) {
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([{
          name: customerData.name,
          phone: customerData.phone,
          address: customerData.address || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('创建客户失败:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('创建客户异常:', err);
      return null;
    }
  },

  // 根据手机号获取用户
  async getUserByPhone(phone: string) {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', phone)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('查询用户失败:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('查询用户异常:', err);
      return null;
    }
  },

  // 获取所有客户
  async getAllCustomers() {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('获取客户列表失败:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('获取客户列表异常:', err);
      return [];
    }
  },

  // 更新客户信息
  async updateCustomer(id: string, updateData: {
    name?: string;
    phone?: string;
    address?: string;
  }) {
    try {
      const { data, error } = await supabase
        .from('customers')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('更新客户失败:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('更新客户异常:', err);
      return null;
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
  }
};