import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { cacheService } from './cacheService';
import { detectViolationsAsync } from './detectViolations';
import { supabase } from './staffApi/supabaseClient';
import type {
  Package,
  AuditLog,
  Courier,
  RouteOptimization,
  DeliveryStore,
  Notification,
} from './staffApi/types';

export { supabase, netlifyUrl } from './staffApi/supabaseClient';
export type {
  Package,
  AdminAccount,
  AuditLog,
  Courier,
  RouteOptimization,
  DeliveryStore,
  Notification,
} from './staffApi/types';
export { adminAccountService } from './staffApi/adminAccountService';

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


// 计费合并算法 + 领区解析已抽到 /shared/src/pricing.ts，此处导入并对外再导出
import {
  DEFAULT_PRICING_REGION_FALLBACK,
  PRICING_REGION_IDS,
  buildPricingSettings,
  parsePricingSettingValue,
  resolvePackagePricingRegionId,
  getRegionalPricingForPackage,
  resolveRiderPricingRegionId,
} from './_shared/pricing';

export {
  PRICING_REGION_IDS,
  resolvePackagePricingRegionId,
  getRegionalPricingForPackage,
  resolveRiderPricingRegionId,
};

export const systemSettingsService = {
  async getPricingSettings(region?: string): Promise<Record<string, number>> {
    const defaults: Record<string, number> = {
      base_fee: 1500,
      per_km_fee: 250,
      weight_surcharge: 150,
      urgent_surcharge: 500,
      scheduled_surcharge: 200,
      oversize_surcharge: 300,
      fragile_surcharge: 300,
      food_beverage_surcharge: 300,
      free_km_threshold: 3,
      courier_km_rate: 500,
      way_side_courier_per_order: 0,
    };

    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('settings_key, settings_value')
        .like('settings_key', 'pricing.%');

      if (error) throw error;

      return buildPricingSettings(data, region, { defaults });
    } catch (err) {
      console.warn('获取计费规则失败，使用默认值:', err);
      return { ...defaults };
    }
  },

  /** 一次拉取各领区合并后的计费（财务/骑手按单匹配领区） */
  async getRegionalPricingMap(
    regionIds: readonly string[] = PRICING_REGION_IDS,
  ): Promise<Record<string, Record<string, number>>> {
    const DEFAULTS: Record<string, number> = {
      base_fee: 1500,
      per_km_fee: 250,
      weight_surcharge: 150,
      urgent_surcharge: 500,
      oversize_surcharge: 300,
      scheduled_surcharge: 200,
      fragile_surcharge: 300,
      food_beverage_surcharge: 300,
      free_km_threshold: 3,
      courier_km_rate: 500,
      way_side_courier_per_order: 0,
      delivery_bonus_rate: 0,
    };

    const globalOverrides: Record<string, number> = {};
    const regionalOverrides: Record<string, Record<string, number>> = {};

    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('settings_key, settings_value')
        .like('settings_key', 'pricing.%');

      if (error) throw error;

      data?.forEach((item: { settings_key: string; settings_value: unknown }) => {
        const key = item.settings_key;
        const parts = key.split('.');
        if (parts[0] !== 'pricing') return;
        const val = parsePricingSettingValue(item.settings_value);
        if (parts.length === 2) {
          globalOverrides[parts[1]] = val;
        } else if (parts.length === 3) {
          const reg = parts[1].toLowerCase();
          const field = parts[2];
          if (!regionalOverrides[reg]) regionalOverrides[reg] = {};
          regionalOverrides[reg][field] = val;
        }
      });
    } catch (e) {
      console.warn('getRegionalPricingMap failed:', e);
    }

    const result: Record<string, Record<string, number>> = {};
    for (const rid of regionIds) {
      const r = rid.toLowerCase();
      result[r] = {
        ...DEFAULTS,
        ...globalOverrides,
        ...(regionalOverrides[r] || {}),
      };
    }
    return result;
  },
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
    storeInfo?: { storeId: string; storeName: string; receiveCode: string },
    courierLocation?: { latitude: number; longitude: number },
    options?: { fromSync?: boolean }
  ): Promise<boolean> {
    const queuePayload = {
      packageId: id,
      type: 'status' as const,
      status,
      pickupTime,
      deliveryTime,
      courierName,
      transferCode,
      storeInfo,
      courierLocation,
    };

    const netState = await NetInfo.fetch();
    const treatOffline =
      !netState.isConnected || netState.isInternetReachable === false;

    if (treatOffline) {
      if (options?.fromSync) {
        return false;
      }
      console.log('📶 网络不可用，状态更新已加入待同步队列');
      await cacheService.queueUpdate(queuePayload);
      return true;
    }

    const ok = await this._applyPackageStatusRemote(
      id,
      status,
      pickupTime,
      deliveryTime,
      courierName,
      transferCode,
      storeInfo,
      courierLocation
    );

    if (!ok && !options?.fromSync) {
      console.warn('📶 服务端更新失败，已加入待同步队列');
      await cacheService.queueUpdate(queuePayload);
      return true;
    }

    return ok;
  },

  /**
   * 仅执行远端更新（不入队）；供 sync 与在线路径复用
   */
  async _applyPackageStatusRemote(
    id: string,
    status: string,
    pickupTime?: string,
    deliveryTime?: string,
    courierName?: string,
    transferCode?: string,
    storeInfo?: { storeId: string; storeName: string; receiveCode: string },
    courierLocation?: { latitude: number; longitude: number }
  ): Promise<boolean> {
    const updateData: any = { status };

    if (pickupTime) updateData.pickup_time = pickupTime;
    if (deliveryTime) updateData.delivery_time = deliveryTime;
    if (courierName) updateData.courier = courierName;
    if (transferCode) updateData.transfer_code = transferCode;

    if (status === '已送达' && storeInfo) {
      updateData.delivery_store_id = storeInfo.storeId;
      updateData.delivery_store_name = storeInfo.storeName;
      updateData.store_receive_code = storeInfo.receiveCode;
    }

    console.log('更新包裹数据:', { id, updateData });

    const { error } = await supabase.from('packages').update(updateData).eq('id', id);

    if (error) {
      console.error('更新包裹状态失败:', error);
      return false;
    }

    console.log('包裹状态更新成功');

    try {
      const currentUserId = (await AsyncStorage.getItem('currentUser')) || 'unknown_mobile';
      const currentUserName = (await AsyncStorage.getItem('currentUserName')) || '骑手';

      await supabase.from('audit_logs').insert([
        {
          user_id: currentUserId,
          user_name: currentUserName,
          action_type: 'update',
          module: 'packages',
          target_id: id,
          target_name: `包裹 ${id}`,
          action_description: `骑手更新状态为：${status}${courierName ? ' (执行人: ' + courierName + ')' : ''}`,
          new_value: JSON.stringify({ status, courier: courierName }),
          action_time: new Date().toISOString(),
        },
      ]);
    } catch (logError) {
      console.warn('记录移动端审计日志失败:', logError);
    }

    if (status === '已送达') {
      try {
        console.log('🏁 订单已送达，启动自动违规检测...');

        const { data: packageData } = await supabase
          .from('packages')
          .select('receiver_latitude, receiver_longitude, courier, customer_id')
          .eq('id', id)
          .single();

        if (packageData) {
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

          const realCourierId =
            (await AsyncStorage.getItem('currentCourierId')) || courierName || packageData.courier || '未知';
          detectViolationsAsync(id, realCourierId, finalLat || 0, finalLng || 0).catch((e) =>
            console.error('Violation detection failed:', e)
          );

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

    const netState = await NetInfo.fetch();
    if (!netState.isConnected || netState.isInternetReachable === false) {
      return;
    }

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
            item.courierName,
            item.transferCode,
            item.storeInfo,
            item.courierLocation,
            { fromSync: true }
          );
        } else if (item.type === 'photo' && item.photoData) {
          success = await deliveryPhotoService.saveDeliveryPhoto({
            packageId: item.packageId,
            ...item.photoData,
            courierName: item.courierName || '未知',
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
   * 扫码主路径：按包裹号 / 寄件码 / 中转码精确查找（避免全表拉取）
   */
  async findPackageByScanCode(raw: string): Promise<Package | null> {
    const code = String(raw || '').trim();
    if (!code || code.startsWith('STORE_')) return null;

    try {
      const byId = await this.getPackageById(code);
      if (byId) return byId;

      const { data: bySender, error: senderErr } = await supabase
        .from('packages')
        .select('*')
        .eq('sender_code', code)
        .maybeSingle();
      if (!senderErr && bySender) return bySender;

      if (code.startsWith('TC') || /^TC/i.test(code)) {
        const { data: byTransfer, error: transferErr } = await supabase
          .from('packages')
          .select('*')
          .eq('transfer_code', code)
          .maybeSingle();
        if (!transferErr && byTransfer) return byTransfer;
      }

      return null;
    } catch (err) {
      console.error('扫码查找包裹失败:', err);
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
  },

  /** 合伙店铺商品 name → price，用于骑手端解析订单商品单价/小计（与商家端一致） */
  async getProductPriceMapByStoreId(
    storeId: string | undefined | null,
  ): Promise<Record<string, number>> {
    if (!storeId) return {};
    try {
      const { data, error } = await supabase
        .from('products')
        .select('name, price')
        .eq('store_id', storeId);
      if (error || !data?.length) return {};
      return data.reduce<Record<string, number>>((acc, row: any) => {
        if (row?.name != null)
          acc[String(row.name).trim()] = Number(row.price) || 0;
        return acc;
      }, {});
    } catch (err) {
      console.warn('获取店铺商品价格映射失败:', err);
      return {};
    }
  },
};

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
      // 服务端保留 7 天：Supabase cleanup_expired_delivery_photos + Netlify cleanup-delivery-photos 定时任务
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
