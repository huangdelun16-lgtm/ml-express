import * as Battery from 'expo-battery';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import * as Device from 'expo-device';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabase';

export interface HealthReport {
  isOk: boolean;
  battery: {
    level: number;
    isLow: boolean;
  };
  location: {
    enabled: boolean;
    accuracy?: number; // meters
    isPrecise: boolean;
    isMocked: boolean; // 🚀 新增：是否使用模拟定位
  };
  storage: {
    freeSpace: number; // bytes
    isLow: boolean;
  };
  network: {
    isConnected: boolean;
    latencyMs?: number;
  };
  device: {
    modelName: string | null;
    osVersion: string | null;
    isDeveloperMode: boolean; // 🚀 新增：是否开启开发者模式
  };
}

export const deviceHealthService = {
  /**
   * 执行完整的设备健康检查
   */
  async performFullCheck(): Promise<HealthReport> {
    const report: Partial<HealthReport> = {
      isOk: true,
      device: {
        modelName: Device.modelName,
        osVersion: Device.osVersion,
        isDeveloperMode: __DEV__, // 在 React Native 中，__DEV__ 可以作为一种基础判断
      }
    };

    // 1. 检查电池
    try {
      const batteryLevel = await Battery.getBatteryLevelAsync();
      report.battery = {
        level: Math.round(batteryLevel * 100),
        isLow: batteryLevel < 0.2, // 低于 20% 警告
      };
      if (report.battery.isLow) report.isOk = false;
    } catch (e) {
      console.warn('Battery check failed', e);
    }

    // 2. 检查定位
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      const enabled = await Location.hasServicesEnabledAsync();
      
      let accuracy: number | undefined;
      let isPrecise = false;
      let isMocked = false;

      if (status === 'granted' && enabled) {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        accuracy = loc.coords.accuracy || undefined;
        isPrecise = (accuracy !== undefined && accuracy < 50); // 50米精度内认为精确
        isMocked = (loc as any).mocked || false; // 部分 Android 设备会返回 mocked 字段
      }

      report.location = {
        enabled: status === 'granted' && enabled,
        accuracy,
        isPrecise,
        isMocked
      };
      if (!report.location.enabled || !isPrecise || isMocked) report.isOk = false;
    } catch (e) {
      console.warn('Location check failed', e);
    }

    // 3. 检查存储
    try {
      // 🚀 核心修复：更健壮的存储检查逻辑，适配不同 SDK 版本
      let getStorageFn = (FileSystem as any).getFreeDiskStorageAsync;
      
      // 如果直接获取不到，尝试从 legacy 路径获取
      if (!getStorageFn) {
        try {
          const legacy = require('expo-file-system/legacy');
          getStorageFn = legacy?.getFreeDiskStorageAsync;
        } catch (e) {
          // 忽略 require 错误
        }
      }

      if (typeof getStorageFn === 'function') {
        const freeSpace = await getStorageFn();
        report.storage = {
          freeSpace,
          isLow: freeSpace < 500 * 1024 * 1024, // 低于 500MB 警告
        };
        if (report.storage.isLow) report.isOk = false;
      } else {
        // 如果 API 完全不可用，设置一个默认值，不触发报警
        report.storage = { freeSpace: 1024 * 1024 * 1024, isLow: false };
      }
    } catch (e) {
      console.warn('Storage check failed', e);
      // 发生异常时也设置默认值，防止下游崩溃
      report.storage = { freeSpace: 1024 * 1024 * 1024, isLow: false };
    }

    // 4. 检查网络和延迟
    try {
      const net = await NetInfo.fetch();
      const start = Date.now();
      // 简单探测 Supabase 响应
      const { error } = await supabase.from('couriers').select('id').limit(1);
      const latencyMs = Date.now() - start;

      report.network = {
        isConnected: !!net.isConnected && !error,
        latencyMs
      };
      if (!report.network.isConnected) report.isOk = false;
    } catch (e) {
      report.network = { isConnected: false };
      report.isOk = false;
    }

    return report as HealthReport;
  }
};
