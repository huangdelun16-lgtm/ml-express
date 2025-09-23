import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE as string;

const client = SUPABASE_URL && SERVICE_ROLE
  ? createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
  : null;

const cors = {
  'Access-Control-Allow-Origin': 'https://market-link-express.com',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-ml-actor, x-ml-role',
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (!client) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'Backend not configured' }) };

  try {
    // 仅允许 master 角色访问
    const actor = event.headers['x-ml-actor'] || event.headers['X-ML-Actor'] || '';
    if (!actor) return { statusCode: 403, headers: cors, body: JSON.stringify({ error: 'Forbidden' }) };
    
    const { data: userData } = await client.from('users').select('role').eq('username', actor).single();
    if (!userData || userData.role !== 'master') {
      return { statusCode: 403, headers: cors, body: JSON.stringify({ error: 'Only master can access' }) };
    }

    if (event.httpMethod === 'GET') {
      // 1. 获取 users 表的列信息
      const { data: columns } = await client
        .from('information_schema.columns')
        .select('column_name, data_type')
        .eq('table_schema', 'public')
        .eq('table_name', 'users')
        .order('ordinal_position');

      // 2. 获取前5个用户的样本数据
      const { data: sampleUsers } = await client
        .from('users')
        .select('*')
        .limit(5);

      // 3. 获取 role 列的可能值（如果是枚举类型）
      let roleEnumValues = null;
      try {
        const { data: enumData } = await client.rpc('get_enum_values', { 
          enum_name: 'user_role' 
        }).single();
        roleEnumValues = enumData;
      } catch {}

      return {
        statusCode: 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          columns: columns || [],
          sampleUsers: sampleUsers || [],
          roleEnumValues,
          debug: {
            totalColumns: columns?.length || 0,
            hasRoleUi: columns?.some(c => c.column_name === 'role_ui'),
            hasName: columns?.some(c => c.column_name === 'name'),
            hasBirthday: columns?.some(c => c.column_name === 'birthday'),
            hasIdNumber: columns?.some(c => c.column_name === 'id_number'),
            hasAddress: columns?.some(c => c.column_name === 'address'),
            hasPhone: columns?.some(c => c.column_name === 'phone'),
            hasSalary: columns?.some(c => c.column_name === 'salary'),
          }
        }, null, 2)
      };
    }

    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (error: any) {
    return { 
      statusCode: 500, 
      headers: cors, 
      body: JSON.stringify({ error: error.message || 'Server error' }) 
    };
  }
};
