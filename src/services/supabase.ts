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
  delivery_speed?: string; // 配送速度（准时达/急送达/定时达）
  scheduled_delivery_time?: string; // 定时达的指定时间
  delivery_distance?: number; // 配送距离（km）
  status: string;
  create_time: string;
  pickup_time: string;
  delivery_time: string;
  courier: string;
  price: string;
  created_at?: string;
  updated_at?: string;
  // 新增字段：店铺关联
  delivery_store_id?: string; // 送达店铺ID
  delivery_store_name?: string; // 送达店铺名称
  store_receive_code?: string; // 店铺收件码
  sender_code?: string; // 寄件码（客户提交订单后自动生成的二维码）
  transfer_code?: string; // 中转码（包裹在中转站的唯一标识码）
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
  store_type: 'hub' | 'branch' | 'pickup_point' | 'transit_station';
  status: 'active' | 'inactive' | 'maintenance';
  operating_hours: string;
  service_area_radius: number;
  capacity: number;
  current_load: number;
  facilities: string[];
  notes?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
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
  async updatePackageStatus(
    id: string, 
    status: string, 
    pickupTime?: string, 
    deliveryTime?: string, 
    courierName?: string,
    transferCode?: string,
    storeInfo?: { storeId: string, storeName: string, receiveCode: string }
  ): Promise<boolean> {
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
  },

  // 获取特定店铺的入库包裹
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
        return true; // 不算失败
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

// 管理员账号数据库操作
export const adminAccountService = {
  // 登录验证
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
  },

  // 获取所有账号
  async getAllAccounts(): Promise<AdminAccount[]> {
    try {
      const { data, error } = await supabase
        .from('admin_accounts')
        .select('id, username, employee_name, employee_id, phone, email, department, position, salary, role, status, hire_date, last_login, created_at')
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

  // 创建新账号
  async createAccount(accountData: Omit<AdminAccount, 'id' | 'status' | 'created_at' | 'updated_at'>): Promise<AdminAccount | null> {
    try {
      const { data, error } = await supabase
        .from('admin_accounts')
        .insert([{
          ...accountData,
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

      return data;
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

  // 更新账号信息
  async updateAccount(id: string, updateData: Partial<AdminAccount>): Promise<boolean> {
    try {
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
  async getAllLogs(limit: number = 500): Promise<AuditLog[]> {
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