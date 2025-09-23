// Netlify types are optional; avoid build-time type dependency here
import { createClient } from '@supabase/supabase-js';
import { getAuthFromEvent, hasDbRole } from './_auth';

const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE as string;

const client = SUPABASE_URL && SERVICE_ROLE
  ? createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
  : null;

const cors = {
  'Access-Control-Allow-Origin': 'https://market-link-express.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-ml-actor, x-ml-role',
  'Access-Control-Allow-Credentials': 'true',
};

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: cors, body: 'Method Not Allowed' } as any;
  if (!client) return { statusCode: 500, headers: cors, body: JSON.stringify({ message: '后端未配置' }) };

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const trackingNumber = String(body.trackingNumber || '').trim();
    const nextStatus = String(body.status || '已入库');
    if (!trackingNumber) return { statusCode: 400, headers: cors, body: JSON.stringify({ message: '缺少单号' }) };
    // 基于 x-ml-actor 在服务器端查询角色
    const session = getAuthFromEvent(event);
    const actor = session?.username || (event.headers['x-ml-actor'] || event.headers['X-ML-Actor'] || '').toString();
    const allowed = await hasDbRole(client, actor, ['manager','master']);
    if (!allowed) return { statusCode: 403, headers: cors, body: JSON.stringify({ message: 'Forbidden' }) };

    // 更新包裹状态
    const { data, error } = await client
      .from('packages')
      .update({ status: nextStatus })
      .eq('tracking_no', trackingNumber)
      .select('id, status')
      .limit(1);
    if (error) return { statusCode: 500, headers: cors, body: JSON.stringify({ message: error.message }) };
    if (!data || data.length === 0) return { statusCode: 404, headers: cors, body: JSON.stringify({ message: '未找到该单号' }) };

    // 审计
    try { await client.from('audit_logs').insert([{ actor: 'scanner', action: 'scan_update', detail: { trackingNumber, status: nextStatus } }]); } catch {}

    return { statusCode: 200, headers: { 'Content-Type': 'application/json', ...cors }, body: JSON.stringify({ ok: true, status: data[0].status }) };
  } catch (e: any) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ message: e?.message || 'Server Error' }) };
  }
};


