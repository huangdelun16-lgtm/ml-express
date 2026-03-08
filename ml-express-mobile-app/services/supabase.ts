import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { cacheService } from './cacheService';
import { detectViolationsAsync } from './detectViolations';

// 缓存键名
const CACHE_KEYS = {
  PACKAGES: 'cached_packages_list',
  COURIERS: 'cached_couriers_list',
  STORES: 'cached_stores_list',
  LAST_FETCH: 'last_fetch_timestamp'
};

// 计算距离函数 (KM)
const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// 使用环境变量配置 Supabase
// 优先从 expo-constants 读取（通过 app.config.js 的 extra 字段），回退到 process.env
// 注意：确保 URL 和 ANON_KEY 匹配同一个 Supabase 项目
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://uopkyuluxnrewvlmutam.supabase.co';
const supabaseKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
// Netlify URL 用于调用 admin-password function
// 优先使用自定义域名，回退到默认 Netlify 域名
const netlifyUrl = Constants.expoConfig?.extra?.netlifyUrl || process.env.EXPO_PUBLIC_NETLIFY_URL || 'https://admin-market-link-express.netlify.app';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 配置缺失:');
  console.error('   EXPO_PUBLIC_SUPABASE_URL:', supabaseUrl ? '已配置' : '未配置');
  console.error('   EXPO_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? '已配置' : '未配置');
  console.error('   请检查 .env 文件或 EAS Secrets 配置');
}

// 调试信息：打印配置（不打印完整的 key）
console.log('✅ Supabase 配置已加载:');
console.log('   URL:', supabaseUrl);
console.log('   Key:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : '未配置');

// 创建 Supabase 客户端
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseKey || 'placeholder-key', 
  {
  auth: {
    persistSession: false, // 移动 app 不使用持久化 session
    autoRefreshToken: false,
    detectSessionInUrl: false
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
  cod_amount?: number; // 代收款金额 (COD)
  rider_settled?: boolean; // 骑手是否已结清
  rider_settled_at?: string; // 骑手结清时间
  // 费用明细字段
  store_fee?: string | number; // 待付款（店铺填写）
    delivery_fee?: string | number; // 跑腿费（客户下单时系统自动生成的费用）
    delivery_distance?: number; // 配送距离 (KM)
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
  vacation_dates?: string[]; // 🚀 新增：休假日期列表 (YYYY-MM-DD)
  cod_settlement_day?: '7' | '10' | '15' | '30'; // 🚀 新增：COD 结清日
}

// 管理员账号服务
export const adminAccountService = {
  async login(username: string, password: string): Promise<AdminAccount | null> {
    try {
      // 方法1: 尝试使用 Netlify Function 验证密码（推荐，支持加密密码）
      let lastLoginError = null;

      // 准备尝试的 URL 列表
      const urlsToTry = [
        'https://admin-market-link-express.netlify.app', // 🚀 调整：优先使用 Netlify 默认域名，通常更稳定
        'https://admin-market-link-express.com',         // 顶级自定义域名
        netlifyUrl                                       // 配置的域名
      ].filter((v, i, a) => v && a.indexOf(v) === i); // 去重且过滤空值

      console.log('开始登录流程，尝试节点数量:', urlsToTry.length);

      for (const baseUrl of urlsToTry) {
        // 每个节点尝试最多 2 次
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const cleanBaseUrl = baseUrl.replace(/\/$/, ''); // 移除末尾斜杠
            console.log(`🌐 正在尝试节点 (第 ${attempt} 次): ${cleanBaseUrl}...`);
            
            const controller = new AbortController();
            // 🚀 大幅增加超时时间：第一次 15秒，第二次 30秒，适配缅甸极慢网络
            const timeoutValue = attempt === 1 ? 15000 : 30000; 
            const timeoutId = setTimeout(() => controller.abort(), timeoutValue);
          
            const response = await fetch(`${cleanBaseUrl}/.netlify/functions/admin-password`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Cache-Control': 'no-cache',
                'User-Agent': 'ML-Express-Rider-App'
              },
              body: JSON.stringify({ action: 'login', username, password }),
              signal: controller.signal
            });

            clearTimeout(timeoutId);

            // 🚀 核心修复：即使状态码不是 2xx (如 401)，也要尝试解析 JSON 获取具体错误原因
            const result = await response.json().catch(() => null);

            if (response.ok && result?.success && result?.account) {
              console.log(`✅ 节点 ${cleanBaseUrl} 验证成功`);
              const accountFromNetlify = result.account;
              
              // 异步更新数据库中的最后登录时间（非阻塞）
              try {
                supabase
                  .from('admin_accounts')
                  .update({ last_login: new Date().toISOString() })
                  .eq('id', accountFromNetlify.id)
                  .then(({error}) => {
                    if (error) console.warn('最后登录时间更新失败:', error.message);
                  });
              } catch (e) {}

              // 获取数据库中的最新完整信息（尝试一次，失败则使用缓存或 function 返回值）
              try {
                const { data, error } = await supabase
                  .from('admin_accounts')
                  .select('*')
                  .eq('username', username)
                  .single();

                if (!error && data) return data;
              } catch (dbError) {
                console.warn('获取数据库详细信息失败，使用基础信息');
              }
              
              return {
                ...accountFromNetlify,
                password: '',
                id: accountFromNetlify.id || '',
                status: accountFromNetlify.status || 'active'
              } as AdminAccount;
            } else if (response.status === 401 || (result && !result.success)) {
              // 处理业务逻辑错误 (如密码错误、账号停用等)
              lastLoginError = result?.error || '用户名或密码错误';
              console.warn(`❌ 验证失败 (${cleanBaseUrl}):`, lastLoginError);
              
              // 如果是明确的凭据错误，不要继续尝试其他节点，直接抛出异常
              if (lastLoginError.includes('密码') || lastLoginError.includes('用户名') || lastLoginError.includes('停用') || lastLoginError.includes('不存在') || lastLoginError.includes('过期')) {
                throw new Error(lastLoginError);
              }
            } else {
              console.warn(`⚠️ 节点 ${cleanBaseUrl} 返回异常状态: ${response.status}`);
              if (response.status === 404) break; // 路径不对，跳过此节点
            }
          } catch (err: any) {
            if (err.name === 'AbortError') {
              console.warn(`⏰ 节点 ${baseUrl} 请求超时 (尝试 ${attempt})`);
            } else if (err.message && (err.message.includes('密码') || err.message.includes('用户名') || err.message.includes('不存在') || err.message.includes('停用'))) {
              throw err; // 业务逻辑错误直接抛出
            } else {
              console.warn(`❌ 访问节点异常 (尝试 ${attempt}):`, err.message);
            }
            
            // 如果是最后一次尝试且失败，则继续下一个 URL
            if (attempt === 2) continue;
            // 否则稍等一会（1.5秒）后重试
            await new Promise(r => setTimeout(r, 1500));
          }
        }
      }

      // 如果所有云函数节点都失败，尝试直接数据库验证（仅支持旧的非加密账户）
      console.log('🔄 所有云节点失败，尝试最后兜底验证...');
      const { data: accountData, error: fetchError } = await supabase
        .from('admin_accounts')
        .select('*')
        .eq('username', username)
        .eq('status', 'active')
        .single();

      if (fetchError || !accountData) {
        if (fetchError?.message?.includes('Network')) {
          throw new Error('网络极度不稳定，请检查您的移动网络或 Wi-Fi 连接');
        }
        throw new Error(lastLoginError || '账号不存在或已停用');
      }

      // 检查密码是否加密
      const isPasswordHashed = accountData.password && accountData.password.startsWith('$2');

      if (isPasswordHashed) {
        console.error('🚫 无法验证加密密码：云服务超时且网络不稳定');
        throw new Error('服务器响应超时，请检查网络后重新尝试。');
      }

      // 密码是明文，直接比较（向后兼容）
      if (accountData.password !== password) {
        throw new Error('用户名或密码错误');
      }

      return accountData;
    } catch (err: any) {
      console.error('登录流程最终异常:', err);
      throw err;
    }
  },

  async updatePassword(username: string, currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      const response = await fetch(`${netlifyUrl}/.netlify/functions/admin-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'updatePassword',
          username: username,
          currentPassword: currentPassword,
          newPassword: newPassword
        })
      });

      if (response.ok) {
        const result = await response.json();
        return result.success;
      }
      return false;
    } catch (error) {
      console.error('更新密码失败:', error);
      return false;
    }
  },

  async updateUsername(currentUsername: string, newUsername: string): Promise<boolean> {
    try {
      const response = await fetch(`${netlifyUrl}/.netlify/functions/admin-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'updateUsername',
          currentUsername: currentUsername,
          newUsername: newUsername
        })
      });

      if (response.ok) {
        const result = await response.json();
        return result.success;
      }
      return false;
    } catch (error) {
      console.error('更新用户名失败:', error);
      return false;
    }
  }
};

// 包裹服务
export const packageService = {
  async getAllPackages(retryCount = 2): Promise<Package[]> {
    let lastError: any = null;
    
    console.log('📦 开始获取包裹列表');
    
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        const { data, error } = await supabase
          .from('packages')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          throw error;
        }
        
        // 成功获取数据，保存到缓存
        if (data && data.length > 0) {
          await AsyncStorage.setItem(CACHE_KEYS.PACKAGES, JSON.stringify(data));
          await AsyncStorage.setItem(CACHE_KEYS.LAST_FETCH, Date.now().toString());
        }
        
        return data || [];
      } catch (err: any) {
        lastError = err;
        console.warn(`获取包裹列表尝试 ${attempt + 1} 失败:`, err.message);
        
        if (attempt < retryCount) {
          await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1000));
          continue;
        }
      }
    }
    
    // 如果所有重试都失败，尝试从缓存读取
    console.log('⚠️ 所有重试失败，尝试加载本地缓存...');
    try {
      const cachedData = await AsyncStorage.getItem(CACHE_KEYS.PACKAGES);
      if (cachedData) {
        console.log('✅ 成功加载本地缓存数据');
        return JSON.parse(cachedData);
      }
    } catch (cacheErr) {
      console.error('读取缓存失败:', cacheErr);
    }
    
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
    // 🚀 离线支持逻辑
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      console.log('📶 检测到离线状态，正在缓存状态更新...');
      await cacheService.queueUpdate({
        packageId: id,
        type: 'status',
        status,
        pickupTime,
        deliveryTime,
        courierName
      });
      return true;
    }

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

    // 🚀 新增：自动记录审计日志
    try {
      const currentUserId = await AsyncStorage.getItem('currentUser') || 'unknown_mobile';
      const currentUserName = await AsyncStorage.getItem('currentUserName') || '骑手';
      
      await supabase.from('audit_logs').insert([{
        user_id: currentUserId,
        user_name: currentUserName,
        action_type: 'update',
        module: 'packages',
        target_id: id,
        target_name: `包裹 ${id}`,
        action_description: `骑手更新状态为：${status}${courierName ? ' (执行人: ' + courierName + ')' : ''}`,
        new_value: JSON.stringify({ status, courier: courierName }),
        action_time: new Date().toISOString()
      }]);
    } catch (logError) {
      console.warn('记录移动端审计日志失败:', logError);
    }
    
    // 如果是送达状态，进行违规检测
    if (status === '已送达') {
      try {
        console.log('🏁 订单已送达，启动自动违规检测...');
        
        // 1. 获取包裹详情
        const { data: packageData } = await supabase
          .from('packages')
          .select('receiver_latitude, receiver_longitude, courier, customer_id')
          .eq('id', id)
          .single();

        if (packageData) {
          // 2. 获取骑手坐标 (优先使用传入的，如果没有则尝试从 locationService 获取最新的)
          let finalLat = courierLocation?.latitude;
          let finalLng = courierLocation?.longitude;

          if (!finalLat || !finalLng) {
            try {
              const { locationService } = require('./locationService');
              const currentLoc = await locationService.getCurrentLocation();
              if (currentLoc) {
                finalLat = currentLoc.latitude;
                finalLng = currentLoc.longitude;
                console.log('📍 已自动获取骑手当前位置用于违规检测:', { finalLat, finalLng });
              }
            } catch (locErr) {
              console.warn('⚠️ 自动获取位置失败:', locErr);
            }
          }

          // 3. 执行违规检测 (异步执行，不阻塞主流程)
          const realCourierId = await AsyncStorage.getItem('currentCourierId') || courierName || packageData.courier || '未知';
          detectViolationsAsync(id, realCourierId, finalLat || 0, finalLng || 0).catch(e => console.error('Violation detection failed:', e));

          // 4. 🚀 通知寄件人订单已送达
          if (packageData.customer_id) {
            try {
              const { notificationService } = require('./notificationService');
              await notificationService.notifySenderOnDelivery(id, packageData.customer_id);
              console.log(`✅ 已发送送达通知给寄件人 (ID: ${packageData.customer_id})`);
            } catch (notifErr) {
              console.warn('⚠️ 发送送达通知失败:', notifErr);
            }
          }
        }
      } catch (error) {
        console.error('❌ 送达后续处理失败:', error);
      }
    }
    
    return true;
  },

  /**
   * 同步离线更新
   */
  async syncOfflineUpdates() {
    const queue = await cacheService.getOfflineQueue();
    if (queue.length === 0) return;

    console.log(`🔄 正在同步 ${queue.length} 条离线记录...`);
    
    for (const item of queue) {
      if (item.retryCount > 5) {
        console.warn(`⚠️ 记录 ${item.id} 重试次数过多，跳过`);
        continue;
      }

      try {
        let success = false;
        if (item.type === 'status') {
          success = await this.updatePackageStatus(
            item.packageId, 
            item.status!, 
            item.pickupTime, 
            item.deliveryTime, 
            item.courierName
          );
        } else if (item.type === 'photo' && item.photoData) {
          success = await deliveryPhotoService.saveDeliveryPhoto({
            packageId: item.packageId,
            ...item.photoData,
            courierName: item.courierName || '未知'
          });
        }
        
        if (success) {
          await cacheService.removeFromQueue(item.id);
          console.log(`✅ 成功同步离线记录: ${item.id}`);
        } else {
          await cacheService.incrementRetry(item.id);
        }
      } catch (error) {
        console.warn('同步离线记录失败:', error);
        await cacheService.incrementRetry(item.id);
      }
    }
  },

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

  /**
   * 🚀 新增：骑手异常上报
   */
  async reportAnomaly(reportData: {
    packageId: string;
    courierId: string;
    courierName: string;
    anomalyType: string;
    description: string;
    location?: { latitude: number, longitude: number }
  }): Promise<boolean> {
    try {
      console.log('📝 正在提交异常上报:', reportData);
      
      // 1. 获取包裹详情
      const { data: pkg } = await supabase
        .from('packages')
        .select('receiver_latitude, receiver_longitude, sender_name, receiver_name')
        .eq('id', reportData.packageId)
        .single();

      // 2. 插入到 delivery_alerts 表
      const { error } = await supabase
        .from('delivery_alerts')
        .insert([{
          package_id: reportData.packageId,
          courier_id: reportData.courierId,
          courier_name: reportData.courierName,
          alert_type: 'rider_report',
          severity: 'medium',
          title: `骑手主动上报: ${reportData.anomalyType}`,
          description: reportData.description,
          courier_latitude: reportData.location?.latitude || 0,
          courier_longitude: reportData.location?.longitude || 0,
          destination_latitude: pkg?.receiver_latitude || 0,
          destination_longitude: pkg?.receiver_longitude || 0,
          status: 'pending',
          metadata: {
            report_type: reportData.anomalyType,
            sender: pkg?.sender_name,
            receiver: pkg?.receiver_name
          }
        }]);

      if (error) throw error;

      // 🚀 新增：同时更新包裹状态为“异常上报”，确保全端同步
      await supabase
        .from('packages')
        .update({ status: '异常上报', updated_at: new Date().toISOString() })
        .eq('id', reportData.packageId);

      // 3. 记录审计日志
      await auditLogService.log({
        user_id: reportData.courierId,
        user_name: reportData.courierName,
        action_type: 'create',
        module: 'packages',
        target_id: reportData.packageId,
        action_description: `骑手提交异常上报: ${reportData.anomalyType}`
      });

      return true;
    } catch (error) {
      console.error('❌ 异常上报失败:', error);
      return false;
    }
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
      // 🚀 离线支持逻辑
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        console.log('📶 检测到离线状态，正在缓存照片上传...');
        await cacheService.queueUpdate({
          packageId: photoData.packageId,
          type: 'photo',
          courierName: photoData.courierName,
          photoData: {
            photoBase64: photoData.photoBase64,
            photoUrl: photoData.photoUrl,
            courierId: photoData.courierId,
            latitude: photoData.latitude,
            longitude: photoData.longitude,
            locationName: photoData.locationName
          }
        });
        return true;
      }

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
