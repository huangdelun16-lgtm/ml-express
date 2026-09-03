/**
 * 同城合伙商户入驻申请 — 校验、店铺代码与密码生成（Admin Functions 共用）
 */

const MERCHANT_REGIONS = [
  { id: 'mandalay', nameZh: '曼德勒', prefix: 'MDY' },
  { id: 'maymyo', nameZh: '彬乌伦', prefix: 'POL' },
  { id: 'yangon', nameZh: '仰光', prefix: 'YGN' },
  { id: 'naypyidaw', nameZh: '内比都', prefix: 'NPW' },
  { id: 'taunggyi', nameZh: '东枝', prefix: 'TGI' },
  { id: 'lashio', nameZh: '腊戌', prefix: 'LSO' },
  { id: 'muse', nameZh: '木姐', prefix: 'MUSE' },
];

const MERCHANT_STORE_TYPES = [
  'restaurant',
  'drinks_snacks',
  'breakfast',
  'cake_shop',
  'tea_shop',
  'flower_shop',
  'clothing_store',
  'grocery',
  'supermarket',
  'other',
];

const COD_SETTLEMENT_DAYS = ['7', '10', '15', '30'];

const PACKING_PROFILE_BY_STORE = {
  restaurant: 'food_safety',
  breakfast: 'food_safety',
  drinks_snacks: 'drinks_seal',
  tea_shop: 'drinks_seal',
  cake_shop: 'bakery_box',
  flower_shop: 'flower_wrap',
  clothing_store: 'apparel_bag',
  grocery: 'grocery_sort',
  supermarket: 'grocery_sort',
  other: 'parcel_standard',
};

const PACKING_PROFILE_LABEL_ZH = {
  food_safety: '食品安全包装',
  drinks_seal: '饮品防漏包装',
  bakery_box: '蛋糕直立包装',
  flower_wrap: '鲜花保水包装',
  apparel_bag: '服装平整包装',
  grocery_sort: '百货分装包装',
  parcel_standard: '标准包裹包装',
};

function appendPackingAckToNotes(notes, profileId) {
  const label = PACKING_PROFILE_LABEL_ZH[profileId] || profileId;
  const line = `[平台打包] 已确认：${label}`;
  const cleaned = String(notes || '')
    .replace(/\[平台打包\][^\n]*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return cleaned ? `${cleaned}\n${line}` : line;
}

function findRegion(regionId) {
  return MERCHANT_REGIONS.find((r) => r.id === regionId) || MERCHANT_REGIONS[0];
}

function generateMerchantPassword(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function normalizePhone(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function validateApplicationPayload(body) {
  const store_name = String(body.store_name ?? '').trim();
  const store_type = String(body.store_type ?? '').trim();
  const region = String(body.region ?? '').trim();
  const address = String(body.address ?? '').trim();
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  const phone = normalizePhone(body.phone);
  const email = String(body.email ?? '').trim() || null;
  const manager_name = String(body.manager_name ?? '').trim();
  const manager_phone = normalizePhone(body.manager_phone);
  const operating_hours = String(body.operating_hours ?? '08:00 - 22:00').trim();
  const cod_settlement_day = String(body.cod_settlement_day ?? '7').trim();
  const notes = String(body.notes ?? '').trim() || null;
  const applicant_name = String(body.applicant_name ?? '').trim() || null;
  const salesperson_name = String(body.salesperson_name ?? '').trim() || null;
  const application_date = String(body.application_date ?? '').trim();
  const license_document_urls = Array.isArray(body.license_document_urls)
    ? body.license_document_urls.map((u) => String(u).trim()).filter(Boolean)
    : [];
  const facilities = Array.isArray(body.facilities)
    ? body.facilities.map((f) => String(f).trim()).filter(Boolean)
    : [];

  if (!store_name || store_name.length < 2) {
    return { error: '请填写有效的店铺名称' };
  }
  if (!MERCHANT_STORE_TYPES.includes(store_type)) {
    return { error: '请选择有效的店铺类型' };
  }
  if (!MERCHANT_REGIONS.some((r) => r.id === region)) {
    return { error: '请选择有效的经营区域' };
  }
  if (!address || address.length < 5) {
    return { error: '请填写详细地址' };
  }
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { error: '请在地图上选择店铺位置' };
  }
  if (!phone || phone.length < 8) {
    return { error: '请填写有效的联系电话' };
  }
  if (!manager_name) {
    return { error: '请填写负责人姓名' };
  }
  if (!manager_phone || manager_phone.length < 8) {
    return { error: '请填写有效的负责人手机' };
  }
  if (!COD_SETTLEMENT_DAYS.includes(cod_settlement_day)) {
    return { error: 'COD 结清周期无效' };
  }
  if (!application_date || !/^\d{4}-\d{2}-\d{2}$/.test(application_date)) {
    return { error: '请选择有效的申请日期' };
  }
  if (license_document_urls.length < 1) {
    return { error: '请至少上传一份商店证件' };
  }
  if (license_document_urls.length > 8) {
    return { error: '证件数量过多，最多 8 份' };
  }
  const expectedPacking = PACKING_PROFILE_BY_STORE[store_type];
  if (body.packing_acknowledged !== true || String(body.packing_profile || '') !== expectedPacking) {
    return { error: '请先查看并确认当前店铺类型的平台打包要求' };
  }
  const notesWithAck = appendPackingAckToNotes(notes, expectedPacking);

  return {
    data: {
      store_name,
      store_type,
      region,
      address,
      latitude,
      longitude,
      phone,
      email,
      manager_name,
      manager_phone,
      operating_hours,
      cod_settlement_day,
      facilities,
      notes: notesWithAck,
      applicant_name,
      salesperson_name,
      application_date,
      license_document_urls,
    },
  };
}

async function resolveNextMerchantStoreCode(supabase, regionId) {
  const hub = findRegion(regionId);
  const prefix = hub.prefix.toUpperCase();
  const { data, error } = await supabase
    .from('delivery_stores')
    .select('store_code')
    .ilike('store_code', `${prefix}%`);
  if (error) throw error;

  const suffixRe = new RegExp(`^${prefix}(\\d+)$`, 'i');
  let maxSuffix = 0;
  for (const row of data || []) {
    const code = String(row.store_code ?? '').trim().toUpperCase();
    const match = code.match(suffixRe);
    if (match) {
      maxSuffix = Math.max(maxSuffix, Number.parseInt(match[1], 10));
    }
  }
  return `${prefix}${String(maxSuffix + 1).padStart(3, '0')}`;
}

async function assertStoreCodeAvailable(supabase, storeCode) {
  const code = String(storeCode ?? '').trim().toUpperCase();
  if (!code || code.length < 3) {
    throw new Error('店铺代码无效');
  }
  const { data: existing, error } = await supabase
    .from('delivery_stores')
    .select('id')
    .eq('store_code', code)
    .maybeSingle();
  if (error) throw error;
  if (existing) {
    throw new Error(`店铺代码 ${code} 已被使用，请刷新后重试`);
  }
  return code;
}

async function createMerchantStoreFromApplication(supabase, application, options = {}) {
  const requestedCode = String(options.store_code ?? '').trim();
  const store_code = requestedCode
    ? await assertStoreCodeAvailable(supabase, requestedCode)
    : await resolveNextMerchantStoreCode(supabase, application.region);
  const password = String(options.password ?? '').trim() || generateMerchantPassword();
  const reviewedBy = options.reviewedBy || 'admin';

  const noteParts = ['[入驻申请]'];
  if (application.salesperson_name) {
    noteParts.push(`推销员: ${application.salesperson_name}`);
  }
  if (application.application_date) {
    noteParts.push(`申请日期: ${application.application_date}`);
  }
  if (application.notes) {
    noteParts.push(application.notes);
  }

  const insertRow = {
    store_name: application.store_name,
    store_code,
    address: application.address,
    latitude: application.latitude,
    longitude: application.longitude,
    phone: application.phone,
    email: application.email,
    manager_name: application.manager_name,
    manager_phone: application.manager_phone,
    store_type: application.store_type,
    operating_hours: application.operating_hours,
    service_area_radius: 5,
    capacity: 1000,
    facilities: application.facilities || [],
    notes: noteParts.join(' | '),
    password,
    region: application.region,
    cod_settlement_day: application.cod_settlement_day,
    current_load: 0,
    status: 'active',
    mall_visible: true,
    created_by: reviewedBy,
  };

  const { data: store, error: insertErr } = await supabase
    .from('delivery_stores')
    .insert([insertRow])
    .select('id, store_code, store_name, region, status')
    .single();

  if (insertErr) throw insertErr;

  return { store, password, store_code: store.store_code };
}

module.exports = {
  MERCHANT_REGIONS,
  MERCHANT_STORE_TYPES,
  COD_SETTLEMENT_DAYS,
  validateApplicationPayload,
  resolveNextMerchantStoreCode,
  assertStoreCodeAvailable,
  createMerchantStoreFromApplication,
  generateMerchantPassword,
};
