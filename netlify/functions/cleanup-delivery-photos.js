/**
 * 定时清理骑手送达证明照片（delivery_photos）
 * 默认：上传超过 7 天的记录（含 photo_base64）从数据库删除
 *
 * Netlify 定时：netlify.toml [functions."cleanup-delivery-photos"] schedule
 * 环境变量：SUPABASE_URL（或 REACT_APP_SUPABASE_URL）、SUPABASE_SERVICE_ROLE_KEY
 * 手动触发：Authorization: Bearer <CRON_SECRET>（可选，未配置 CRON_SECRET 时仅允许 Netlify 定时头）
 */

const { createClient } = require('@supabase/supabase-js');

const RETENTION_DAYS = Number(process.env.DELIVERY_PHOTO_RETENTION_DAYS || 7);

function isAuthorized(event) {
  const scheduled =
    event.headers?.['x-netlify-scheduled'] === 'true' ||
    event.headers?.['X-Netlify-Scheduled'] === 'true';

  if (scheduled) return true;

  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const auth = event.headers?.authorization || event.headers?.Authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return token.length > 0 && token === secret;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, body: '' };
  }

  if (event.httpMethod && event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  if (!isAuthorized(event)) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Unauthorized' }),
    };
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('缺少 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY');
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Server configuration missing' }),
    };
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    let deleted = 0;

    const { data, error } = await supabase.rpc('cleanup_expired_delivery_photos', {
      retention_days: RETENTION_DAYS,
    });

    if (error) {
      // 迁移未执行时的兜底：直接用 service role 按 upload_time 删除
      const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400000).toISOString();
      const { error: delErr, count } = await supabase
        .from('delivery_photos')
        .delete({ count: 'exact' })
        .lt('upload_time', cutoff);

      if (delErr) {
        console.error('cleanup failed:', error, delErr);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: delErr.message }),
        };
      }
      deleted = count ?? 0;
    } else {
      deleted = typeof data === 'number' ? data : 0;
    }
    console.log(`✅ delivery_photos 清理完成，删除 ${deleted} 条（保留 ${RETENTION_DAYS} 天）`);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        deleted,
        retentionDays: RETENTION_DAYS,
        at: new Date().toISOString(),
      }),
    };
  } catch (err) {
    console.error('cleanup-delivery-photos 异常:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message || 'Internal error' }),
    };
  }
};
