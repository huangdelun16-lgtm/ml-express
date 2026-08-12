import { supabase } from './supabaseClient';
import LoggerService from '../LoggerService';
import { errorService } from '../ErrorService';
import type { User } from './types';

export const customerService = {
  // 注册客户
  async register(customerData: {
    name: string;
    email: string;
    phone: string;
    password: string;
    address?: string;
  }) {
    try {
      // 1. 检查邮箱是否已存在
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', customerData.email)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingUser) {
        return { 
          success: false, 
          error: { message: '该邮箱已被注册' }
        };
      }

      // 2. 检查手机号是否已存在
      const { data: existingPhone, error: phoneCheckError } = await supabase
        .from('users')
        .select('id, phone')
        .eq('phone', customerData.phone)
        .maybeSingle();

      if (phoneCheckError && phoneCheckError.code !== 'PGRST116') {
        throw phoneCheckError;
      }

      if (existingPhone) {
        return { 
          success: false, 
          error: { message: '该手机号已被注册' }
        };
      }

      // 3. 生成用户ID
      const newId = `USR${Date.now().toString().slice(-8)}`;
      
      // 4. 创建用户记录
      const userData = {
        id: newId,
        name: customerData.name,
        phone: customerData.phone,
        email: customerData.email,
        address: customerData.address || '',
        password: customerData.password, // 注意：实际项目中应该加密
        user_type: 'customer',
        status: 'active',
        registration_date: new Date().toLocaleDateString('zh-CN'),
        last_login: '从未登录',
        total_orders: 0,
        total_spent: 0,
        rating: 0,
        notes: '通过客户端APP注册'
      };

      const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single();

      if (error) {
        LoggerService.error('注册失败:', error);
        throw error;
      }

      return { success: true, data };
    } catch (error: any) {
      const appError = errorService.handleError(error, { context: 'customerService.register', silent: true });
      return { 
        success: false, 
        error: appError
      };
    }
  },

  // 更新用户信息（仅 users 表；userType 保留兼容，忽略 merchant）
  async updateUser(userId: string, updateData: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  }, _userType: string = 'customer') {
    try {
      const payload: Record<string, string> = {};
      if (updateData.name) payload.name = updateData.name;
      if (updateData.phone) payload.phone = updateData.phone;
      if (updateData.email) payload.email = updateData.email;
      if (updateData.address) payload.address = updateData.address;

      const { data, error } = await supabase
        .from('users')
        .update(payload)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        LoggerService.error('更新用户信息失败 (users):', error);
        throw error;
      }

      return { success: true, data };
    } catch (error: any) {
      LoggerService.error('更新用户信息失败:', error);
      return { 
        success: false, 
        error: { message: error.message || '更新失败，请重试' }
      };
    }
  },

  // 登录
  async login(email: string, password: string) {
    try {
      // 1. 查找用户（支持邮箱或手机号登录）
      const { data: userData, error: findError } = await supabase
        .from('users')
        .select('*')
        .or(`email.eq.${email},phone.eq.${email}`)
        .eq('user_type', 'customer')
        .maybeSingle();

      if (findError && findError.code !== 'PGRST116') {
        throw findError;
      }

      if (!userData) {
        return { 
          success: false, 
          error: { message: '用户不存在' }
        };
      }

      // 2. 检查用户状态
      if (userData.status !== 'active') {
        return { 
          success: false, 
          error: { message: '账号已被停用，请联系客服' }
        };
      }

      // 3. 验证密码
      if (userData.password !== password) {
        return { 
          success: false, 
          error: { message: '密码错误' }
        };
      }

      // 4. 更新最后登录时间
      const now = new Date();
      await supabase
        .from('users')
        .update({ 
          last_login: now.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          })
        })
        .eq('id', userData.id);

      // 5. 返回用户信息（不包含密码）
      const { password: _, ...userDataWithoutPassword } = userData;
      return { success: true, data: userDataWithoutPassword };
    } catch (error: any) {
      const appError = errorService.handleError(error, { context: 'customerService.login', silent: true });
      return { 
        success: false, 
        error: appError
      };
    }
  },

  // 获取客户信息
  async getCustomer(customerId: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', customerId)
        .eq('user_type', 'customer')
        .single();

      if (error) throw error;
      
      // 不返回密码
      if (data) {
        const { password: _, ...userDataWithoutPassword } = data;
        return userDataWithoutPassword;
      }
      return null;
    } catch (error) {
      LoggerService.error('获取客户信息失败:', error);
      return null;
    }
  },

  // 更新客户信息
  async updateCustomer(customerId: string, updates: Partial<User>) {
    try {
      // 移除不应该直接更新的字段
      const { id, user_type, total_orders, total_spent, rating, created_at, ...allowedUpdates } = updates;
      
      const { error } = await supabase
        .from('users')
        .update(allowedUpdates)
        .eq('id', customerId)
        .eq('user_type', 'customer');

      if (error) throw error;
      return true;
    } catch (error) {
      LoggerService.error('更新客户信息失败:', error);
      return false;
    }
  },

  // 修改密码（仅 users 表；userType 保留兼容，忽略 merchant）
  async changePassword(userId: string, oldPassword: string, newPassword: string, _userType: string = 'customer') {
    try {
      const { data: user, error: findError } = await supabase
        .from('users')
        .select('password')
        .eq('id', userId)
        .single();

      if (findError) {
        LoggerService.error('[changePassword] 查找用户失败 (users):', findError);
        throw findError;
      }

      if (user.password !== oldPassword) {
        return { 
          success: false, 
          error: { message: '原密码错误' }
        };
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({ password: newPassword })
        .eq('id', userId);

      if (updateError) {
        LoggerService.error('[changePassword] 更新密码失败 (users):', updateError);
        throw updateError;
      }

      return { success: true };
    } catch (error: any) {
      LoggerService.error('修改密码异常:', error);
      return { 
        success: false, 
        error: { message: error.message || '修改密码失败' }
      };
    }
  },

  // 重置密码（通过手机号）
  async resetPassword(phone: string, newPassword: string) {
    try {
      const { data: user, error: findError } = await supabase
        .from('users')
        .select('id')
        .eq('phone', phone)
        .eq('user_type', 'customer')
        .maybeSingle();

      if (findError && findError.code !== 'PGRST116') {
        throw findError;
      }

      if (!user) {
        return { 
          success: false, 
          error: { message: '该手机号未注册' }
        };
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({ password: newPassword })
        .eq('id', user.id);

      if (updateError) throw updateError;

      return { success: true };
    } catch (error: any) {
      LoggerService.error('重置密码失败:', error);
      return { 
        success: false, 
        error: { message: error.message || '重置密码失败' }
      };
    }
  },

  // 注销账号 (Account Deletion - iOS App Store Requirement)
  async deleteAccount(userId: string) {
    try {
      // 1. 检查是否有进行中的订单
      const { data: activeOrders, error: orderError } = await supabase
        .from('packages')
        .select('id')
        .or(`description.ilike.%[客户ID: ${userId}]%,customer_id.eq.${userId}`)
        .in('status', ['待取件', '已取件', '配送中']);

      if (orderError && orderError.code !== 'PGRST116') {
        LoggerService.warn('检查订单状态时出错:', orderError);
      }

      if (activeOrders && activeOrders.length > 0) {
        return { 
          success: false, 
          error: { message: '您还有正在进行中的订单，请等待订单完成后再注销账号' }
        };
      }

      // 2. 删除用户记录
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (deleteError) {
        LoggerService.error('删除用户记录失败:', deleteError);
        throw deleteError;
      }

      return { success: true };
    } catch (error: any) {
      LoggerService.error('注销账号失败:', error);
      return { 
        success: false, 
        error: { message: error.message || '注销账号失败，请稍后重试' }
      };
    }
  },
};

