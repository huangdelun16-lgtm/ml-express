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
  'Access-Control-Allow-Credentials': 'true',
};

function json(statusCode: number, body: any) {
  return { statusCode, headers: { 'Content-Type': 'application/json', ...cors }, body: JSON.stringify(body) } as any;
}

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' } as any;
  if (!client) return json(500, { message: 'backend not configured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE' });

  try {
    // 1) 查 packages 状态=运输中 的单号集合
    const { data: pk, error: pe } = await (client as any)
      .from('packages')
      .select('tracking_no,status')
      .eq('status', '运输中');
    if (pe) return json(500, { message: pe.message });
    const pkgTransit = new Set<string>((pk || []).map((r: any) => String(r.tracking_no || '').trim()).filter(Boolean));

    // 2) 查 shipment_packages 的所有 tracking_no
    const { data: sp, error: se } = await (client as any)
      .from('shipment_packages')
      .select('tracking_no,shipment_id');
    if (se) return json(500, { message: se.message });
    const shipped = new Set<string>((sp || []).map((r: any) => String(r.tracking_no || '').trim()).filter(Boolean));

    // 3) 差集：运输中但不在任何运单里的单号
    const missing: string[] = [];
    for (const t of pkgTransit) if (!shipped.has(t)) missing.push(t);

    return json(200, { totals: { packagesTransit: pkgTransit.size, shipped: shipped.size }, missing });
  } catch (e: any) {
    return json(500, { message: e?.message || 'Server Error' });
  }
};


