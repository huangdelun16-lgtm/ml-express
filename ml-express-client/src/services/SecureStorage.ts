import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

class SecureStorageService {
  private static instance: SecureStorageService;

  private constructor() {}

  static getInstance(): SecureStorageService {
    if (!SecureStorageService.instance) {
      SecureStorageService.instance = new SecureStorageService();
    }
    return SecureStorageService.instance;
  }

  /**
   * 安全存储数据
   * 在 Web 上回退到 AsyncStorage，在 Native 上使用 SecureStore
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.setItem(key, value);
      } else {
        await SecureStore.setItemAsync(key, value);
      }
    } catch (error) {
      console.error('SecureStorage setItem error:', error);
      // 降级方案
      await AsyncStorage.setItem(key, value);
    }
  }

  /**
   * 获取安全存储的数据
   */
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return await AsyncStorage.getItem(key);
      } else {
        return await SecureStore.getItemAsync(key);
      }
    } catch (error) {
      console.error('SecureStorage getItem error:', error);
      return await AsyncStorage.getItem(key);
    }
  }

  /**
   * 删除安全存储的数据
   */
  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.removeItem(key);
      } else {
        await SecureStore.deleteItemAsync(key);
      }
    } catch (error) {
      console.error('SecureStorage removeItem error:', error);
      await AsyncStorage.removeItem(key);
    }
  }
}

export const secureStorage = SecureStorageService.getInstance();

