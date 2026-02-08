import * as Battery from 'expo-battery';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import * as Device from 'expo-device';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabase';

// 🚀 修复：expo-file-system v54+ 中 getFreeDiskStorageAsync 已弃用，使用 legacy 导入或新 API
const getFreeDiskStorage = (FileSystem as any).getFreeDiskStorageAsync || 
                           (require('expo-file-system/legacy')?.getFreeDiskStorageAsync);

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

      if (status === 'granted' && enabled) {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        accuracy = loc.coords.accuracy || undefined;
        isPrecise = (accuracy !== undefined && accuracy < 50); // 50米精度内认为精确
      }

      report.location = {
        enabled: status === 'granted' && enabled,
        accuracy,
        isPrecise
      };
      if (!report.location.enabled || !isPrecise) report.isOk = false;
    } catch (e) {
      console.warn('Location check failed', e);
    }

    // 3. 检查存储
    try {
      const freeSpace = await getFreeDiskStorage();
      report.storage = {
        freeSpace,
        isLow: freeSpace < 500 * 1024 * 1024, // 低于 500MB 警告
      };
      if (report.storage.isLow) report.isOk = false;
    } catch (e) {
      console.warn('Storage check failed', e);
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
