/**
 * 同城合伙商户入驻申请 — 与 Admin netlify/functions/utils/merchantApplication.js 保持同步
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
      notes,
      applicant_name,
      salesperson_name,
      application_date,
      license_document_urls,
    },
  };
}

module.exports = {
  MERCHANT_REGIONS,
  MERCHANT_STORE_TYPES,
  COD_SETTLEMENT_DAYS,
  validateApplicationPayload,
};
