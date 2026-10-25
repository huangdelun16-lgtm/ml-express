/**
 * 未登记客户入库满 24 小时后清掉。
 * 打开客户页时也会清。这里每小时再跑一次，避免没人打开页面时一直留着。
 *
 * Netlify 定时：netlify.toml [functions."purge-unregistered-customers"]
 */

const { createClient } = require('@supabase/supabase-js');
const { purgeStaleUnregisteredCustomers } = require('./utils/inventoryCustomerAggregate');

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
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, body: '' };
  if (event.httpMethod && event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  if (!isAuthorized(event)) {
    return { statusCode: 401, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
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
    const result = await purgeStaleUnregisteredCustomers(supabase);
    console.log(`未登记客户超时清理完成，删除 ${result.removed} 单`);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('purge unregistered customers failed:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message || 'purge failed' }),
    };
  }
};
