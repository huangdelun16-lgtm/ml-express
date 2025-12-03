import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// 使用环境变量配置 Supabase
// 优先从 expo-constants 读取（通过 app.config.js 的 extra 字段），回退到 process.env
// 注意：确保 URL 和 ANON_KEY 匹配同一个 Supabase 项目
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://uopkyuluxnrewvlmutam.supabase.co';
const supabaseKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
// Netlify URL 用于调用 admin-password function
// 优先使用自定义域名，回退到默认 Netlify 域名
const netlifyUrl = Constants.expoConfig?.extra?.netlifyUrl || process.env.EXPO_PUBLIC_NETLIFY_URL || 'https://admin-market-link-express.com';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 配置缺失:');
  console.error('   EXPO_PUBLIC_SUPABASE_URL:', supabaseUrl ? '已配置' : '未配置');
  console.error('   EXPO_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? '已配置' : '未配置');
  console.error('   请检查 .env 文件或 EAS Secrets 配置');
  throw new Error('EXPO_PUBLIC_SUPABASE_URL 和 EXPO_PUBLIC_SUPABASE_ANON_KEY 环境变量必须配置！');
}

// 创建自定义 fetch 函数，添加超时支持（兼容 React Native）
const fetchWithTimeout: typeof fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const timeout = 30000; // 30 秒超时
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  // 合并已有的 signal（如果有）
  const existingSignal = init?.signal;
  if (existingSignal) {
    existingSignal.addEventListener('abort', () => controller.abort());
  }
  
  return fetch(input, {
    ...init,
    signal: controller.signal
  }).then((response) => {
    clearTimeout(timeoutId);
    return response;
  }).catch((error) => {
    clearTimeout(timeoutId);
    // 如果是超时错误，提供更清晰的错误信息
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      throw new Error('请求超时，请检查网络连接');
    }
    throw error;
  });
};

// 创建 Supabase 客户端，添加超时和重试配置
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false, // 移动 app 不使用持久化 session
    autoRefreshToken: false,
    detectSessionInUrl: false
  },
  global: {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    },
    // 使用自定义 fetch 函数，添加超时支持
    fetch: fetchWithTimeout
  },
  db: {
    schema: 'public'
  }
});

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
  sender_code?: string; // 寄件码（客户提交订单后自动生成的二维码）
  transfer_code?: string; // 中转码（包裹在中转站的唯一标识码）
  // 新增坐标字段
  receiver_latitude?: number; // 收件人纬度
  receiver_longitude?: number; // 收件人经度
  sender_latitude?: number; // 发件人纬度
  sender_longitude?: number; // 发件人经度
  // 新增配送相关字段
  delivery_speed?: string; // 配送速度
  scheduled_delivery_time?: string; // 定时配送时间
  // 新增支付方式字段
  payment_method?: 'qr' | 'cash'; // 支付方式：qr=二维码支付，cash=现金支付
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
      // 方法1: 尝试使用 Netlify Function 验证密码（推荐，支持加密密码）
      let netlifyLoginSuccess = false;
      try {
        // 使用配置的 Netlify URL 调用登录验证函数
        // 添加超时设置（10秒）
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(`${netlifyUrl}/.netlify/functions/admin-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // 不设置 Origin 头，让浏览器/React Native 自动处理
            // 如果需要，可以添加自定义 Origin
          },
          body: JSON.stringify({
            action: 'login',
            username: username,
            password: password
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.account) {
            // 登录成功，Netlify Function 已经返回了账号信息（不包含密码）
            const accountFromNetlify = result.account;
            
            // 尝试从数据库获取完整账号信息（包括密码字段，虽然我们不会使用它）
            // 如果数据库查询失败，使用 Netlify Function 返回的账号信息
            try {
              const { data, error } = await supabase
                .from('admin_accounts')
                .select('*')
                .eq('username', username)
                .eq('status', 'active')
                .single();

              if (error || !data) {
                console.warn('获取完整账号信息失败，使用 Netlify Function 返回的信息:', error);
                // 使用 Netlify Function 返回的账号信息，但需要添加一些默认值
                const accountData: AdminAccount = {
                  ...accountFromNetlify,
                  password: '', // 密码字段为空，因为 Netlify Function 不返回密码
                  id: accountFromNetlify.id || '',
                  status: accountFromNetlify.status || 'active',
                  created_at: accountFromNetlify.created_at || new Date().toISOString(),
                  updated_at: accountFromNetlify.updated_at || new Date().toISOString()
                } as AdminAccount;
                
                netlifyLoginSuccess = true;
                return accountData;
              }

              // 更新最后登录时间（如果可能）
              try {
                await supabase
                  .from('admin_accounts')
                  .update({ last_login: new Date().toISOString() })
                  .eq('id', data.id);
              } catch (updateError) {
                console.warn('更新最后登录时间失败:', updateError);
                // 不影响登录流程
              }

              netlifyLoginSuccess = true;
              return data;
            } catch (dbError: any) {
              console.warn('数据库查询失败，使用 Netlify Function 返回的信息:', dbError);
              // 使用 Netlify Function 返回的账号信息
              const accountData: AdminAccount = {
                ...accountFromNetlify,
                password: '',
                id: accountFromNetlify.id || '',
                status: accountFromNetlify.status || 'active',
                created_at: accountFromNetlify.created_at || new Date().toISOString(),
                updated_at: accountFromNetlify.updated_at || new Date().toISOString()
              } as AdminAccount;
              
              netlifyLoginSuccess = true;
              return accountData;
            }
          } else {
            console.error('登录失败:', result.error || '未知错误');
            // Netlify Function 返回了明确的错误，直接返回
            return null;
          }
        } else {
          console.warn('Netlify Function 返回错误状态:', response.status);
          // 尝试读取错误信息
          try {
            const errorResult = await response.json();
            console.warn('Netlify Function 错误详情:', errorResult);
          } catch (e) {
            // 忽略 JSON 解析错误
          }
        }
      } catch (netlifyError: any) {
        // 网络错误或其他错误，继续尝试直接数据库验证
        if (netlifyError.name === 'AbortError') {
          console.warn('Netlify Function 请求超时，尝试直接数据库验证');
        } else {
          console.warn('Netlify Function 验证失败，尝试直接数据库验证:', netlifyError.message);
        }
      }

      // 如果 Netlify Function 验证成功，不需要继续
      if (netlifyLoginSuccess) {
        return null;
      }

      // 方法2: 直接数据库验证（向后兼容，仅用于明文密码）
      // 先获取账号信息
      const { data: accountData, error: fetchError } = await supabase
        .from('admin_accounts')
        .select('*')
        .eq('username', username)
        .eq('status', 'active')
        .single();

      if (fetchError) {
        console.error('查询账号失败:', fetchError);
        // 如果是网络错误，提供更友好的提示
        if (fetchError.message && fetchError.message.includes('Network')) {
          throw new Error('网络连接失败，请检查网络设置');
        }
        return null;
      }

      if (!accountData) {
        console.error('账号不存在或已停用');
        return null;
      }

      // 检查密码是否加密
      const isPasswordHashed = accountData.password && (
        accountData.password.startsWith('$2a$') || 
        accountData.password.startsWith('$2b$') || 
        accountData.password.startsWith('$2y$')
      );

      if (isPasswordHashed) {
        // 密码已加密，无法在客户端验证
        // 如果 Netlify Function 不可用，提示用户
        console.error('密码已加密，但 Netlify Function 不可用。请检查网络连接或联系管理员。');
        throw new Error('无法验证密码：网络连接失败。请检查网络设置或联系管理员。');
      }

      // 密码是明文，直接比较（向后兼容，但不推荐）
      if (accountData.password !== password) {
        console.error('密码错误');
        return null;
      }

      // 更新最后登录时间
      await supabase
        .from('admin_accounts')
        .update({ last_login: new Date().toISOString() })
        .eq('id', accountData.id);

      return accountData;
    } catch (err: any) {
      console.error('登录异常:', err);
      // 重新抛出错误，让 UI 层可以显示错误信息
      throw err;
    }
  }
};

// 包裹服务
export const packageService = {
  async getAllPackages(retryCount = 2): Promise<Package[]> {
    let lastError: any = null;
    
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        const { data, error } = await supabase
          .from('packages')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          lastError = error;
          // 如果是网络错误且还有重试次数，等待后重试
          if (attempt < retryCount && (
            error.message?.includes('Network') || 
            error.message?.includes('connection') ||
            error.message?.includes('gateway')
          )) {
            console.warn(`获取包裹列表失败 (尝试 ${attempt + 1}/${retryCount + 1}):`, error.message);
            // 等待时间递增：1秒、2秒
            await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1000));
            continue;
          }
          console.error('获取包裹列表失败:', error);
          throw error;
        }
        
        return data || [];
      } catch (err: any) {
        lastError = err;
        // 如果是网络错误且还有重试次数，等待后重试
        if (attempt < retryCount && (
          err?.message?.includes('Network') || 
          err?.message?.includes('connection') ||
          err?.message?.includes('gateway') ||
          err?.message?.includes('Network connection lost')
        )) {
          console.warn(`获取包裹列表异常 (尝试 ${attempt + 1}/${retryCount + 1}):`, err?.message);
          // 等待时间递增：1秒、2秒
          await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1000));
          continue;
        }
        // 最后一次尝试失败，抛出错误
        if (attempt === retryCount) {
          console.error('获取包裹列表异常 (所有重试失败):', err);
          throw err;
        }
      }
    }
    
    // 如果所有重试都失败，返回空数组（保持向后兼容）
    console.error('获取包裹列表失败，所有重试已用尽');
    return [];
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
    transferCode?: string,
    storeInfo?: { storeId: string, storeName: string, receiveCode: string },
    courierLocation?: { latitude: number, longitude: number }
  ): Promise<boolean> {
    const updateData: any = { status };
    
    if (pickupTime) updateData.pickup_time = pickupTime;
    if (deliveryTime) updateData.delivery_time = deliveryTime;
    if (courierName) updateData.courier = courierName;
    if (transferCode) updateData.transfer_code = transferCode;
    
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
    
    // 如果是送达状态且有骑手位置信息，进行违规检测
    if (status === '已送达' && courierLocation && courierName) {
      try {
        // 获取包裹信息以进行违规检测
        const { data: packageData } = await supabase
          .from('packages')
          .select('receiver_latitude, receiver_longitude, courier')
          .eq('id', id)
          .single();

        if (packageData) {
          // 调用违规检测函数
          await detectViolationsAsync(id, courierName, courierLocation.latitude, courierLocation.longitude);
        }
      } catch (error) {
        console.error('违规检测失败:', error);
      }
    }
    
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
      // 确保状态值符合数据库约束
      const validStatus = ['active', 'inactive', 'busy'].includes(status) ? status : 'active';
      
      const { error } = await supabase
        .from('couriers')
        .update({ 
          status: validStatus,
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
      // 生成照片URL（使用data URL格式）
      const photoUrl = photoData.photoBase64 
        ? `data:image/jpeg;base64,${photoData.photoBase64}`
        : photoData.photoUrl;

      const { error } = await supabase
        .from('delivery_photos')
        .insert([{
          package_id: photoData.packageId,
          photo_url: photoUrl,
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

      console.log('✅ 配送照片保存成功，URL已生成');
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

// 违规检测函数
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

// 计算距离函数
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