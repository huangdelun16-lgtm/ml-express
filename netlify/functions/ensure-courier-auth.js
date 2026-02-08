const { createClient } = require('@supabase/supabase-js');
const { getCorsHeaders, handleCorsPreflight } = require('./utils/cors');

const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

const findUserByEmail = async (email) => {
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data?.users?.find(user => (user.email || '').toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (!data?.users || data.users.length < perPage) break;
    page += 1;
  }
  return null;
};

exports.handler = async (event) => {
  const preflightResponse = handleCorsPreflight(event, {
    allowedMethods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  });
  if (preflightResponse) {
    return preflightResponse;
  }

  const headers = getCorsHeaders(event, {
    allowedMethods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  });

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: '方法不允许' })
    };
  }

  try {
    if (!supabaseUrl || !serviceRoleKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Supabase Service Role 未配置' })
      };
    }

    const { email, password } = JSON.parse(event.body || '{}');
    if (!email || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '缺少 email 或 password' })
      };
    }

    let user = await findUserByEmail(email);
    if (user) {
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password,
        email_confirm: true
      });
      if (error) throw error;
      user = data?.user || user;
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ userId: user.id, action: 'updated' })
      };
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    if (error) throw error;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ userId: data.user?.id || '', action: 'created' })
    };
  } catch (error) {
    console.error('ensure-courier-auth error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Auth user creation failed' })
    };
  }
};
