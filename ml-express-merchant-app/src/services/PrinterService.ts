import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import LoggerService from './LoggerService';
import { printMerchantReceiptViaBle } from './bleReceiptPrinter';
import { loadReceiptPaperWidth } from './receiptPaperSettings';
import { buildMerchantReceiptHtml, type MerchantReceiptData } from '../utils/merchantReceiptTemplate';
import {
  orderToMerchantReceipt,
  type OrderPrintSource,
} from '../utils/orderToMerchantReceipt';

export interface PrinterSettings {
  enabled: boolean;
  type: 'system' | 'wifi' | 'bluetooth';
  address: string;
  autoPrint: boolean;
  copies: number;
}

const PRINTER_SETTINGS_KEY = 'merchant_printer_settings';

export const printerService = {
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

  async saveSettings(settings: PrinterSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(PRINTER_SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      LoggerService.error('保存打印机设置失败', e);
    }
  },

  async printMerchantReceipt(data: MerchantReceiptData): Promise<boolean> {
    const settings = await this.getSettings();
    if (!settings.enabled) {
      return false;
    }

    try {
      if (settings.type === 'bluetooth') {
        const paperWidth = await loadReceiptPaperWidth();
        await printMerchantReceiptViaBle(data, paperWidth);
        return true;
      }

      const html = buildMerchantReceiptHtml(data);
      await Print.printAsync({ html });
      return true;
    } catch (error) {
      LoggerService.error(`打印小票 ${data.orderId} 失败:`, error);
      throw error;
    }
  },

  async printReceipt(
    order: OrderPrintSource,
    options?: { productPriceMap?: Record<string, number> },
  ): Promise<boolean> {
    const receipt = orderToMerchantReceipt(order, options?.productPriceMap);
    return this.printMerchantReceipt(receipt);
  },

  async printOrder(html: string, orderId: string, receiptData?: MerchantReceiptData): Promise<boolean> {
    const settings = await this.getSettings();
    if (!settings.enabled) {
      console.log('🖨️ 打印机未启用，跳过打印任务');
      return false;
    }

    try {
      if (settings.type === 'bluetooth' && receiptData) {
        return this.printMerchantReceipt(receiptData);
      }

      if (settings.type === 'bluetooth') {
        throw new Error('BLE_RECEIPT_DATA_REQUIRED');
      }

      await Print.printAsync({ html });
      return true;
    } catch (error) {
      LoggerService.error(`打印订单 ${orderId} 失败:`, error);
      return false;
    }
  },
};
