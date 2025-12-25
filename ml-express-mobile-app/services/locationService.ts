import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { Platform, Alert } from 'react-native';

const BACKGROUND_LOCATION_TASK = 'background-location-task';

/**
 * 定义后台任务
 */
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: any) => {
  if (error) {
    console.error('后台位置任务错误:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    const location = locations[0];
    if (location) {
      // console.log('📍 收到后台位置更新:', location.coords);
      await saveLocationToSupabase(location.coords.latitude, location.coords.longitude);
    }
  }
});

/**
 * 保存位置到 Supabase
 */
async function saveLocationToSupabase(latitude: number, longitude: number) {
  try {
    const courierId = await AsyncStorage.getItem('currentCourierId');
    if (!courierId) return;

    // 节流逻辑：从 AsyncStorage 读取上次更新时间
    const lastUpdateStr = await AsyncStorage.getItem('last_location_update_time');
    const now = Date.now();
    const lastUpdate = lastUpdateStr ? parseInt(lastUpdateStr) : 0;

    // 至少间隔 1 分钟更新一次数据库（后台模式下）
    if (now - lastUpdate < 60 * 1000) return;

    await supabase
      .from('couriers')
      .update({
        current_location: { latitude, longitude },
        last_active: new Date().toISOString()
      })
      .eq('id', courierId);

    await AsyncStorage.setItem('last_location_update_time', now.toString());
    // console.log('✅ 后台位置同步成功');
  } catch (err) {
    // console.error('后台位置同步失败:', err);
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
    const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
    if (isTaskRegistered) {
      // 如果已注册，先停止再启动，确保配置更新
      try { await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK); } catch (e) {}
    }

    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 60000,
      distanceInterval: 50,
      foregroundService: {
        notificationTitle: "ML Express 配送员助手",
        notificationBody: "正在为您提供实时的位置同步与派单服务",
        notificationColor: "#2c5282",
      },
      pausesUpdatesAutomatically: false,
    });
    console.log('🚀 后台位置追踪已启动');
  },

  /**
   * 停止追踪
   */
  async stopBackgroundTracking() {
    try {
      const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
      if (isTaskRegistered) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        console.log('🛑 后台位置追踪已停止');
      }
    } catch (err) {
      console.error('停止后台追踪失败:', err);
    }
  }
};

