import { supabase } from './supabaseClient';
import LoggerService from '../LoggerService';
import type { AddressItem } from './types';

export const addressService = {
  async getAddresses(userId: string): Promise<AddressItem[]> {
    try {
      const { data, error } = await supabase
        .from('address_book')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      LoggerService.error('获取地址列表失败:', error);
      return [];
    }
  },

  async addAddress(address: AddressItem) {
    try {
      // 如果设置为默认，先取消其他默认
      if (address.is_default) {
        await supabase
          .from('address_book')
          .update({ is_default: false })
          .eq('user_id', address.user_id);
      }

      const { data, error } = await supabase
        .from('address_book')
        .insert([address])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      LoggerService.error('添加地址失败:', error);
      return { success: false, error };
    }
  },

  async updateAddress(id: string, address: Partial<AddressItem>) {
    try {
      if (address.is_default && address.user_id) {
        await supabase
          .from('address_book')
          .update({ is_default: false })
          .eq('user_id', address.user_id);
      }

      const { data, error } = await supabase
        .from('address_book')
        .update(address)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      LoggerService.error('更新地址失败:', error);
      return { success: false, error };
    }
  },

  async deleteAddress(id: string) {
    try {
      const { error } = await supabase
        .from('address_book')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      LoggerService.error('删除地址失败:', error);
      return { success: false, error };
    }
  }
};

