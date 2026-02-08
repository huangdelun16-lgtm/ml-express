const { getCorsHeaders, handleCorsPreflight } = require('./utils/cors');

const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;

exports.handler = async (event) => {
  const preflightResponse = handleCorsPreflight(event, {
    allowedMethods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  });
  if (preflightResponse) return preflightResponse;

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
    if (!supabaseUrl || !serviceKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: '上传服务未配置（缺少 Service Role Key）' })
      };
    }

    const { fileName, contentType, base64 } = JSON.parse(event.body || '{}');
    if (!fileName || !contentType || !base64) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '缺少文件参数' })
      };
    }

    const fileExt = fileName.includes('.') ? fileName.split('.').pop() : 'png';
    const uniqueName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
    const filePath = `app-banners/${uniqueName}`;
    const buffer = Buffer.from(base64, 'base64');

    const uploadUrl = `${supabaseUrl}/storage/v1/object/banners/${filePath}`;
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
        'x-upsert': 'false'
      },
      body: buffer
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: `上传失败: ${errorText || response.statusText}` })
      };
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/banners/${filePath}`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url: publicUrl })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error?.message || '上传失败' })
    };
  }
};
