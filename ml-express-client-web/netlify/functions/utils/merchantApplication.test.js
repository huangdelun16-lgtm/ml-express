const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseStatusLookupBody,
  toPublicApplicationStatus,
  validateApplicationPayload,
} = require('./merchantApplication');

function validBody(overrides = {}) {
  return {
    store_name: '夜市小馆',
    store_type: 'restaurant',
    region: 'mandalay',
    address: '曼德勒市中心测试路 88 号',
    latitude: 21.9588,
    longitude: 96.0891,
    phone: '09123456789',
    manager_name: '张三',
    manager_phone: '09987654321',
    operating_hours: '08:00 - 22:00',
    cod_settlement_day: '7',
    application_date: '2026-09-03',
    license_document_urls: ['https://example.com/license.jpg'],
    packing_acknowledged: true,
    packing_profile: 'food_safety',
    notes: '靠近夜市',
    ...overrides,
  };
}

test('rejects application when packing style is not acknowledged', () => {
  const result = validateApplicationPayload(validBody({ packing_acknowledged: false }));
  assert.equal(result.error, '请先查看并确认当前店铺类型的平台打包要求');
});

test('rejects application when packing profile does not match store type', () => {
  const result = validateApplicationPayload(validBody({ packing_profile: 'drinks_seal' }));
  assert.equal(result.error, '请先查看并确认当前店铺类型的平台打包要求');
});

test('status lookup requires a usable phone', () => {
  assert.equal(parseStatusLookupBody({ phone: '123' }).error, '请填写有效的联系电话');
  assert.deepEqual(parseStatusLookupBody({ phone: '09-1234-5678', applicationId: 'abc' }).data, {
    phone: '0912345678',
    applicationId: 'abc',
  });
});

test('public status hides manager details and only returns reject notes', () => {
  const pending = toPublicApplicationStatus({
    id: 'app-1',
    store_name: '夜市小馆',
    status: 'pending',
    created_at: '2026-09-03T00:00:00.000Z',
    review_notes: 'internal',
    manager_phone: '099999',
  });
  assert.equal(pending.applicationId, 'app-1');
  assert.equal(pending.review_notes, null);
  assert.equal(pending.manager_phone, undefined);

  const rejected = toPublicApplicationStatus({
    id: 'app-2',
    store_name: '夜市小馆',
    status: 'rejected',
    created_at: '2026-09-03T00:00:00.000Z',
    review_notes: '证件不清晰',
  });
  assert.equal(rejected.review_notes, '证件不清晰');
});

test('appends food-safety ack for restaurant applications', () => {
  const result = validateApplicationPayload(validBody());
  assert.equal(result.error, undefined);
  assert.match(result.data.notes, /靠近夜市/);
  assert.match(result.data.notes, /\[平台打包\] 已确认：食品安全包装/);
});
