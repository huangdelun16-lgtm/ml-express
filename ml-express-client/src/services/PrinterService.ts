import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import LoggerService from './LoggerService';

export interface PrinterSettings {
  enabled: boolean;
  type: 'system' | 'wifi' | 'bluetooth';
  address: string; // IP address for WiFi, MAC for Bluetooth
  autoPrint: boolean;
  copies: number;
}

const PRINTER_SETTINGS_KEY = 'merchant_printer_settings';

export const printerService = {
  /**
   * 获取打印机设置
   */
  async getSettings(): Promise<PrinterSettings> {
    try {
      const settings = await AsyncStorage.getItem(PRINTER_SETTINGS_KEY);
      if (settings) {
        return JSON.parse(settings);
      }
    } catch (e) {
      LoggerService.error('获取打印机设置失败', e);
    }
    return {
      enabled: false,
      type: 'system',
      address: '',
      autoPrint: true,
      copies: 1,
    };
  },

  /**
   * 保存打印机设置
   */
  async saveSettings(settings: PrinterSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(PRINTER_SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      LoggerService.error('保存打印机设置失败', e);
    }
  },

  /**
   * 执行打印任务
   */
  async printOrder(html: string, orderId: string): Promise<boolean> {
    const settings = await this.getSettings();
    
    if (!settings.enabled) {
      console.log('🖨️ 打印机未启用，跳过打印任务');
      return false;
    }

    try {
      if (settings.type === 'system') {
        // 使用系统打印
        await Print.printAsync({ html });
        return true;
      } else if (settings.type === 'wifi') {
        console.log(`🖨️ 尝试向 WiFi 打印机发送任务: ${settings.address}`);
        await Print.printAsync({ html });
        return true;
      } else if (settings.type === 'bluetooth') {
        // 🚀 蓝牙打印逻辑 (暂通过系统服务作为入口，实际环境需配合原生插件)
        console.log(`🖨️ 尝试向蓝牙打印机发送任务: ${settings.address}`);
        await Print.printAsync({ html });
        return true;
      }
      
      return false;
    } catch (error) {
      LoggerService.error(`打印订单 ${orderId} 失败:`, error);
      return false;
    }
  }
};
