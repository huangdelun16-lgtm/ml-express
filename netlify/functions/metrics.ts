import { createClient } from '@supabase/supabase-js';
import { getAuthFromEvent } from './_auth';

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

function json(statusCode: number, body: any, cache?: { maxAge?: number; swr?: number }) {
  const cc = cache && statusCode === 200
    ? `public, max-age=${Math.max(0, cache.maxAge ?? 20)}, stale-while-revalidate=${Math.max(0, cache.swr ?? 60)}`
    : undefined;
  const headers: Record<string,string> = { 'Content-Type': 'application/json', ...cors };
  if (cc) {
    headers['Cache-Control'] = cc;
    headers['Vary'] = 'Authorization, x-ml-actor, x-ml-role';
  }
  return { statusCode, headers, body: JSON.stringify(body) } as any;
}

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' } as any;
  if (!client) return json(500, { message: 'backend not configured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE' });

  // 仅需已登录（用于 Vary），不限制角色：汇总为只读数据
  try {
    if (event.httpMethod !== 'GET') return json(405, { message: 'Method Not Allowed' });
    const qs = event.queryStringParameters || {};
    const start = (qs.start || '') as string; // YYYY-MM-DD（可选）
    const end = (qs.end || '') as string;     // YYYY-MM-DD（可选）
    const status = (qs.status || '') as string; // 可选：packages 的状态过滤

    // 包裹总数
    let pkgQ = client.from('packages').select('id', { count: 'exact', head: true });
    if (status) pkgQ = pkgQ.eq('status', status);
    if (start) pkgQ = (pkgQ as any).gte('created_at', start);
    if (end) pkgQ = (pkgQ as any).lte('created_at', end);
    const { count: packagesTotal = 0 } = (await pkgQ) as any;

    // 财务汇总（仅统计“已入账”；兼容老库 status 缺失）
    let income = 0, expense = 0;
    try {
      let sumQ = client.from('finances').select('amount,type,status,date');
      if (start) sumQ = sumQ.gte('date', start);
      if (end) sumQ = sumQ.lte('date', end);
      const { data: rows, error } = await sumQ as any;
      if (error) throw error;
      for (const r of (rows || [])) {
        const st = (r as any).status;
        const isPosted = (st === '已入账' || st === null || typeof st === 'undefined');
        if (!isPosted) continue;
        const t = String((r as any).type || '').trim();
        if (t === '收入') income += Number((r as any).amount || 0);
        if (t === '支出') expense += Number((r as any).amount || 0);
      }
    } catch {
      // 降级：忽略 status 字段
      let sumQ = client.from('finances').select('amount,type,date');
      if (start) sumQ = sumQ.gte('date', start);
      if (end) sumQ = sumQ.lte('date', end);
      const { data: rows } = await sumQ as any;
      for (const r of (rows || [])) {
        const t = String((r as any).type || '').trim();
        if (t === '收入') income += Number((r as any).amount || 0);
        if (t === '支出') expense += Number((r as any).amount || 0);
      }
    }

    const body = {
      packages: { total: packagesTotal },
      finances: { income, expense, net: income - expense },
      range: { start: start || null, end: end || null },
      ts: new Date().toISOString(),
    };
    return json(200, body, { maxAge: 20, swr: 60 });
  } catch (e: any) {
    return json(500, { message: e?.message || 'Server Error' });
  }
};


