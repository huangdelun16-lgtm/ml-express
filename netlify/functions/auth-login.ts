import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { signJwt } from './_jwt';

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE as string | undefined;
const ANON_KEY = process.env.SUPABASE_ANON_KEY as string | undefined;

const client = SUPABASE_URL && (SERVICE_ROLE || ANON_KEY)
  ? createClient(SUPABASE_URL, (SERVICE_ROLE || ANON_KEY) as string, { auth: { persistSession: false } })
  : null;

export const handler: Handler = async (event) => {
  // 动态 CORS：允许 localhost/127.0.0.1、*.netlify.app 与正式域名
  const origin = String(event.headers?.origin || event.headers?.Origin || '');
  const allowList = [/^https?:\/\/localhost:\d+$/i, /^https?:\/\/127\.0\.0\.1:\d+$/i, /netlify\.app$/i, /market-link-express\.com$/i];
  const allow = allowList.some((re)=>re.test(origin)) ? origin : 'https://market-link-express.com';
  const cors: Record<string,string> = {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }

  // 安全检查：禁止调试入口
  const qs = event.queryStringParameters || {};
  if (qs.init || qs.debug) {
    return response(404, { message: 'Not Found' }, {}, cors);
  }

  if (!client) {
    return response(500, { message: 'Supabase 未配置，请设置 SUPABASE_URL 与 SUPABASE_SERVICE_ROLE' }, {}, cors);
  }

  if (event.httpMethod !== 'POST') {
    return response(405, { message: 'Method Not Allowed' }, {}, cors);
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const username = String(body.username || '').trim();
    const password = String(body.password || '');
    if (!username || !password) return response(400, { message: '缺少用户名或密码' }, {}, cors);

    // 尝试读取用户
    let rows: any[] | null = null; let error: any = null;
    try {
      const r1: any = await client
        .from('users')
        .select('*')
        .eq('username', username)
        .limit(1);
      rows = r1?.data || null; error = r1?.error || null;
    } catch (e: any) { error = e; }
    if (error) {
      // 连接偶发超时/断开时做一次快速重试
      try {
        const r2: any = await client
          .from('users')
          .select('*')
          .eq('username', username)
          .limit(1);
        rows = r2?.data || null; error = r2?.error || null;
      } catch (e2: any) { error = e2; }
    }

    // 如果表不存在或无权限
    if (error) {
      return response(500, { message: `数据库未就绪或无权限，请在 Supabase 执行建表与策略，错误: ${error.message}` }, {}, cors);
    }

    // 用户不存在时直接返回错误，不自动创建
    if (!rows || rows.length === 0) {
      return response(401, { message: '用户名或密码错误' }, {}, cors);
    }

    // 兼容前端可能已做过一次 SHA-256：如果传入看起来是 64 位十六进制，就当作已哈希
    const isHex64 = /^[a-f0-9]{64}$/i.test(password);
    const { data: userRows, error: userErr } = await client
      .from('users')
      .select('username, role, password_hash')
      .eq('username', username)
      .limit(1);
    if (userErr) return response(500, { message: userErr.message }, {}, cors);
    const user = userRows && userRows[0];
    if (!user) {
      return response(400, { message: '用户名或密码错误' }, {}, cors);
    }
    // 兼容旧 SHA-256 与新 bcrypt 的校验
    let ok = false;
    if (isHex64) {
      ok = user.password_hash === password.toLowerCase();
    } else {
      try { ok = await bcrypt.compare(password, user.password_hash); } catch { ok = false; }
      if (!ok) ok = user.password_hash === sha256(password);
    }
    if (!ok) return response(400, { message: '用户名或密码错误' }, {}, cors);

    // 平滑迁移：若检测到旧 SHA-256，则升级为 bcrypt
    try {
      if (/^[a-f0-9]{64}$/i.test(user.password_hash)) {
        const next = await bcrypt.hash(password, 10);
        await client.from('users').update({ password_hash: next }).eq('username', username);
      }
    } catch {}

    // 审计日志（忽略失败）
    try {
      await client.from('audit_logs').insert([{ actor: username, action: 'login', detail: { ua: event.headers['user-agent'] } }]);
    } catch {}

    const token = signJwt({ username: user.username, role: user.role });
    // Cookie 更稳健：设置 Max-Age、Domain（顶级域名），保持 SameSite=Lax
    const cookieParts = [
      `ml_session=${encodeURIComponent(token)}`,
      'HttpOnly',
      'Path=/',
      'SameSite=Lax',
      'Secure',
      'Max-Age=2592000', // 30 天
      'Domain=market-link-express.com',
    ];
    // 同时返回 token，便于移动端持久化（Cookie 仍然保留以兼容网页端）
    return response(200, { username: user.username, role: user.role, token }, {
      'Set-Cookie': cookieParts.join('; '),
    }, cors);
  } catch (e: any) {
    return response(500, { message: e?.message || 'Server Error' }, {}, cors);
  }
};

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://market-link-express.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true',
};

function response(statusCode: number, body: any, extraHeaders: Record<string, string> = {}, dynamicCors?: Record<string,string>) {
  const base = dynamicCors || corsHeaders;
  return { statusCode, headers: { 'Content-Type': 'application/json', ...base, ...extraHeaders }, body: JSON.stringify(body) };
}


