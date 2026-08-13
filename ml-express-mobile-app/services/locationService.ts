import { logger } from './LoggerService';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { hasAcceptedLocationDisclosure } from '../utils/locationDisclosureStorage';
import {
  requestForegroundPermissionsIfDisclosed,
  requestBackgroundPermissionsIfDisclosed,
} from '../utils/locationPermissionGate';
import { checkRouteArrivalAtLocation } from './routeNavigationSession';

const LOCATION_TRACKING_TASK = 'LOCATION_TRACKING_TASK';

export type CourierLocationPayload = {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  battery_level?: number;
  status?: string;
  last_update?: string;
};

/** 同步骑手坐标到 courier_locations + couriers（含 upsert 失败时的 insert/update 回退） */
export async function syncCourierLocationToSupabase(
  courierId: string,
  payload: CourierLocationPayload,
): Promise<boolean> {
  const lastUpdate = payload.last_update || new Date().toISOString();
  const row = {
    courier_id: courierId,
    latitude: payload.latitude,
    longitude: payload.longitude,
    heading: payload.heading,
    speed: payload.speed,
    battery_level: payload.battery_level,
    status: payload.status || 'active',
    last_update: lastUpdate,
  };

  let locOk = false;
  const { error: upsertError } = await supabase
    .from('courier_locations')
    .upsert(row, { onConflict: 'courier_id' });

  if (upsertError) {
    const { data: existing } = await supabase
      .from('courier_locations')
      .select('id')
      .eq('courier_id', courierId)
      .maybeSingle();

    const { error: writeError } = existing
      ? await supabase.from('courier_locations').update(row).eq('courier_id', courierId)
      : await supabase.from('courier_locations').insert([row]);

    if (writeError) {
      logger.warn('⚠️ 更新实时位置失败:', writeError.message);
    } else {
      locOk = true;
    }
  } else {
    locOk = true;
  }

  const { error: courierError } = await supabase
    .from('couriers')
    .update({
      last_active: lastUpdate,
      last_latitude: payload.latitude,
      last_longitude: payload.longitude,
      last_location_update: lastUpdate,
    })
    .eq('id', courierId);

  if (courierError) {
    logger.warn('⚠️ 更新 couriers 地理字段失败:', courierError.message);
  }

  return locOk;
}

// 🚀 坐标平滑处理状态
let lastLat = 0;
let lastLng = 0;
const SMOOTHING_FACTOR = 0.35; // 卡尔曼滤波简易版系数：越小越平滑，越大越实时

/**
 * 定义后台任务
 */
TaskManager.defineTask(LOCATION_TRACKING_TASK, async ({ data, error }: any) => {
  if (error) {
    logger.error('后台位置任务错误:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    const location = locations[0];
    if (location) {
      let { latitude, longitude } = location.coords;
      const speed = location.coords.speed || 0; // 米/秒

      // 1. 🚀 坐标平滑算法 (Simple Low-pass Filter)
      if (lastLat === 0) {
        lastLat = latitude;
        lastLng = longitude;
      } else {
        latitude = lastLat + SMOOTHING_FACTOR * (latitude - lastLat);
        longitude = lastLng + SMOOTHING_FACTOR * (longitude - lastLng);
        lastLat = latitude;
        lastLng = longitude;
      }

      // 2. 🚀 动态上报频率补偿
      // 如果速度极低（静止），跳过更新以省电；如果正在移动，执行保存
      const isMoving = speed > 0.5; // 大约 1.8km/h 以上视为移动
      
      await saveLocationToSupabase(latitude, longitude, isMoving);
    }
  }
});

/**
 * 保存位置到 Supabase
 */
async function saveLocationToSupabase(latitude: number, longitude: number, isMoving: boolean) {
  try {
    const courierId = await AsyncStorage.getItem('currentCourierId');
    if (!courierId) return;

    // 节流逻辑：从 AsyncStorage 读取上次更新时间
    const lastUpdateStr = await AsyncStorage.getItem('last_location_update_time');
    const now = Date.now();
    const lastUpdate = lastUpdateStr ? parseInt(lastUpdateStr) : 0;

    // 动态间隔：移动时 20s，静止 120s（上报仍节流，减轻服务器与射频唤醒）
    const minInterval = isMoving ? 20 * 1000 : 120 * 1000;
    if (now - lastUpdate < minInterval) return;

    await syncCourierLocationToSupabase(courierId, {
      latitude,
      longitude,
      status: isMoving ? 'active' : 'static',
    });

    void checkRouteArrivalAtLocation(latitude, longitude);

    await AsyncStorage.setItem('last_location_update_time', now.toString());
    // logger.log(`📍 位置同步成功 (${isMoving ? '移动' : '静止'}):`, { latitude, longitude });
  } catch (err) {
    // logger.error('位置同步异常:', err);
  }
}

export const locationService = {
  /**
   * 单次读取当前坐标（经显著披露 + Android 全屏预检后再请求系统权限）
   */
  async getCurrentLocation(languageHint?: string): Promise<{ latitude: number; longitude: number } | null> {
    try {
      const { status } = await requestForegroundPermissionsIfDisclosed(languageHint);
      if (status !== 'granted') return null;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      return { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
    } catch {
      return null;
    }
  },

  /**
   * 启动后台位置追踪
   */
  async startBackgroundTracking() {
    try {
      if (!(await hasAcceptedLocationDisclosure())) {
        return false;
      }
      
      // 1. 检查前台权限
      const existingFg = await Location.getForegroundPermissionsAsync();
      if (existingFg.status !== 'granted') {
        const { status: foregroundStatus } = await requestForegroundPermissionsIfDisclosed();
        if (foregroundStatus !== 'granted') {
          logger.warn('未获得前台位置权限');
          return false;
        }
        // 增加小延迟，避免连续弹窗
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      // 2. 检查后台权限
      const { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync();

      if (backgroundStatus !== 'granted') {
        const { status: newStatus } = await requestBackgroundPermissionsIfDisclosed();
        if (newStatus !== 'granted') {
          logger.warn('后台位置权限被拒绝，将无法在后台持续追踪配送进度');
          return false;
        }
      }

      await this.enableUpdates();
      return true;
    } catch (err) {
      logger.error('启动后台追踪失败:', err);
      return false;
    }
  },

  /**
   * 真正开启位置更新
   */
  async enableUpdates() {
    const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TRACKING_TASK);
    if (isTaskRegistered) {
      // 如果已注册，先停止再启动，确保配置更新
      try { await Location.stopLocationUpdatesAsync(LOCATION_TRACKING_TASK); } catch (e) {}
    }

    // Balanced + 较长间隔：登录后默认省电轨迹；地图页有在途单时会按模式覆盖
    await Location.startLocationUpdatesAsync(LOCATION_TRACKING_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 35000,
      distanceInterval: 80,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "ML Express 配送员助手正在运行",
        notificationBody: "保持后台运行以接收新订单并记录配送轨迹",
        notificationColor: "#3b82f6",
      },
      pausesUpdatesAutomatically: true,
      deferredUpdatesInterval: 35000,
      deferredUpdatesDistance: 80,
    });
    logger.log('🚀 后台位置追踪已启动 (Balanced · 省电默认)');
  },

  /**
   * 停止追踪
   */
  async stopBackgroundTracking() {
    try {
      const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TRACKING_TASK);
      if (isTaskRegistered) {
        await Location.stopLocationUpdatesAsync(LOCATION_TRACKING_TASK);
        logger.log('🛑 后台位置追踪已停止');
      }
    } catch (err) {
      logger.error('停止后台追踪失败:', err);
    }
  }
};

