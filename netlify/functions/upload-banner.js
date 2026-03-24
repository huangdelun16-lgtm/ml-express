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
      return { statusCode: 405, headers, body: JSON.stringify({ error: '方法不允许' }) };
    }

    if (!supabaseUrl || !serviceKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: '服务器配置错误：请检查环境变量。' })
      };
    }

    try {
      const { createClient } = require('@supabase/supabase-js');
      
      // 🚀 核心优化：自动修复 URL
      let finalSupabaseUrl = supabaseUrl.trim();
      if (finalSupabaseUrl.startsWith('//')) finalSupabaseUrl = 'https:' + finalSupabaseUrl;
      else if (finalSupabaseUrl.startsWith('://')) finalSupabaseUrl = 'https' + finalSupabaseUrl;
      else if (!finalSupabaseUrl.startsWith('http')) finalSupabaseUrl = 'https://' + finalSupabaseUrl;
      
      const normalizedUrl = finalSupabaseUrl.replace(/\/+$/, '');
      const supabase = createClient(normalizedUrl, serviceKey);
      
      const { fileName, contentType, base64 } = JSON.parse(event.body || '{}');
      if (!base64) throw new Error('未接收到文件数据');

      const fileExt = fileName.includes('.') ? fileName.split('.').pop() : 'png';
      const filePath = `app-banners/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${fileExt}`;
      const buffer = Buffer.from(base64, 'base64');

      const { data, error } = await supabase.storage
        .from('banners')
        .upload(filePath, buffer, {
          contentType: contentType,
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('banners')
        .getPublicUrl(filePath);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ url: publicUrl })
      };
    } catch (error) {
      console.error('上传失败详情:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: error.message || '上传过程中发生服务器错误' })
      };
    }
};
