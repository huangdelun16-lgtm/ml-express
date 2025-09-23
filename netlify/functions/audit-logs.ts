import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { getAuthFromEvent, hasDbRole } from './_auth';

const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE as string;

const client = SUPABASE_URL && SERVICE_ROLE
  ? createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
  : null;

const cors = {
  'Access-Control-Allow-Origin': 'https://market-link-express.com',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-ml-actor, x-ml-role',
  'Access-Control-Allow-Credentials': 'true',
};

function json(statusCode: number, body: any) {
  return { statusCode, headers: { 'Content-Type': 'application/json', ...cors }, body: JSON.stringify(body) };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' } as any;
  if (!client) return json(500, { message: 'backend not configured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE' });

  const session = getAuthFromEvent(event);
  const actor = session?.username || (event.headers['x-ml-actor'] || event.headers['X-ML-Actor'] || '').toString();

  // 允许 manager/master 可读
  const allowed = await hasDbRole(client, actor, ['manager','master']);
  if (!allowed) return json(403, { message: 'Forbidden' });

  try {
    if (event.httpMethod === 'GET') {
      const qs = event.queryStringParameters || {};
      const page = Math.max(1, parseInt((qs.page as string) || '1', 10));
      const pageSize = Math.min(100, Math.max(10, parseInt((qs.pageSize as string) || '20', 10)));
      const start = (qs.start || '') as string; // YYYY-MM-DD
      const end = (qs.end || '') as string;   // YYYY-MM-DD
      const qActor = (qs.actor || '') as string;
      const action = (qs.action || '') as string; // e.g., packages.update
      const search = (qs.search || '') as string;  // search in detail JSON or action
      const includeClient = String(qs.includeClient || '0') === '1';

      // 先统计
      let countQ: any = client.from('audit_logs').select('id', { count: 'exact', head: true });
      if (start) countQ = countQ.gte('ts', `${start}T00:00:00`);
      if (end) countQ = countQ.lte('ts', `${end}T23:59:59.999Z`);
      if (qActor) countQ = countQ.eq('actor', qActor);
      if (action) countQ = countQ.eq('action', action);
      // 默认隐藏 client_error
      if (!action && !includeClient) countQ = countQ.neq('action', 'client_error');
      if (search) countQ = (countQ as any).or(`action.ilike.%${search}%,actor.ilike.%${search}%,detail::text.ilike.%${search}%`);
      const { count: total = 0 } = (await countQ) as any;

      // 列表
      let listQ: any = client
        .from('audit_logs')
        .select('id,actor,action,ts,detail')
        .order('ts', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
      if (start) listQ = listQ.gte('ts', `${start}T00:00:00`);
      if (end) listQ = listQ.lte('ts', `${end}T23:59:59.999Z`);
      if (qActor) listQ = listQ.eq('actor', qActor);
      if (action) listQ = listQ.eq('action', action);
      // 默认隐藏 client_error
      if (!action && !includeClient) listQ = listQ.neq('action', 'client_error');
      if (search) listQ = listQ.or(`action.ilike.%${search}%,actor.ilike.%${search}%,detail::text.ilike.%${search}%`);
      const { data, error } = await listQ;
      if (error) return json(200, { items: [], page, pageSize, total: 0, hint: 'audit_logs table missing?' });
      const items = (data || []).map((r: any) => ({ id: r.id, actor: r.actor, action: r.action, ts: r.ts, detail: r.detail }));
      return json(200, { items, page, pageSize, total });
    }

    return json(405, { message: 'Method Not Allowed' });
  } catch (e: any) {
    return json(500, { message: e?.message || 'Server Error' });
  }
};


