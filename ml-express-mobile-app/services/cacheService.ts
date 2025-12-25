import AsyncStorage from '@react-native-async-storage/async-storage';
import { Package } from './supabase';

const PACKAGES_CACHE_KEY = 'offline_packages_cache';
const CACHE_TIMESTAMP_KEY = 'offline_cache_timestamp';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24小时

export const cacheService = {
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

