/**
 * 城市店铺密码写入 delivery_store_secrets。
 * pgcrypto 的 crypt() 认 $2a$，bcryptjs 3 默认打出 $2b$，这里改前缀后再入库。
 */

const bcrypt = require('bcryptjs');

function hashCityStorePassword(password) {
  const plain = String(password || '');
  if (plain.length < 6) {
    throw new Error('密码至少 6 位');
  }
  return bcrypt.hashSync(plain, 12).replace(/^\$2b\$/, '$2a$');
}

module.exports = {
  hashCityStorePassword,
};
