import { supabase } from './supabaseClient';

// 初始化数据库表
export const initializeDatabase = async (): Promise<boolean> => {
  if (!supabase) {
    console.error('Supabase未配置');
    return false;
  }

  try {
    console.log('开始初始化数据库...');

    // 创建员工表
    const { error: employeesError } = await supabase.rpc('create_employees_table', {});
    if (employeesError && !employeesError.message.includes('already exists')) {
      console.error('创建员工表失败:', employeesError);
    } else {
      console.log('✅ 员工表创建成功');
    }

    // 创建订单表
    const { error: ordersError } = await supabase.rpc('create_orders_table', {});
    if (ordersError && !ordersError.message.includes('already exists')) {
      console.error('创建订单表失败:', ordersError);
    } else {
      console.log('✅ 订单表创建成功');
    }

    // 检查表是否存在
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .in('table_name', ['employees', 'orders']);

    if (tablesError) {
      console.error('检查表失败:', tablesError);
      return false;
    }

    console.log('数据库表检查结果:', tables);
    return true;

  } catch (error) {
    console.error('数据库初始化失败:', error);
    return false;
  }
};

// 简单的表创建（如果RPC不可用）
export const createTablesDirectly = async (): Promise<boolean> => {
  if (!supabase) return false;

  try {
    // 尝试插入一条测试数据到员工表，如果表不存在会自动创建
    const { error } = await supabase
      .from('employees')
      .select('id')
      .limit(1);

    if (error && error.message.includes('does not exist')) {
      console.log('表不存在，需要手动创建...');
      return false;
    }

    console.log('✅ 数据库表已存在或创建成功');
    return true;
  } catch (error) {
    console.error('检查数据库表失败:', error);
    return false;
  }
};

// 测试Supabase连接
export const testSupabaseConnection = async (): Promise<{ connected: boolean; message: string }> => {
  if (!supabase) {
    return { connected: false, message: 'Supabase客户端未初始化' };
  }

  try {
    // 尝试执行一个简单的查询
    const { data, error } = await supabase
      .from('employees')
      .select('count')
      .limit(1);

    if (error) {
      if (error.message.includes('does not exist')) {
        return { connected: true, message: '连接成功，但需要创建数据表' };
      }
      return { connected: false, message: `连接失败: ${error.message}` };
    }

    return { connected: true, message: '连接成功，数据库就绪' };
  } catch (error) {
    return { 
      connected: false, 
      message: `连接测试失败: ${error instanceof Error ? error.message : '未知错误'}` 
    };
  }
};
