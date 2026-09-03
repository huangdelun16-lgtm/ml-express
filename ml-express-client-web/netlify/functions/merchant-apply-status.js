/**
 * 公开：用店铺电话查询入驻申请进度（不返回证件、负责人等敏感字段）
 * POST /.netlify/functions/merchant-apply-status
 * { phone, applicationId? }
 */

const { getCorsHeaders, handleCorsPreflight } = require('./utils/cors');
const {
  parseStatusLookupBody,
  toPublicApplicationStatus,
} = require('./utils/merchantApplication');
const { createServiceClient } = require('./utils/merchantDocUpload');

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
      body: JSON.stringify({ ok: false, error: '服务暂不可用，请稍后再试' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const parsed = parseStatusLookupBody(body);
    if (parsed.error) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: parsed.error }),
      };
    }

    const { phone, applicationId } = parsed.data;
    let query = supabase
      .from('merchant_applications')
      .select('id, store_name, status, created_at, review_notes')
      .eq('phone', phone);

    if (applicationId) {
      query = query.eq('id', applicationId);
    }

    const { data: row, error } = await query
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (error.message?.includes('merchant_applications')) {
        return {
          statusCode: 503,
          headers,
          body: JSON.stringify({
            ok: false,
            error: '入驻申请功能尚未开通，请联系 MARKET LINK 客服',
          }),
        };
      }
      throw error;
    }

    if (!row) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ ok: false, error: '未找到该手机号的申请' }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        ...toPublicApplicationStatus(row),
      }),
    };
  } catch (error) {
    console.error('merchant-apply-status error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: error.message || '查询失败，请稍后再试' }),
    };
  }
};
