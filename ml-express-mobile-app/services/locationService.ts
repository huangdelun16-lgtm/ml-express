import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { Platform, Alert } from 'react-native';

const LOCATION_TRACKING_TASK = 'LOCATION_TRACKING_TASK';

// 🚀 坐标平滑处理状态
let lastLat = 0;
let lastLng = 0;
const SMOOTHING_FACTOR = 0.35; // 卡尔曼滤波简易版系数：越小越平滑，越大越实时

/**
 * 定义后台任务
 */
TaskManager.defineTask(LOCATION_TRACKING_TASK, async ({ data, error }: any) => {
  if (error) {
    console.error('后台位置任务错误:', error);
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

    // 🚀 动态间隔：高速移动时 10s 更新，静止时 60s 更新
    const minInterval = isMoving ? 10 * 1000 : 60 * 1000;
    if (now - lastUpdate < minInterval) return;

    // 更新 courier_locations 表
    const { error: locError } = await supabase
      .from('courier_locations')
      .upsert({
        courier_id: courierId,
        latitude,
        longitude,
        last_update: new Date().toISOString(),
        status: isMoving ? 'active' : 'static'
      }, { onConflict: 'courier_id' });

    if (locError) {
      console.warn('⚠️ 更新实时位置失败:', locError.message);
    }

    // 同时更新 couriers 表的最后活跃时间
    await supabase
      .from('couriers')
      .update({
        last_active: new Date().toISOString(),
        last_latitude: latitude,
        last_longitude: longitude,
        last_location_update: new Date().toISOString()
      })
      .eq('id', courierId);

    await AsyncStorage.setItem('last_location_update_time', now.toString());
    // console.log(`📍 位置同步成功 (${isMoving ? '移动' : '静止'}):`, { latitude, longitude });
  } catch (err) {
    // console.error('位置同步异常:', err);
  }
}

export const locationService = {
  /**
   * 启动后台位置追踪
   */
  async startBackgroundTracking() {
    try {
      // 1. 检查前台权限
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        console.warn('未获得前台位置权限');
        return false;
      }

      // 2. 检查后台权限
      const { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync();
      
      if (backgroundStatus !== 'granted') {
        // Google Play 要求：必须向用户明确解释为什么需要后台位置权限
        return new Promise((resolve) => {
          Alert.alert(
            '📍 后台位置权限说明',
            '为了确保您在切换到后台或锁屏时，系统仍能为您精准派单并记录配送路径，我们需要您开启“始终允许”位置权限。',
            [
              {
                text: '去设置',
                onPress: async () => {
                  const { status: newStatus } = await Location.requestBackgroundPermissionsAsync();
                  if (newStatus === 'granted') {
                    await this.enableUpdates();
                    resolve(true);
                  } else {
                    resolve(false);
                  }
                }
              },
              {
                text: '暂时不需要',
                onPress: () => resolve(false),
                style: 'cancel'
              }
            ]
          );
        });
      }

      await this.enableUpdates();
      return true;
    } catch (err) {
      console.error('启动后台追踪失败:', err);
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

    await Location.startLocationUpdatesAsync(LOCATION_TRACKING_TASK, {
      accuracy: Location.Accuracy.BestForNavigation, // 🚀 升级为导航最高精度
      timeInterval: 5000, // 🚀 缩短至 5 秒采集一次，处理动态频率逻辑
      distanceInterval: 10, // 🚀 缩短至 10 米位移触发
      showsBackgroundLocationIndicator: true, // 🚀 iOS 专属：显示蓝色持续定位指示器
      foregroundService: {
        notificationTitle: "ML Express 配送员助手正在运行",
        notificationBody: "保持后台运行以接收新订单并记录配送轨迹",
        notificationColor: "#3b82f6",
      },
      pausesUpdatesAutomatically: false,
      deferredUpdatesInterval: 5000,
      deferredUpdatesDistance: 10,
    });
    console.log('🚀 后台位置追踪已启动 (最高精度导航模式)');
  },

  /**
   * 停止追踪
   */
  async stopBackgroundTracking() {
    try {
      const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TRACKING_TASK);
      if (isTaskRegistered) {
        await Location.stopLocationUpdatesAsync(LOCATION_TRACKING_TASK);
        console.log('🛑 后台位置追踪已停止');
      }
    } catch (err) {
      console.error('停止后台追踪失败:', err);
    }
  }
};

