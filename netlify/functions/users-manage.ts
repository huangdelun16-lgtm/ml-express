import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE as string;

const client = SUPABASE_URL && SERVICE_ROLE
  ? createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
  : null;

const cors = {
  'Access-Control-Allow-Origin': 'https://market-link-express.com',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-ml-actor, x-ml-role',
  'Access-Control-Allow-Credentials': 'true',
};

function json(statusCode: number, body: any) {
  return { statusCode, headers: { 'Content-Type': 'application/json', ...cors }, body: JSON.stringify(body) };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' } as any;
  if (!client) return json(500, { message: 'backend not configured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE' });

  try {
    const actor = (event.headers['x-ml-actor'] || event.headers['X-ML-Actor'] || '').toString();
    async function requireManagerOrMaster() {
      if (!actor) return json(403, { message: 'Forbidden' });
      try {
        const { data } = await client.from('users').select('role').eq('username', actor).limit(1);
        const r = data && data[0]?.role;
        if (!['master'].includes(r)) return json(403, { message: 'Forbidden' });
      } catch {
        return json(403, { message: 'Forbidden' });
      }
      return null;
    }
    if (event.httpMethod === 'GET') {
      // 宽松选择所有现有列，之后在内存中挑选需要返回的字段，避免因缺列报错
      const all = await client.from('users').select('*').order('username');
      if (all.error) return json(500, { message: all.error.message });
      function pick(u: any, candidates: string[], fallback: any = null) {
        for (const k of candidates) { if (u && typeof u[k] !== 'undefined' && u[k] !== null) return u[k]; }
        return fallback;
      }
      const users = (all.data || []).map((u: any) => ({
        username: u.username,
        role: u.role_ui || u.role, // 优先使用前端角色值
        name: u.name || null,
        birthday: u.birthday || null,
        id_number: u.id_number || null,
        address: u.address || null,
        phone: u.phone || null,
        salary: u.salary || null,
        cv_image: u.cv_image || null,
        hire_date: u.hire_date || null,
      }));
      return json(200, { users });
    }

    const body = event.body ? JSON.parse(event.body) : {};

    function mapToLegacyRole(r: string): 'city_rider' | 'cross_clearance' | 'accountant' | 'manager' | 'master' {
      const v = String(r || '').toLowerCase();
      if (v === 'master') return 'master';
      if (v === 'manager') return 'manager';
      if (['accountant','city_accountant','cross_accountant'].includes(v)) return 'accountant';
      if (v === 'city_rider') return 'city_rider';
      if (v === 'cross_clearance') return 'cross_clearance';
      // 默认返回原始角色，不再强制转换为staff
      return r as any;
    }

    if (event.httpMethod === 'POST') {
      const deny = await requireManagerOrMaster(); if (deny) return deny;
      const { username, passwordHash, role } = body || {};
      if (!username || !passwordHash || !role) return json(400, { message: '缺少必要字段' });
      
      // 构建插入数据
      let insertRow: any = { 
        username, 
        password_hash: passwordHash,
        role,
        role_ui: role, // 保存前端角色值
        name: body.name ?? null,
        birthday: body.birthday ?? null,
        id_number: body.idNumber ?? null,
        address: body.address ?? null,
        phone: body.phone ?? null,
        salary: typeof body.salary === 'number' ? body.salary : (body.salary ? Number(body.salary) : null),
        cv_image: body.cv_image ?? null,
        hire_date: body.hire_date ?? null,
      };
      
      // 首次尝试用原值写入；若数据库限制不允许（如角色枚举或未知列），则处理后重试
      let { error } = await client.from('users').insert([insertRow], { upsert: true });
      if (error) {
        const msg = error.message || '';
        // 若报未知列，剔除额外字段后重试
        if (/column .* does not exist|invalid input/i.test(msg) || /No column/i.test(msg)) {
          insertRow = { username, password_hash: passwordHash, role };
          const retry1 = await client.from('users').insert([insertRow], { upsert: true });
          if (retry1.error) {
            const legacy = mapToLegacyRole(role);
            const retry2 = await client.from('users').insert([{ ...insertRow, role: legacy }], { upsert: true });
            if (retry2.error) return json(500, { message: retry2.error.message });
          }
        } else {
          const legacy = mapToLegacyRole(role);
          const retry = await client.from('users').insert([{ username, password_hash: passwordHash, role: legacy }], { upsert: true });
          if (retry.error) return json(500, { message: retry.error.message });
        }
      }

      // 🚴‍♂️ 如果创建的是骑手用户，自动在riders表中创建对应记录
      if (role === 'city_rider') {
        try {
          const riderData = {
            name: body.name || username, // 使用真实姓名，如果没有则使用用户名
            phone: body.phone || '', // 使用填写的手机号
            status: 'offline', // 初始状态为离线
            rating: 5.0, // 初始评分5.0
            today_orders: 0,
            today_earnings: 0,
            join_date: new Date().toISOString().split('T')[0], // 今天的日期
            is_active: true,
            // 如果有头像，也同步过去
            avatar: body.cv_image || null
          };
          
          const { error: riderError } = await client
            .from('riders')
            .insert([riderData]);
            
          if (riderError) {
            console.error('自动创建骑手记录失败:', riderError);
            // 不阻断用户创建，只记录错误
          } else {
            console.log(`✅ 自动为用户 ${username} 创建了骑手记录`);
          }
        } catch (riderErr) {
          console.error('创建骑手记录时发生异常:', riderErr);
          // 不阻断用户创建流程
        }
      }

      return json(200, { ok: true });
    }

    if (event.httpMethod === 'PATCH') {
      const deny = await requireManagerOrMaster(); if (deny) return deny;
      const { username, role, passwordHash } = body || {};
      if (!username) return json(400, { message: '缺少用户名' });
      
      const update: any = {};
      if (passwordHash) update.password_hash = passwordHash;
      if (role) {
        update.role = role;
        // 同时保存前端角色值
        update.role_ui = role;
      }
      
      // 添加其他字段
      if (typeof body.name !== 'undefined') update.name = body.name;
      if (typeof body.birthday !== 'undefined') update.birthday = body.birthday;
      if (typeof body.idNumber !== 'undefined') update.id_number = body.idNumber;
      if (typeof body.address !== 'undefined') update.address = body.address;
      if (typeof body.phone !== 'undefined') update.phone = body.phone;
      if (typeof body.salary !== 'undefined') update.salary = body.salary ? Number(body.salary) : null;
      if (typeof body.cv_image !== 'undefined') update.cv_image = body.cv_image;
      if (typeof body.hire_date !== 'undefined') update.hire_date = body.hire_date;
      
      if (Object.keys(update).length === 0) return json(400, { message: '无可更新字段' });
      
      let { error } = await client.from('users').update(update).eq('username', username);
      
      // 如果角色值不被接受，尝试映射到旧版角色
      if (error && role) {
        const legacy = mapToLegacyRole(role);
        update.role = legacy;
        const retry = await client.from('users').update(update).eq('username', username);
        if (retry.error) return json(500, { message: retry.error.message });
      } else if (error) {
        return json(500, { message: error.message });
      }
      
      return json(200, { ok: true });
    }

    if (event.httpMethod === 'DELETE') {
      const deny = await requireManagerOrMaster(); if (deny) return deny;
      const { username } = body || {};
      if (!username) return json(400, { message: '缺少用户名' });
      if (username === 'master') return json(400, { message: '禁止删除 master' });
      const { error } = await client.from('users').delete().eq('username', username);
      if (error) return json(500, { message: error.message });
      return json(200, { ok: true });
    }

    return json(405, { message: 'Method Not Allowed' });
  } catch (e: any) {
    return json(500, { message: e?.message || 'Server Error' });
  }
};


