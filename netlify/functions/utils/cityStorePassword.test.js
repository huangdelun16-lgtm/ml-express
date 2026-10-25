const { test } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { hashCityStorePassword } = require('./cityStorePassword');

test('city store hash is $2a$ and matches the password', () => {
  const hash = hashCityStorePassword('Abc12345');
  assert.match(hash, /^\$2a\$/);
  assert.equal(bcrypt.compareSync('Abc12345', hash.replace(/^\$2a\$/, '$2b$')), true);
  assert.equal(bcrypt.compareSync('nope', hash.replace(/^\$2a\$/, '$2b$')), false);
});

test('rejects short passwords', () => {
  assert.throws(() => hashCityStorePassword('12345'), /至少 6 位/);
});
