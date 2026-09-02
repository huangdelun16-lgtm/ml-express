const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseAutomationSettings,
  isAssignablePackage,
  isReassignDue,
  shouldReassign,
  normalizeRegion,
  sameRegion,
  pickCourierForPackage,
  countActiveByCourier,
  nextStatusForAssign,
} = require('./courierDispatch');

test('parses automation settings from system_settings rows', () => {
  const parsed = parseAutomationSettings([
    { settings_key: 'automation.auto_dispatch_enabled', settings_value: true },
    { settings_key: 'automation.auto_assign_strategy', settings_value: 'rating_first' },
    { settings_key: 'automation.max_active_orders', settings_value: 5 },
    { settings_key: 'automation.reassign_timeout_minutes', settings_value: 8 },
  ]);
  assert.equal(parsed.enabled, true);
  assert.equal(parsed.strategy, 'rating_first');
  assert.equal(parsed.maxActive, 5);
  assert.equal(parsed.reassignMinutes, 8);
});

test('only unassigned 待取件/待收款 are auto-dispatchable', () => {
  assert.equal(isAssignablePackage({ status: '待取件', courier: '待分配' }), true);
  assert.equal(isAssignablePackage({ status: '待确认', courier: '待分配' }), false);
  assert.equal(isAssignablePackage({ status: '待取件', courier: 'KO KO' }), false);
});

test('reassign waits until the assigned rider is offline', () => {
  const now = Date.parse('2026-09-02T10:00:00.000Z');
  const pkg = { status: '待取件', courier: 'KO KO', updated_at: '2026-09-02T09:51:00.000Z' };
  assert.equal(
    shouldReassign(pkg, [{ name: 'KO KO', status: 'active' }], 8, now),
    false,
  );
  assert.equal(
    shouldReassign(pkg, [{ name: 'KO KO', status: 'inactive' }], 8, now),
    true,
  );
  assert.equal(shouldReassign(pkg, [], 8, now), true);
});

test('reassign is due after the timeout while still 待取件', () => {
  const now = Date.parse('2026-09-02T10:00:00.000Z');
  assert.equal(
    isReassignDue(
      { status: '待取件', courier: 'KO KO', updated_at: '2026-09-02T09:51:00.000Z' },
      8,
      now,
    ),
    true,
  );
  assert.equal(
    isReassignDue(
      { status: '待取件', courier: 'KO KO', updated_at: '2026-09-02T09:53:00.000Z' },
      8,
      now,
    ),
    false,
  );
  assert.equal(
    isReassignDue(
      { status: '已取件', courier: 'KO KO', updated_at: '2026-09-02T09:00:00.000Z' },
      8,
      now,
    ),
    false,
  );
});

test('matches package region to courier employee prefix', () => {
  assert.equal(normalizeRegion('mandalay'), 'mandalay');
  assert.equal(normalizeRegion(null, 'MDY123'), 'mandalay');
  assert.equal(normalizeRegion(null, 'MDY-RIDER-003'), 'mandalay');
  assert.equal(
    sameRegion(
      { id: 'MDY1', region: 'mandalay' },
      { employee_id: 'YGN-RIDER-001', region: 'yangon' },
    ),
    false,
  );
  assert.equal(
    sameRegion({ id: 'MDY1', region: 'mandalay' }, { employee_id: 'MDY-RIDER-003' }),
    true,
  );
});

test('distance_first prefers nearer rider under the active-order cap', () => {
  const picked = pickCourierForPackage(
    {
      id: 'MDY1',
      region: 'mandalay',
      status: '待取件',
      courier: '待分配',
      sender_latitude: 21.96,
      sender_longitude: 96.09,
    },
    [
      {
        id: 'far',
        name: '远',
        status: 'active',
        employee_id: 'MDY-RIDER-009',
        latitude: 16.8,
        longitude: 96.1,
        currentPackages: 0,
        rating: 5,
      },
      {
        id: 'near',
        name: '近',
        status: 'active',
        employee_id: 'MDY-RIDER-001',
        latitude: 21.961,
        longitude: 96.091,
        currentPackages: 1,
        rating: 4,
      },
      {
        id: 'full',
        name: '满',
        status: 'active',
        employee_id: 'MDY-RIDER-002',
        latitude: 21.96,
        longitude: 96.09,
        currentPackages: 5,
        rating: 5,
      },
    ],
    { strategy: 'distance_first', maxActiveOrders: 5 },
  );
  assert.equal(picked.name, '近');
});

test('rating_first prefers higher rating', () => {
  const picked = pickCourierForPackage(
    { id: 'MDY1', region: 'mandalay', status: '待取件', courier: '待分配' },
    [
      { id: 'a', name: '低评', status: 'active', employee_id: 'MDY-1', currentPackages: 0, rating: 3 },
      { id: 'b', name: '高评', status: 'active', employee_id: 'MDY-2', currentPackages: 1, rating: 4.9 },
    ],
    { strategy: 'rating_first', maxActiveOrders: 12 },
  );
  assert.equal(picked.name, '高评');
});

test('counts only in-progress packages per rider name', () => {
  const counts = countActiveByCourier([
    { courier: 'KO KO', status: '待取件' },
    { courier: 'KO KO', status: '已送达' },
    { courier: '待分配', status: '待取件' },
  ]);
  assert.equal(counts['KO KO'], 1);
});

test('keeps 待收款 status when assigning', () => {
  assert.equal(nextStatusForAssign('待收款'), '待收款');
  assert.equal(nextStatusForAssign('待取件'), '待取件');
});
