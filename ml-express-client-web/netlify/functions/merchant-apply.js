/**
 * 公开：商家入驻在线申请
 * POST /.netlify/functions/merchant-apply
 * 支持 license_document_urls 或 license_documents（base64 随表单一并提交）
 */

const { getCorsHeaders, handleCorsPreflight } = require('./utils/cors');
const { validateApplicationPayload } = require('./utils/merchantApplication');
const { createServiceClient, uploadLicenseDocuments } = require('./utils/merchantDocUpload');

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

    let license_document_urls = Array.isArray(body.license_document_urls)
      ? body.license_document_urls.map((u) => String(u).trim()).filter(Boolean)
      : [];

    if (license_document_urls.length < 1 && Array.isArray(body.license_documents)) {
      license_document_urls = await uploadLicenseDocuments(body.license_documents);
    }

    const validated = validateApplicationPayload({
      ...body,
      license_document_urls,
    });
    if (validated.error) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: validated.error }),
      };
    }

    const payload = validated.data;
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { count: recentPending, error: countErr } = await supabase
      .from('merchant_applications')
      .select('*', { count: 'exact', head: true })
      .eq('phone', payload.phone)
      .eq('status', 'pending')
      .gt('created_at', oneDayAgo);

    if (countErr) {
      if (countErr.message?.includes('merchant_applications')) {
        return {
          statusCode: 503,
          headers,
          body: JSON.stringify({
            ok: false,
            error: '入驻申请功能尚未开通，请联系 MARKET LINK 客服',
          }),
        };
      }
      throw countErr;
    }

    if ((recentPending || 0) >= 2) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({
          ok: false,
          error: '该手机号已有待审核申请，请等待审核结果后再提交',
        }),
      };
    }

    const { data: row, error: insertErr } = await supabase
      .from('merchant_applications')
      .insert([
        {
          ...payload,
          status: 'pending',
        },
      ])
      .select('id, store_name, status, created_at')
      .single();

    if (insertErr) throw insertErr;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        applicationId: row.id,
        message: '申请已提交，审核通过后我们将通过电话或邮箱联系您并开通商家账号',
      }),
    };
  } catch (error) {
    console.error('merchant-apply error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: error.message || '提交失败，请稍后再试' }),
    };
  }
};
