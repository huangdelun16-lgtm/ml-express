import { supabase } from './supabase';
import LoggerService from './LoggerService';
import type { AddressItem } from './_shared/domainTypes';

export type { AddressItem };

/** 与商家 App 同一张 address_book，按店铺账号 user_id 读写 */
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
    } catch (error: unknown) {
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
    } catch (error: unknown) {
      LoggerService.error('更新地址失败:', error);
      return { success: false, error };
    }
  },

  async deleteAddress(id: string) {
    try {
      const { error } = await supabase.from('address_book').delete().eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error: unknown) {
      LoggerService.error('删除地址失败:', error);
      return { success: false, error };
    }
  },
};
