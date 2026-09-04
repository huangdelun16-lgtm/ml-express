import QRCode from 'qrcode';
import LoggerService from './LoggerService';
import { loadReceiptPaperWidth } from './receiptPaperSettings';
import {
  loadPrinterSettings,
  savePrinterSettings,
  type WebPrinterSettings,
} from './printerSettings';
import {
  connectWebBluetoothPrinter,
  disconnectWebBluetoothPrinter,
  getCachedBleDevice,
  isWebBluetoothConnected,
  sendEscPosViaWebBluetooth,
} from './webBluetoothPrinter';
import {
  buildEscPosReceiptBytes,
  escPosBytesToBase64,
} from '../utils/escposReceiptBuilder';
import {
  buildMerchantReceiptHtml,
  createSampleReceiptData,
  type MerchantReceiptData,
} from '../utils/merchantReceiptTemplate';
import {
  orderToMerchantReceipt,
  type OrderPrintSource,
} from '../utils/orderToMerchantReceipt';

export type { WebPrinterSettings };

export const webPrinterService = {
  getSettings: loadPrinterSettings,
  saveSettings: savePrinterSettings,
  getPaperWidth: loadReceiptPaperWidth,
  getCachedBleDevice,
  isBluetoothConnected: isWebBluetoothConnected,

  async connectBluetooth() {
    const device = await connectWebBluetoothPrinter();
    const settings = loadPrinterSettings();
    savePrinterSettings({
      ...settings,
      enabled: true,
      type: 'bluetooth',
      address: device.id,
      bleDeviceName: device.name,
    });
    return device;
  },

  async disconnectBluetooth() {
    await disconnectWebBluetoothPrinter();
    const settings = loadPrinterSettings();
    if (settings.type === 'bluetooth') {
      savePrinterSettings({
        ...settings,
        bleDeviceName: '',
        address: '',
      });
    }
  },

  async printHtmlViaBrowser(html: string): Promise<void> {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:none';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) throw new Error('PRINT_FRAME_FAILED');
    doc.open();
    doc.write(html);
    doc.close();
    await new Promise((resolve) => setTimeout(resolve, 400));
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      if (iframe.parentNode) document.body.removeChild(iframe);
    }, 1000);
  },

  async printReceiptData(
    data: MerchantReceiptData,
    options?: { allowSystemFallback?: boolean },
  ): Promise<boolean> {
    const settings = loadPrinterSettings();
    const paperWidth = loadReceiptPaperWidth();
    const allowFallback = options?.allowSystemFallback === true;

    if (!settings.enabled && settings.type !== 'system') {
      return false;
    }

    let type = settings.type;
    if (type === 'bluetooth' && !isWebBluetoothConnected()) {
      if (!allowFallback) throw new Error('BLE_PRINTER_NOT_CONNECTED');
      LoggerService.warn('蓝牙小票机未连接，改用浏览器打印');
      type = 'system';
    }
    if (type === 'wifi' && !settings.printBridgeUrl.trim()) {
      if (!allowFallback) throw new Error('WIFI_BRIDGE_URL_REQUIRED');
      LoggerService.warn('未配置打印桥接，改用浏览器打印');
      type = 'system';
    }

    try {
      const copies =
        type === 'system'
          ? 1
          : Math.max(1, Math.min(Number(settings.copies) || 1, 5));

      for (let i = 0; i < copies; i += 1) {
        if (type === 'bluetooth') {
          const bytes = buildEscPosReceiptBytes(data, paperWidth);
          await sendEscPosViaWebBluetooth(bytes);
        } else if (type === 'wifi') {
          const bytes = buildEscPosReceiptBytes(data, paperWidth);
          await sendEscPosViaWifi(bytes, settings);
        } else {
          const qrDataUrl = await QRCode.toDataURL(data.orderId, { margin: 1, width: 160 });
          const html = buildMerchantReceiptHtml(data, paperWidth, qrDataUrl);
          await this.printHtmlViaBrowser(html);
        }
        if (i < copies - 1) {
          await new Promise((resolve) => setTimeout(resolve, 400));
        }
      }
      return true;
    } catch (error) {
      LoggerService.error('Web print failed', error);
      throw error;
    }
  },

  async printSampleReceipt(storeName?: string, storePhone?: string): Promise<boolean> {
    const data = createSampleReceiptData({ storeName, storePhone });
    return this.printReceiptData(data, { allowSystemFallback: false });
  },

  async printOrder(
    order: OrderPrintSource,
    productPriceMap?: Record<string, number>,
  ): Promise<boolean> {
    const receipt = orderToMerchantReceipt(order, productPriceMap);
    return this.printReceiptData(receipt, { allowSystemFallback: true });
  },
};

async function sendEscPosViaWifi(bytes: Uint8Array, settings: WebPrinterSettings): Promise<void> {
  const bridge = settings.printBridgeUrl.trim();
  if (!bridge) {
    throw new Error('WIFI_BRIDGE_URL_REQUIRED');
  }

  const response = await fetch(bridge, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      host: settings.wifiHost.trim(),
      port: settings.wifiPort || 9100,
      data: escPosBytesToBase64(bytes),
    }),
  });

  if (!response.ok) {
    throw new Error('WIFI_PRINT_FAILED');
  }
}

export async function testWifiBridge(settings: WebPrinterSettings): Promise<boolean> {
  if (!settings.printBridgeUrl.trim() || !settings.wifiHost.trim()) {
    throw new Error('WIFI_CONFIG_INCOMPLETE');
  }
  const sample = createSampleReceiptData({});
  const bytes = buildEscPosReceiptBytes(sample, loadReceiptPaperWidth());
  await sendEscPosViaWifi(bytes, settings);
  return true;
}
