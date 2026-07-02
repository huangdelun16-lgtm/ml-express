/**
 * 商家入驻申请 — 上传商店证件（图片 / PDF）
 * POST { fileName, contentType, base64 }
 */

const { getCorsHeaders, handleCorsPreflight } = require('./utils/cors');
const { createServiceClient, uploadOneDocument } = require('./utils/merchantDocUpload');

exports.handler = async (event) => {
  const preflightResponse = handleCorsPreflight(event, {
    allowedMethods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  });
  if (preflightResponse) return preflightResponse;

  const headers = getCorsHeaders(event, {
    allowedMethods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  });

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ ok: false, error: 'Method not allowed' }),
    };
  }

  const { supabase, error: configError } = createServiceClient();
  if (configError || !supabase) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: configError || '上传服务暂不可用' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const publicUrl = await uploadOneDocument(supabase, body);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        url: publicUrl,
        fileName: String(body.fileName ?? 'document'),
      }),
    };
  } catch (error) {
    console.error('merchant-apply-upload error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: error.message || '上传失败' }),
    };
  }
};
