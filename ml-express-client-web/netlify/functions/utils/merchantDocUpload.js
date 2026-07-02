/**
 * 商家入驻证件上传（merchant-apply / merchant-apply-upload 共用）
 */

const { createClient } = require('@supabase/supabase-js');

const BUCKET = 'merchant-application-docs';
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

function resolveSupabaseConfig() {
  let supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.REACT_APP_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    '';
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY ||
    '';

  supabaseUrl = String(supabaseUrl).trim();
  if (supabaseUrl.startsWith('//')) supabaseUrl = `https:${supabaseUrl}`;
  else if (!supabaseUrl.startsWith('http')) supabaseUrl = supabaseUrl ? `https://${supabaseUrl}` : '';
  supabaseUrl = supabaseUrl.replace(/\/+$/, '');

  return { supabaseUrl, serviceKey };
}

function createServiceClient() {
  const { supabaseUrl, serviceKey } = resolveSupabaseConfig();
  if (!supabaseUrl || !serviceKey) {
    return { error: '上传服务暂不可用，请联系 MARKET LINK 客服' };
  }
  return {
    supabase: createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  };
}

async function ensureBucket(supabase) {
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) throw listErr;
  if (buckets?.some((b) => b.id === BUCKET || b.name === BUCKET)) return;

  const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: [...ALLOWED_TYPES],
  });
  if (createErr && !/already exists/i.test(createErr.message || '')) {
    throw createErr;
  }
}

async function uploadOneDocument(supabase, input) {
  const fileName = String(input.fileName ?? 'document').trim();
  const contentType = String(input.contentType ?? '').trim().toLowerCase();
  const base64 = String(input.base64 ?? '').replace(/^data:[^;]+;base64,/, '');

  if (!base64) throw new Error('未接收到文件数据');
  if (!ALLOWED_TYPES.has(contentType)) {
    throw new Error('仅支持 JPG、PNG、WEBP 或 PDF');
  }

  const buffer = Buffer.from(base64, 'base64');
  if (buffer.length > MAX_BYTES) {
    throw new Error('单个文件不能超过 5MB');
  }

  const ext = fileName.includes('.')
    ? fileName.split('.').pop().toLowerCase()
    : contentType.includes('pdf')
      ? 'pdf'
      : 'jpg';
  const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf'].includes(ext) ? ext : 'jpg';
  const filePath = `applications/${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${safeExt}`;

  let uploadErr = (
    await supabase.storage.from(BUCKET).upload(filePath, buffer, {
      contentType,
      upsert: false,
    })
  ).error;

  if (uploadErr && /bucket/i.test(uploadErr.message || '')) {
    await ensureBucket(supabase);
    uploadErr = (
      await supabase.storage.from(BUCKET).upload(filePath, buffer, {
        contentType,
        upsert: false,
      })
    ).error;
  }

  if (uploadErr) throw uploadErr;

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

  return publicUrl;
}

async function uploadLicenseDocuments(documents) {
  const { supabase, error } = createServiceClient();
  if (error) throw new Error(error);
  if (!Array.isArray(documents) || documents.length < 1) {
    throw new Error('请至少上传一份商店证件');
  }
  if (documents.length > 8) {
    throw new Error('证件数量过多，最多 8 份');
  }

  await ensureBucket(supabase);

  const urls = [];
  for (const doc of documents) {
    urls.push(await uploadOneDocument(supabase, doc));
  }
  return urls;
}

module.exports = {
  BUCKET,
  resolveSupabaseConfig,
  createServiceClient,
  uploadOneDocument,
  uploadLicenseDocuments,
};
