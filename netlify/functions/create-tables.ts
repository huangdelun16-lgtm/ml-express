import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE as string;

const client = SUPABASE_URL && SERVICE_ROLE
  ? createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
  : null;

function json(statusCode: number, body: any) {
  return { 
    statusCode, 
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }, 
    body: JSON.stringify(body) 
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*' }, body: '' };
  }

  if (!client) {
    return json(500, { message: 'Supabase未配置' });
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { message: 'Method Not Allowed' });
  }

  try {
    // 创建员工表
    const employeesTableSQL = `
      CREATE TABLE IF NOT EXISTS employees (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        work_id VARCHAR(20) UNIQUE NOT NULL,
        username VARCHAR(50) UNIQUE NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('employee', 'accountant', 'manager', 'admin')),
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        address TEXT,
        id_number VARCHAR(50) UNIQUE,
        join_date DATE NOT NULL,
        salary INTEGER DEFAULT 450000,
        avatar_url TEXT,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // 创建订单表
    const ordersTableSQL = `
      CREATE TABLE IF NOT EXISTS orders (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        order_id VARCHAR(50) UNIQUE NOT NULL,
        customer_name VARCHAR(100) NOT NULL,
        customer_phone VARCHAR(20) NOT NULL,
        sender_address TEXT NOT NULL,
        receiver_name VARCHAR(100) NOT NULL,
        receiver_phone VARCHAR(20) NOT NULL,
        receiver_address TEXT NOT NULL,
        package_type VARCHAR(50) NOT NULL,
        weight DECIMAL(10,2) NOT NULL,
        distance DECIMAL(10,2) NOT NULL,
        amount INTEGER NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled')),
        courier_id UUID REFERENCES employees(id),
        courier_name VARCHAR(100),
        courier_phone VARCHAR(20),
        service_type VARCHAR(50) NOT NULL,
        description TEXT,
        estimated_delivery TIMESTAMP WITH TIME ZONE,
        actual_delivery TIMESTAMP WITH TIME ZONE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // 执行SQL
    const { error: employeesError } = await client.rpc('exec_sql', { sql: employeesTableSQL });
    if (employeesError) {
      console.error('创建员工表失败:', employeesError);
    }

    const { error: ordersError } = await client.rpc('exec_sql', { sql: ordersTableSQL });
    if (ordersError) {
      console.error('创建订单表失败:', ordersError);
    }

    // 创建索引
    const indexesSQL = [
      'CREATE INDEX IF NOT EXISTS idx_employees_work_id ON employees(work_id);',
      'CREATE INDEX IF NOT EXISTS idx_employees_username ON employees(username);',
      'CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);',
      'CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);',
      'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);',
      'CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);',
    ];

    for (const sql of indexesSQL) {
      await client.rpc('exec_sql', { sql });
    }

    // 插入默认管理员（如果不存在）
    const { data: existingAdmin } = await client
      .from('employees')
      .select('id')
      .eq('work_id', 'ML001')
      .single();

    if (!existingAdmin) {
      await client
        .from('employees')
        .insert([{
          work_id: 'ML001',
          username: 'master',
          role: 'admin',
          name: 'AMT',
          phone: '09-123456789',
          email: 'amt@marketlink.com',
          address: '仰光市中心区',
          id_number: '12/LAKANA(N)123456',
          join_date: '2023-06-06',
          salary: 1000000,
          status: 'active',
        }]);
    }

    return json(200, { 
      message: '数据库表创建成功',
      tables: ['employees', 'orders'],
      indexes: indexesSQL.length,
    });

  } catch (error) {
    console.error('创建表失败:', error);
    return json(500, { 
      message: '创建表失败', 
      error: error instanceof Error ? error.message : '未知错误' 
    });
  }
};
