import type { Handler, HandlerEvent } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE as string;

const client = SUPABASE_URL && SERVICE_ROLE
  ? createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
  : null;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-ml-actor, x-ml-role',
};

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' } as any;
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: cors, body: 'Method Not Allowed' } as any;
  if (!client) return { statusCode: 500, headers: cors, body: JSON.stringify({ message: 'backend not configured' }) } as any;
  try {
    const actor = (event.headers['x-ml-actor'] || event.headers['X-ML-Actor'] || '').toString();
    const role = (event.headers['x-ml-role'] || event.headers['X-ML-Role'] || '').toString();
    const allowed = ['accountant','manager','master'];
    if (!actor) return { statusCode: 403, headers: cors, body: JSON.stringify({ message: 'Forbidden' }) } as any;
    try {
      const { data } = await client.from('users').select('role').eq('username', actor).limit(1);
      const r = data && data[0]?.role;
      if (!r || !allowed.includes(r)) {
        if (!allowed.includes((role || '').toLowerCase())) return { statusCode: 403, headers: cors, body: JSON.stringify({ message: 'Forbidden' }) } as any;
      }
    } catch {}

    const body = event.body ? JSON.parse(event.body) : {};
    const trackingNo = String(body.tracking_no || body.trackingNo || body.trackingNumber || '').trim();
    const amount = Number(body.amount || 2000);
    const date = body.date || new Date().toISOString().slice(0,10);
    if (!trackingNo) return { statusCode: 400, headers: cors, body: JSON.stringify({ message: 'tracking_no required' }) } as any;

    // 读取包裹信息用于目的地/收件人/biz 判定
    let destination: string | null = null;
    let receiver: string | null = null;
    let pkBiz: string | null = null;
    let pkType: string | null = null;
    try {
      const { data: pk } = await client.from('packages').select('destination,receiver,biz,package_type').eq('tracking_no', trackingNo).single();
      destination = (pk as any)?.destination || null;
      receiver = (pk as any)?.receiver || null;
      pkBiz = (pk as any)?.biz || null;
      pkType = (pk as any)?.package_type || null;
    } catch {}

    // 更新包裹状态为已下单（从待预付转入）
    try { await client.from('packages').update({ status: '已下单' }).eq('tracking_no', trackingNo); } catch {}

    // 判断 finances 是否有 biz 列
    let hasFinanceBiz = true;
    try { const probe = await client.from('finances').select('biz').limit(1); if ((probe as any)?.error) hasFinanceBiz = false; } catch { hasFinanceBiz = false; }
    const inferBiz = () => {
      const v = (pkBiz || '').toLowerCase();
      if (v === 'city' || v.includes('city')) return 'city';
      if (v === 'cross') return 'cross';
      const t = String(pkType || '').toLowerCase();
      if (t.includes('城') || t.includes('city')) return 'city';
      return 'cross';
    };

    const note = body.note || `客户预付费 - 单号 ${trackingNo}`;
    const record: any = { type: '收入', category: '预付费', amount, date, note, tracking_no: trackingNo, destination, receiver };
    if (hasFinanceBiz) record.biz = inferBiz();
    try { await client.from('finances').insert([record]); } catch (e: any) {
      // 降级无 biz/目的地时的库
      const { biz, destination: _d, receiver: _r, ...fallback } = record;
      await client.from('finances').insert([fallback]);
    }
    return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true }) } as any;
  } catch (e: any) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ message: e?.message || 'Server error' }) } as any;
  }
};


