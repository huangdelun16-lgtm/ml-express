import LoggerService from '../services/LoggerService';
import { loadPrinterSettings } from '../services/printerSettings';
import { webPrinterService } from '../services/webPrinterService';
import type { MerchantLanguage } from '../constants/merchantOrderStatus';

export async function printMerchantReceipt(
  orderData: {
    id: string;
    created_at?: string;
    description?: string | null;
    price?: string | null;
    payment_method?: string | null;
    sender_name?: string | null;
    sender_phone?: string | null;
    sender_address?: string | null;
    receiver_name?: string | null;
    receiver_phone?: string | null;
    receiver_address?: string | null;
    notes?: string;
    cod_amount?: number;
  },
  productPriceMap: Record<string, number>,
  _language: MerchantLanguage,
): Promise<void> {
  if (!orderData?.id) return;

  const settings = loadPrinterSettings();
  if (!settings.autoPrint && settings.type !== 'system') {
    /* manual paths may still call print explicitly */
  }

  try {
    const ok = await webPrinterService.printOrder(
      {
        id: orderData.id,
        created_at: orderData.created_at || new Date().toISOString(),
        sender_name: orderData.sender_name || undefined,
        sender_phone: orderData.sender_phone || undefined,
        receiver_name: orderData.receiver_name || undefined,
        receiver_phone: orderData.receiver_phone || undefined,
        receiver_address: orderData.receiver_address || undefined,
        description: orderData.description || undefined,
        price: orderData.price || undefined,
        payment_method: orderData.payment_method || undefined,
        notes: orderData.notes,
        cod_amount: orderData.cod_amount,
      },
      productPriceMap,
    );
    if (!ok) {
      throw new Error('PRINT_NOT_ENABLED');
    }
  } catch (error) {
    LoggerService.error('生成小票失败:', error);
    throw error;
  }
}
