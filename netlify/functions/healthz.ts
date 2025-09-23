import type { Handler, Config } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE as string;

const client = SUPABASE_URL && SERVICE_ROLE
  ? createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
  : null;

function json(statusCode: number, body: any) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

export const handler: Handler = async () => {
  if (!client) return json(500, { ok: false, reason: 'no_client' });
  try {
    const [p, f] = await Promise.all([
      client.from('packages').select('id', { head: true, count: 'exact' }),
      client.from('finances').select('id', { head: true, count: 'exact' }),
    ]);
    return json(200, { ok: true, packages: (p as any)?.count ?? null, finances: (f as any)?.count ?? null });
  } catch (e: any) {
    return json(500, { ok: false, error: e?.message || 'unknown' });
  }
};

export const config: Config = {
  schedule: '*/5 * * * *',
};


