const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_APPROVAL_EMAIL_BODY,
  applyPlaceholders,
  bodyKeepsCredentials,
  renderMerchantApprovalEmail,
  templateFromRows,
  APPROVAL_EMAIL_BODY_KEY,
  APPROVAL_EMAIL_SUBJECT_KEY,
} = require('./merchantApprovalEmail');

test('default email fills store code and password', () => {
  const mail = renderMerchantApprovalEmail({
    storeName: 'A <script>店',
    storeCode: 'YGN002',
    password: 'XY99ZZ88',
  });
  assert.match(mail.subject, /A <script>店/);
  assert.equal(mail.html.includes('<script>'), false);
  assert.match(mail.html, /A &lt;script&gt;店/);
  assert.match(mail.text, /YGN002/);
  assert.match(mail.text, /XY99ZZ88/);
  assert.match(mail.text, /ဆိုင်ကုဒ်/);
  assert.match(mail.text, /mlexpress-merchants.com/);
  assert.match(mail.text, /id6761371884/);
  assert.match(mail.text, /com\.mlexpress\.merchants/);
});

test('saved template replaces placeholders and keeps a missing password', () => {
  const mail = renderMerchantApprovalEmail(
    { storeName: '曼德勒店', storeCode: 'MDY005', password: 'Secret99' },
    { subject: '欢迎 {{店铺名称}}', body: '代码是 {{店铺代码}}，请登录。' },
  );
  assert.equal(mail.subject, '欢迎 曼德勒店');
  assert.match(mail.text, /MDY005/);
  assert.match(mail.text, /Secret99/);
  assert.equal(bodyKeepsCredentials('代码 {{店铺代码}} 密码 {{密码}}'), true);
  assert.equal(bodyKeepsCredentials('只有代码 {{店铺代码}}'), false);
});

test('empty saved rows fall back to the built-in letter', () => {
  assert.equal(templateFromRows([]), null);
  const saved = templateFromRows([
    { settings_key: APPROVAL_EMAIL_SUBJECT_KEY, settings_value: '自定义主题' },
    { settings_key: APPROVAL_EMAIL_BODY_KEY, settings_value: '' },
  ]);
  assert.equal(saved.subject, '自定义主题');
  assert.equal(saved.body, DEFAULT_APPROVAL_EMAIL_BODY);
  assert.match(applyPlaceholders(saved.body, { storeCode: 'MDY005', password: 'Abc12345', storeName: '店', loginUrl: 'https://mlexpress-merchants.com' }), /MDY005/);
});
