import { supabase } from './supabaseClient';
import LoggerService from '../LoggerService';
import { errorService } from '../ErrorService';
import type { User } from './types';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { rewritePublicStorageUrl } from './nativeSupabaseUrl';

function decodeBase64(base64: string): Uint8Array {
  const clean = String(base64 || '').replace(/[^A-Za-z0-9+/]/g, '');
  const atobFn = (globalThis as { atob?: (v: string) => string }).atob;
  if (typeof atobFn === 'function') {
    const binary = atobFn(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i += 1) lookup[chars.charCodeAt(i)] = i;
  const len = clean.length;
  const pad = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  const out = new Uint8Array((len * 3) / 4 - pad);
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const n =
      (lookup[clean.charCodeAt(i)] << 18) |
      (lookup[clean.charCodeAt(i + 1)] << 12) |
      (lookup[clean.charCodeAt(i + 2)] << 6) |
      lookup[clean.charCodeAt(i + 3)];
    if (p < out.length) out[p++] = (n >> 16) & 255;
    if (p < out.length) out[p++] = (n >> 8) & 255;
    if (p < out.length) out[p++] = n & 255;
  }
  return out;
}

async function readLocalImageBytes(imageUri: string): Promise<Uint8Array> {
  let fileUri = imageUri;
  if (!fileUri.startsWith('file://') && !fileUri.startsWith('content://')) {
    fileUri = Platform.OS === 'ios' ? `file://${fileUri}` : fileUri;
  }

  try {
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const bytes = decodeBase64(base64);
    if (bytes.length) return bytes;
  } catch (fsError) {
    LoggerService.warn('头像 FileSystem 读取失败，改用 fetch:', fsError);
  }

  const dest = `${FileSystem.cacheDirectory}avatar-${Date.now()}.jpg`;
  try {
    await FileSystem.copyAsync({ from: imageUri, to: dest });
    const base64 = await FileSystem.readAsStringAsync(dest, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const bytes = decodeBase64(base64);
    if (bytes.length) return bytes;
  } catch {
    /* fall through */
  }

  const response = await fetch(fileUri);
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (!bytes.length) throw new Error('empty avatar image');
  return bytes;
}

function isMissingAvatarColumn(error: any): boolean {
  const text = `${error?.code || ''} ${error?.message || ''} ${error?.details || ''}`;
  return /avatar_url|PGRST204|schema cache/i.test(text);
}

const AVATAR_BUCKETS = ['review_images', 'payment_proofs'] as const;

function avatarObjectPath(userId: string) {
  return `avatars/${userId}.jpg`;
}

function publicUrlFor(bucket: string, path: string): string {
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
  return String(publicUrl || '').trim();
}

function isUserAvatarFile(userId: string, fileName?: string | null): boolean {
  const name = String(fileName || '');
  return name === `${userId}.jpg` || name.startsWith(`${userId}_`);
}

async function findStoredAvatarUrl(userId: string): Promise<string> {
  if (!userId) return '';
  for (const bucket of AVATAR_BUCKETS) {
    try {
      const { data, error } = await supabase.storage.from(bucket).list('avatars', {
        limit: 40,
        search: userId,
        sortBy: { column: 'created_at', order: 'desc' },
      });
      if (error) {
        LoggerService.warn(`列出 ${bucket} 头像失败:`, error);
      } else {
        const files = (data || []).filter((file) => isUserAvatarFile(userId, file?.name));
        if (files[0]?.name) {
          const url = publicUrlFor(bucket, `avatars/${files[0].name}`);
          if (url) return url;
        }
      }
    } catch (err) {
      LoggerService.warn(`查找 ${bucket} 头像失败:`, err);
    }

    const stable = publicUrlFor(bucket, avatarObjectPath(userId));
    if (!stable) continue;
    try {
      const res = await fetch(stable, { method: 'GET', headers: { Range: 'bytes=0-1' } });
      const contentType = String(res.headers.get('content-type') || '');
      if ((res.ok || res.status === 206) && !/json|html|xml/i.test(contentType)) return stable;
    } catch {
      /* try next bucket */
    }
  }
  return '';
}

async function removeStoredAvatars(userId: string): Promise<void> {
  for (const bucket of AVATAR_BUCKETS) {
    try {
      const paths = new Set<string>([avatarObjectPath(userId)]);
      const { data } = await supabase.storage.from(bucket).list('avatars', {
        limit: 40,
        search: userId,
      });
      for (const file of data || []) {
        if (isUserAvatarFile(userId, file?.name)) paths.add(`avatars/${file.name}`);
      }
      await supabase.storage.from(bucket).remove([...paths]);
    } catch (err) {
      LoggerService.warn(`删除 ${bucket} 头像失败:`, err);
    }
  }
}

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
    avatar_url?: string;
  }, _userType: string = 'customer') {
    try {
      const payload: Record<string, string | null> = {};
      if (updateData.name) payload.name = updateData.name;
      if (updateData.phone) payload.phone = updateData.phone;
      if (updateData.email) payload.email = updateData.email;
      if (updateData.address) payload.address = updateData.address;
      if (updateData.avatar_url !== undefined) {
        payload.avatar_url = updateData.avatar_url ? updateData.avatar_url : null;
      }

      if (!Object.keys(payload).length) {
        return { success: true, data: { id: userId } };
      }

      const { data, error } = await supabase
        .from('users')
        .update(payload)
        .eq('id', userId)
        .select('id')
        .maybeSingle();

      if (error) {
        if (isMissingAvatarColumn(error) && Object.keys(payload).length === 1 && payload.avatar_url !== undefined) {
          LoggerService.warn('users.avatar_url 列尚未就绪，头像先保存在本机');
          return { success: false, error: { message: error.message, code: 'NO_AVATAR_COLUMN' } };
        }
        LoggerService.error('更新用户信息失败 (users):', error);
        throw error;
      }

      if (!data) {
        return { success: true, data: { id: userId } };
      }

      return { success: true, data };
    } catch (error: any) {
      LoggerService.error('更新用户信息失败:', error);
      return { 
        success: false, 
        error: { message: error.message || '更新失败，请重试', code: error.code }
      };
    }
  },

  // 登录
  async login(email: string, password: string) {
    try {
      const ident = String(email || '').trim();
      const findBy = async (column: 'email' | 'phone') =>
        supabase
          .from('users')
          .select('*')
          .eq(column, ident)
          .eq('user_type', 'customer')
          .maybeSingle();

      // 1. 查找用户（邮箱 / 手机号分开查，避免 .or() 特殊字符把 PostgREST 打挂）
      const primary = ident.includes('@') ? await findBy('email') : await findBy('phone');
      let userData = primary.data;
      let findError = primary.error;

      if (!userData && !ident.includes('@') && (!findError || findError.code === 'PGRST116')) {
        const fallback = await findBy('email');
        userData = fallback.data;
        findError = fallback.error;
      }

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

      // 4. 最后登录时间不挡住登录结果（Expo Go / 弱网写入可能失败）
      const now = new Date();
      void supabase
        .from('users')
        .update({
          last_login: now.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          }),
        })
        .eq('id', userData.id);

      // 5. 返回用户信息（不包含密码）；头像以云端为准，换机登录也能显示
      const { password: _, ...userDataWithoutPassword } = userData;
      let avatarUrl = String(userDataWithoutPassword.avatar_url || '').trim();
      if (!avatarUrl) {
        try {
          avatarUrl = await Promise.race([
            findStoredAvatarUrl(userData.id),
            new Promise<string>((resolve) => setTimeout(() => resolve(''), 3500)),
          ]);
        } catch (avatarErr) {
          LoggerService.warn('登录时读取云端头像失败:', avatarErr);
        }
      }
      return {
        success: true,
        data: { ...userDataWithoutPassword, avatar_url: avatarUrl || null },
      };
    } catch (error: any) {
      const appError = errorService.handleError(error, { context: 'customerService.login', silent: true });
      LoggerService.error('[customerService.login] 发生意外错误', error, {
        context: 'customerService.login',
        friendly: appError.message,
        code: error?.code,
        details: error?.details,
      });
      return {
        success: false,
        error: appError,
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

  async uploadAvatar(userId: string, imageUri: string): Promise<string | null> {
    try {
      if (!userId || !imageUri) throw new Error('missing avatar upload args');

      const bytes = await readLocalImageBytes(imageUri);
      let lastError: unknown = null;

      for (const bucket of AVATAR_BUCKETS) {
        const attempts = [avatarObjectPath(userId), `avatars/${userId}_${Date.now()}.jpg`];
        for (let i = 0; i < attempts.length; i += 1) {
          const fileName = attempts[i];
          const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(fileName, bytes, {
              contentType: 'image/jpeg',
              upsert: i === 0,
            });
          if (uploadError) {
            lastError = uploadError;
            LoggerService.warn(`头像上传到 ${bucket}/${fileName} 失败:`, uploadError);
            continue;
          }
          return rewritePublicStorageUrl(publicUrlFor(bucket, fileName));
        }
      }

      throw lastError || new Error('avatar upload failed');
    } catch (error) {
      LoggerService.error('上传头像失败:', error);
      return null;
    }
  },

  async fetchAvatarUrl(userId: string): Promise<string> {
    if (!userId || userId === 'guest') return '';
    try {
      const { data, error } = await supabase
        .from('users')
        .select('avatar_url')
        .eq('id', userId)
        .maybeSingle();
      if (!error) {
        const fromDb = String(data?.avatar_url || '').trim();
        if (fromDb) return fromDb;
      }
    } catch (err) {
      LoggerService.warn('读取 users.avatar_url 失败:', err);
    }
    try {
      return await findStoredAvatarUrl(userId);
    } catch (err) {
      LoggerService.warn('从 Storage 读取头像失败:', err);
      return '';
    }
  },

  async removeAvatar(userId: string): Promise<void> {
    await this.updateUser(userId, { avatar_url: '' });
    await removeStoredAvatars(userId);
  },
};

