/**
 * 系统设置「自动化」落地：
 * - 待取件/待收款且骑手仍为「待分配」→ 按策略自动派单
 * - 已派但超过改派超时仍未取件 → 改派给其他在线骑手
 *
 * Netlify 定时：netlify.toml [functions."courier-auto-dispatch"]
 * 需要 SUPABASE_URL（或 REACT_APP_SUPABASE_URL）+ SUPABASE_SERVICE_ROLE_KEY
 */

const { createClient } = require('@supabase/supabase-js');
const {
  parseAutomationSettings,
  isAssignablePackage,
  shouldReassign,
  pickCourierForPackage,
  countActiveByCourier,
  nextStatusForAssign,
} = require('./utils/courierDispatch');

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

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

async function loadCouriers(supabase) {
  const { data: courierRows, error: courierError } = await supabase
    .from('couriers')
    .select(
      'id,name,phone,status,rating,employee_id,last_latitude,last_longitude,push_token',
    )
    .in('status', ['active', 'busy']);
  if (courierError) throw courierError;

  const employeeIds = [...new Set((courierRows || []).map((row) => row.employee_id).filter(Boolean))];
  let regionByEmployee = {};
  if (employeeIds.length) {
    const { data: accounts } = await supabase
      .from('admin_accounts')
      .select('employee_id,region,push_token,employee_name')
      .in('employee_id', employeeIds);
    (accounts || []).forEach((account) => {
      regionByEmployee[account.employee_id] = account;
    });
  }

  return (courierRows || []).map((row) => {
    const account = regionByEmployee[row.employee_id] || {};
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      status: row.status,
      rating: row.rating,
      employee_id: row.employee_id,
      region: account.region || null,
      latitude: row.last_latitude,
      longitude: row.last_longitude,
      push_token: row.push_token || account.push_token || null,
      currentPackages: 0,
    };
  });
}

async function notifyCourier(supabase, courier, pkg) {
  const title = '📦 新包裹分配通知';
  let message = `您好 ${courier.name}，系统已为您分配新包裹！\n\n`;
  message += `📋 包裹编号：${pkg.id}\n`;
  message += `📤 寄件人：${pkg.sender_name || ''}\n`;
  message += `📥 收件人：${pkg.receiver_name || ''}\n`;
  message += `📍 送达地址：${pkg.receiver_address || ''}\n`;
  message += `\n请及时取件并开始配送！`;

  const { error } = await supabase.from('notifications').insert([
    {
      recipient_id: courier.id,
      recipient_type: 'courier',
      notification_type: 'package_assigned',
      title,
      message,
      package_id: pkg.id,
      is_read: false,
      metadata: {
        package_details: {
          sender: pkg.sender_name || '',
          receiver: pkg.receiver_name || '',
          receiverAddress: pkg.receiver_address || '',
        },
        assigned_at: new Date().toISOString(),
        assigned_by: 'automation',
      },
    },
  ]);
  if (error) console.warn('自动派单写站内通知失败:', error.message);

  if (!courier.push_token) return;
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: courier.push_token,
        sound: 'default',
        title,
        body: message.replace(/\n+/g, ' ').slice(0, 140),
        channelId: 'new-task-channel',
        priority: 'high',
        data: { packageId: pkg.id, type: 'new_order' },
      }),
    });
  } catch (pushErr) {
    console.warn('自动派单 Expo 推送失败:', pushErr.message || pushErr);
  }
}

async function assignOne(supabase, pkg, courier, reason) {
  const { error } = await supabase
    .from('packages')
    .update({
      courier: courier.name,
      status: nextStatusForAssign(pkg.status),
      updated_at: new Date().toISOString(),
    })
    .eq('id', pkg.id);
  if (error) throw error;

  await notifyCourier(supabase, courier, pkg);
  try {
    await supabase.from('audit_logs').insert([
      {
        user_id: 'automation',
        user_name: '系统自动派单',
        action_type: 'update',
        module: 'packages',
        target_id: pkg.id,
        target_name: pkg.id,
        action_description: `${reason} → ${courier.name}`,
        new_value: JSON.stringify({
          courier: courier.name,
          courier_id: courier.id,
          reason,
        }),
        action_time: new Date().toISOString(),
      },
    ]);
  } catch (logErr) {
    console.warn('自动派单审计写入失败:', logErr.message || logErr);
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, body: '' };
  if (event.httpMethod && event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
    return json(405, { error: 'Method not allowed' });
  }
  if (!isAuthorized(event)) return json(401, { error: 'Unauthorized' });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return json(500, { error: 'Server configuration missing' });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: settingRows, error: settingError } = await supabase
      .from('system_settings')
      .select('settings_key,settings_value')
      .like('settings_key', 'automation.%');
    if (settingError) throw settingError;

    const settings = parseAutomationSettings(settingRows);
    if (!settings.enabled && settings.reassignMinutes <= 0) {
      return json(200, { ok: true, skipped: true, reason: 'automation disabled' });
    }

    const { data: pendingRows, error: pendingError } = await supabase
      .from('packages')
      .select(
        'id,status,courier,region,sender_name,receiver_name,receiver_address,sender_latitude,sender_longitude,updated_at,created_at,delivery_speed',
      )
      .in('status', ['待取件', '待收款', '已分配', '打包中', '已取件', '配送中'])
      .order('created_at', { ascending: true })
      .limit(400);
    if (pendingError) throw pendingError;

    const packages = pendingRows || [];
    const loadMap = countActiveByCourier(packages);
    const couriers = (await loadCouriers(supabase)).map((courier) => ({
      ...courier,
      currentPackages: loadMap[courier.name] || 0,
    }));

    const assigned = [];
    const reassigned = [];
    const MAX_PER_RUN = 30;

    const bumpLoad = (name) => {
      const courier = couriers.find((row) => row.name === name);
      if (courier) courier.currentPackages = (courier.currentPackages || 0) + 1;
    };

    if (settings.enabled) {
      const waiting = packages.filter(isAssignablePackage).slice(0, MAX_PER_RUN);
      for (const pkg of waiting) {
        const courier = pickCourierForPackage(pkg, couriers, {
          strategy: settings.strategy,
          maxActiveOrders: settings.maxActive,
        });
        if (!courier) continue;
        await assignOne(supabase, pkg, courier, '自动派单');
        bumpLoad(courier.name);
        assigned.push({ id: pkg.id, courier: courier.name });
      }
    }

    if (settings.reassignMinutes > 0) {
      const due = packages
        .filter((pkg) => shouldReassign(pkg, couriers, settings.reassignMinutes))
        .slice(0, MAX_PER_RUN);
      for (const pkg of due) {
        const courier = pickCourierForPackage(pkg, couriers, {
          strategy: settings.strategy,
          maxActiveOrders: settings.maxActive,
          excludeNames: [pkg.courier],
        });
        if (!courier) continue;
        await assignOne(supabase, pkg, courier, `超时改派（原 ${pkg.courier}）`);
        bumpLoad(courier.name);
        reassigned.push({ id: pkg.id, from: pkg.courier, to: courier.name });
      }
    }

    return json(200, {
      ok: true,
      enabled: settings.enabled,
      strategy: settings.strategy,
      assigned: assigned.length,
      reassigned: reassigned.length,
      assignedIds: assigned,
      reassignedIds: reassigned,
      at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('courier-auto-dispatch 异常:', err);
    return json(500, { error: err.message || 'Internal error' });
  }
};
