const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  MERCHANT_WEB_URL,
  toE164Myanmar,
  uniqueRecipientPhones,
  buildCredentialsSms,
  buildCredentialsEmail,
  summarizeNotifyAttempts,
} = require('./notifyMerchantCredentials');

test('normalizes Myanmar phones to E.164', () => {
  assert.equal(toE164Myanmar('09 123 456 789'), '+959123456789');
  assert.equal(toE164Myanmar('+95 9 123456789'), '+959123456789');
  assert.equal(toE164Myanmar('959123456789'), '+959123456789');
  assert.equal(toE164Myanmar(''), null);
});

test('dedupes store phone and manager phone', () => {
  assert.deepEqual(
    uniqueRecipientPhones({
      phone: '09123456789',
      manager_phone: '+95 9 123 456 789',
    }),
    ['+959123456789'],
  );
  assert.deepEqual(
    uniqueRecipientPhones({
      phone: '09111111111',
      manager_phone: '09222222222',
    }),
    ['+959111111111', '+959222222222'],
  );
});

test('SMS body includes credentials and login URL', () => {
  const body = buildCredentialsSms({
    storeName: '测试店',
    storeCode: 'MDY001',
    password: 'AB12CD34',
  });
  assert.match(body, /测试店/);
  assert.match(body, /MDY001/);
  assert.match(body, /AB12CD34/);
  assert.match(body, new RegExp(MERCHANT_WEB_URL.replace(/\./g, '\\.')));
});

test('email HTML escapes store name', () => {
  const mail = buildCredentialsEmail({
    storeName: 'A <script>店',
    storeCode: 'YGN002',
    password: 'XY99ZZ88',
  });
  assert.match(mail.subject, /A <script>店/);
  assert.equal(mail.html.includes('<script>'), false);
  assert.match(mail.html, /A &lt;script&gt;店/);
  assert.match(mail.html, /YGN002/);
});

test('summarizeNotifyAttempts ignores skipped config gaps', () => {
  const result = summarizeNotifyAttempts([
    { channel: 'sms', to: '+9591', sent: false, skipped: true, error: 'twilio_not_configured' },
    { channel: 'email', to: 'a@b.com', sent: true },
  ]);
  assert.equal(result.smsSent, false);
  assert.deepEqual(result.smsTo, []);
  assert.equal(result.emailSent, true);
  assert.equal(result.emailTo, 'a@b.com');
  assert.deepEqual(result.errors, []);
});
