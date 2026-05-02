import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import type { Package } from './supabase';

export const OFFLINE_QUEUE_CHANGED = 'offline_queue_changed';

const PACKAGES_CACHE_KEY = 'offline_packages_cache';
const CACHE_TIMESTAMP_KEY = 'offline_cache_timestamp';
const OFFLINE_QUEUE_KEY = 'offline_update_queue';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24小时

export interface OfflineUpdate {
  id: string;
  packageId: string;
  type: 'status' | 'photo';
  status?: string;
  pickupTime?: string;
  deliveryTime?: string;
  courierName?: string;
  transferCode?: string;
  storeInfo?: { storeId: string; storeName: string; receiveCode: string };
  courierLocation?: { latitude: number; longitude: number };
  photoData?: {
    photoBase64?: string;
    photoUrl?: string;
    courierId?: string;
    latitude?: number;
    longitude?: number;
    locationName?: string;
  };
  timestamp: number;
  retryCount: number;
}

export const cacheService = {
  /**
   * 将更新加入离线队列
   */
  async queueUpdate(update: Omit<OfflineUpdate, 'id' | 'timestamp' | 'retryCount'>) {
    try {
      const queueJson = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      const queue: OfflineUpdate[] = queueJson ? JSON.parse(queueJson) : [];
      
      const newUpdate: OfflineUpdate = {
        ...update,
        id: `upd_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        timestamp: Date.now(),
        retryCount: 0
      };
      
      queue.push(newUpdate);
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      DeviceEventEmitter.emit(OFFLINE_QUEUE_CHANGED, { count: queue.length });
      console.log(`📦 已加入离线更新队列 [${update.type}]:`, newUpdate.packageId);
      return true;
    } catch (error) {
      console.error('Failed to queue offline update:', error);
      return false;
    }
  },

  /**
   * 更新队列中的重试次数
   */
  async incrementRetry(updateId: string) {
    try {
      const queueJson = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      if (!queueJson) return;
      const queue: OfflineUpdate[] = JSON.parse(queueJson);
      const index = queue.findIndex(item => item.id === updateId);
      if (index !== -1) {
        queue[index].retryCount += 1;
        await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
        DeviceEventEmitter.emit(OFFLINE_QUEUE_CHANGED, { count: queue.length });
      }
    } catch (error) {}
  },

  /**
   * 获取所有离线更新
   */
  async getOfflineQueue(): Promise<OfflineUpdate[]> {
    try {
      const queueJson = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      return queueJson ? JSON.parse(queueJson) : [];
    } catch (error) {
      return [];
    }
  },

  /**
   * 从队列中移除已同步的项
   */
  async removeFromQueue(updateId: string) {
    try {
      const queueJson = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      if (!queueJson) return;
      
      const queue: OfflineUpdate[] = JSON.parse(queueJson);
      const newQueue = queue.filter(item => item.id !== updateId);
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(newQueue));
      DeviceEventEmitter.emit(OFFLINE_QUEUE_CHANGED, { count: newQueue.length });
    } catch (error) {
      console.error('Failed to remove from queue:', error);
    }
  },
  /**
   * 保存包裹数据到离线缓存
   */
  async savePackages(packages: Package[]) {
    try {
      await AsyncStorage.setItem(PACKAGES_CACHE_KEY, JSON.stringify(packages));
      await AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      console.log(`💾 已成功缓存 ${packages.length} 个包裹数据`);
    } catch (error) {
      console.error('Failed to save packages cache:', error);
    }
  },

  /**
   * 从离线缓存获取包裹数据
   */
  async getCachedPackages(): Promise<Package[] | null> {
    try {
      const cachedData = await AsyncStorage.getItem(PACKAGES_CACHE_KEY);
      const timestamp = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);
      
      if (!cachedData || !timestamp) return null;

      const cacheAge = Date.now() - parseInt(timestamp);
      if (cacheAge > CACHE_EXPIRY) {
        console.log('⚠️ 离线缓存已过期');
        return null;
      }

      const packages = JSON.parse(cachedData);
      console.log(`📦 从离线缓存加载了 ${packages.length} 个包裹`);
      return packages;
    } catch (error) {
      console.error('Failed to get cached packages:', error);
      return null;
    }
  },

  /**
   * 清除所有缓存
   */
  async clearCache() {
    try {
      await AsyncStorage.removeItem(PACKAGES_CACHE_KEY);
      await AsyncStorage.removeItem(CACHE_TIMESTAMP_KEY);
    } catch (error) {}
  }
};

