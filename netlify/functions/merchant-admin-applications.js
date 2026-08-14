/**
 * Admin：商家入驻申请列表 / 审核
 * GET  ?status=pending|approved|rejected|all
 * GET  ?id=<uuid>
 * POST { action: 'approve'|'reject', applicationId, review_notes?, password? }
 */

const { createClient } = require('@supabase/supabase-js');
const { verifyAdminToken } = require('./verify-admin');
const { getAdminTokenFromEvent } = require('./utils/adminToken');
const { getCorsHeaders, handleCorsPreflight } = require('./utils/cors');
const {
  createMerchantStoreFromApplication,
  generateMerchantPassword,
  resolveNextMerchantStoreCode,
} = require('./utils/merchantApplication');


const APPLICATION_COLUMNS =
  'id, store_name, store_type, region, address, latitude, longitude, phone, email, manager_name, manager_phone, operating_hours, cod_settlement_day, facilities, notes, applicant_name, salesperson_name, application_date, license_document_urls, status, review_notes, reviewed_by, reviewed_at, created_store_id, provisioned_store_code, created_at, updated_at';

exports.handler = async (event) => {
  const preflightResponse = handleCorsPreflight(event, {
    allowedMethods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  if (preflightResponse) return preflightResponse;

  const headers = getCorsHeaders(event, {
    allowedMethods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const token = getAdminTokenFromEvent(event);
  const auth = await verifyAdminToken(token, ['admin', 'manager'], ['merchant_stores']);
  if (!auth.valid) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: auth.error || '未授权' }),
    };
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

  if (!supabaseUrl || !serviceKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: '缺少 SUPABASE_SERVICE_ROLE_KEY 配置' }),
    };
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters || {};
      const id = String(params.id || '').trim();

      if (id) {
        const { data, error } = await supabase
          .from('merchant_applications')
          .select(APPLICATION_COLUMNS)
          .eq('id', id)
          .maybeSingle();
        if (error) throw error;
        if (!data) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: '申请不存在' }),
          };
        }
        const suggested_store_code = await resolveNextMerchantStoreCode(supabase, data.region);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ application: data, suggested_store_code }),
        };
      }

      const status = String(params.status || 'pending').trim();
      let query = supabase
        .from('merchant_applications')
        .select(APPLICATION_COLUMNS)
        .order('created_at', { ascending: false })
        .limit(200);

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;

      const { count: pendingCount } = await supabase
        .from('merchant_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          applications: data || [],
          pendingCount: pendingCount || 0,
        }),
      };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const action = String(body.action || '').trim();
      const applicationId = String(body.applicationId || '').trim();
      const review_notes = String(body.review_notes ?? '').trim() || null;
      const customPassword = String(body.password ?? '').trim();
      const requestedStoreCode = String(body.store_code ?? '').trim();

      if (!applicationId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: '缺少 applicationId' }),
        };
      }

      const { data: application, error: loadErr } = await supabase
        .from('merchant_applications')
        .select(APPLICATION_COLUMNS)
        .eq('id', applicationId)
        .maybeSingle();
      if (loadErr) throw loadErr;
      if (!application) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: '申请不存在' }),
        };
      }
      if (application.status !== 'pending') {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({ error: '该申请已处理，无法重复操作' }),
        };
      }

      const reviewer = auth.user?.username || 'admin';
      const now = new Date().toISOString();

      if (action === 'reject') {
        const { data: updated, error: rejectErr } = await supabase
          .from('merchant_applications')
          .update({
            status: 'rejected',
            review_notes,
            reviewed_by: reviewer,
            reviewed_at: now,
            updated_at: now,
          })
          .eq('id', applicationId)
          .select(APPLICATION_COLUMNS)
          .single();
        if (rejectErr) throw rejectErr;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ ok: true, application: updated }),
        };
      }

      if (action === 'approve') {
        if (customPassword && customPassword.length < 6) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: '自定义密码至少 6 位' }),
          };
        }

        const password = customPassword || generateMerchantPassword();
        const { store, store_code } = await createMerchantStoreFromApplication(
          supabase,
          application,
          { password, reviewedBy: reviewer, store_code: requestedStoreCode || undefined },
        );

        const { data: updated, error: approveErr } = await supabase
          .from('merchant_applications')
          .update({
            status: 'approved',
            review_notes,
            reviewed_by: reviewer,
            reviewed_at: now,
            created_store_id: store.id,
            provisioned_store_code: store_code,
            updated_at: now,
          })
          .eq('id', applicationId)
          .select(APPLICATION_COLUMNS)
          .single();
        if (approveErr) throw approveErr;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            ok: true,
            application: updated,
            credentials: {
              storeCode: store_code,
              password,
              storeName: store.store_name,
            },
          }),
        };
      }

      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '无效 action，请使用 approve 或 reject' }),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  } catch (error) {
    console.error('merchant-admin-applications error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || '操作失败' }),
    };
  }
};
