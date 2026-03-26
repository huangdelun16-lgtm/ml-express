import { supabase } from './supabase';

export class PaymentService {
  static async processPayment(orderId: string, amount: number, method: string) {
    try {
      const { data, error } = await supabase.from('payments').insert({
        order_id: orderId, amount, payment_method: method, status: 'pending'
      }).select().single();
      
      return error ? { success: false } : { success: true, transactionId: data.id };
    } catch (error) {
      return { success: false };
    }
  }

  static async processRefund(orderId: string) {
    return { success: false, message: '退款功能待实现' };
  }
}
