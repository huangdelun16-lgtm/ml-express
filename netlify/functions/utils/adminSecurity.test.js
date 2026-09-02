const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  isAdminBrowserRequest,
  getClientIp,
  ipAllowed,
  shouldEnforceIpWhitelist,
  evaluateLoginLock,
  recordFailedLogin,
  clearFailedLogin,
  clampFailedLoginLimit,
} = require('./adminSecurity');

test('IP whitelist matches exact IPv4 and CIDR', () => {
  assert.equal(ipAllowed('203.0.113.10', ['203.0.113.10']), true);
  assert.equal(ipAllowed('203.0.113.11', ['203.0.113.10']), false);
  assert.equal(ipAllowed('203.0.113.20', ['203.0.113.0/24']), true);
  assert.equal(ipAllowed('198.51.100.1', ['203.0.113.0/24']), false);
  assert.equal(ipAllowed('::ffff:203.0.113.10', ['203.0.113.10']), true);
});

test('empty whitelist does not enforce', () => {
  assert.equal(shouldEnforceIpWhitelist(true, []), false);
  assert.equal(shouldEnforceIpWhitelist(true, ''), false);
  assert.equal(shouldEnforceIpWhitelist(false, ['1.1.1.1']), false);
  assert.equal(shouldEnforceIpWhitelist(true, ['1.1.1.1']), true);
  assert.equal(ipAllowed('8.8.8.8', []), true);
});

test('reads Netlify client IP from forwarded headers', () => {
  assert.equal(
    getClientIp({ headers: { 'x-nf-client-connection-ip': '203.0.113.9' } }),
    '203.0.113.9',
  );
  assert.equal(
    getClientIp({ headers: { 'x-forwarded-for': '203.0.113.1, 10.0.0.1' } }),
    '203.0.113.1',
  );
});

test('rider app is not treated as admin browser', () => {
  assert.equal(
    isAdminBrowserRequest({
      headers: {
        origin: 'https://admin-market-link-express.com',
        'user-agent': 'ML-Express-Rider-App',
      },
    }),
    false,
  );
  assert.equal(
    isAdminBrowserRequest({
      headers: {
        origin: 'https://admin-market-link-express.com',
        'user-agent': 'Mozilla/5.0',
      },
    }),
    true,
  );
});

test('failed login locks after the configured limit', () => {
  const now = 1_700_000_000_000;
  let state = {};
  for (let i = 0; i < 4; i += 1) {
    const next = recordFailedLogin(state, 'alice', now, 5);
    state = next.state;
    assert.equal(next.locked, false);
  }
  const locked = recordFailedLogin(state, 'alice', now, 5);
  assert.equal(locked.locked, true);
  assert.equal(evaluateLoginLock(locked.state, 'alice', now).blocked, true);
  assert.equal(evaluateLoginLock(locked.state, 'alice', now + 16 * 60 * 1000).blocked, false);
  assert.deepEqual(clearFailedLogin(locked.state, 'alice').alice, undefined);
});

test('failed login limit is clamped to 3–20', () => {
  assert.equal(clampFailedLoginLimit(1), 3);
  assert.equal(clampFailedLoginLimit(5), 5);
  assert.equal(clampFailedLoginLimit(99), 20);
});
