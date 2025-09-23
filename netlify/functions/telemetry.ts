import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE as string;

const client = SUPABASE_URL && SERVICE_ROLE
  ? createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
  : null;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: cors, body: 'Method Not Allowed' } as any;
  if (!client) return { statusCode: 500, headers: cors, body: JSON.stringify({ message: 'backend not configured' }) };

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const type = String(body.type || 'misc');
    const detail = body.detail || {};
    const actor = String(body.sessionId || 'client');
    const action = type === 'vital' ? 'web_vitals' : type === 'error' ? 'client_error' : type;

    try {
      await client.from('audit_logs').insert([
        {
          actor,
          action,
          detail: {
            ...detail,
            url: body.url || event.headers.referer || '',
            ua: event.headers['user-agent'] || '',
            ts: new Date().toISOString(),
          },
        },
      ]);
    } catch {}

    return { statusCode: 200, headers: { 'Content-Type': 'application/json', ...cors }, body: JSON.stringify({ ok: true }) };
  } catch (e: any) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ message: e?.message || 'Server Error' }) };
  }
};


