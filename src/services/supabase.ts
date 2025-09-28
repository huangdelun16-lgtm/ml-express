import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://em8uih2jm5cvz6fnauia.supabase.co';
const supabaseKey = 'sb_secret_em8UIH2jM5CVz6fNaUIA-g_2ox69n90';

export const supabase = createClient(supabaseUrl, supabaseKey);

// 包裹数据类型定义
export interface Package {
  id: string;
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  packageType: string;
  weight: string;
  description?: string;
  status: string;
  createTime: string;
  pickupTime: string;
  deliveryTime: string;
  courier: string;
  price: string;
  created_at?: string;
  updated_at?: string;
}

// 测试数据库连接
export const testConnection = async () => {
  try {
    const { error } = await supabase
      .from('packages')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('数据库连接测试失败:', error);
      return false;
    }
    
    console.log('数据库连接测试成功');
    return true;
  } catch (err) {
    console.error('数据库连接异常:', err);
    return false;
  }
};

// 包裹数据库操作
export const packageService = {
  // 获取所有包裹
  async getAllPackages(): Promise<Package[]> {
    try {
      console.log('尝试获取包裹列表...');
      
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('获取包裹列表失败:', error);
        console.error('错误详情:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        return [];
      }
      
      console.log('获取包裹列表成功:', data);
      return data || [];
    } catch (err) {
      console.error('获取包裹列表异常:', err);
      return [];
    }
  },

  // 创建新包裹
  async createPackage(packageData: Omit<Package, 'id' | 'created_at' | 'updated_at'>): Promise<Package | null> {
    try {
      console.log('尝试创建包裹:', packageData);
      
      const { data, error } = await supabase
        .from('packages')
        .insert([packageData])
        .select()
        .single();
      
      if (error) {
        console.error('创建包裹失败:', error);
        console.error('错误详情:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        return null;
      }
      
      console.log('包裹创建成功:', data);
      return data;
    } catch (err) {
      console.error('创建包裹异常:', err);
      return null;
    }
  },

  // 更新包裹状态
  async updatePackageStatus(id: string, status: string, pickupTime?: string, deliveryTime?: string): Promise<boolean> {
    const updateData: any = { status };
    
    if (pickupTime) updateData.pickupTime = pickupTime;
    if (deliveryTime) updateData.deliveryTime = deliveryTime;
    
    const { error } = await supabase
      .from('packages')
      .update(updateData)
      .eq('id', id);
    
    if (error) {
      console.error('更新包裹状态失败:', error);
      return false;
    }
    
    return true;
  },

  // 根据ID获取包裹
  async getPackageById(id: string): Promise<Package | null> {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('获取包裹详情失败:', error);
      return null;
    }
    
    return data;
  }
};
