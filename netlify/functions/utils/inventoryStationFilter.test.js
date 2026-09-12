const test = require('node:test');
const assert = require('node:assert/strict');
const { parseStationKeys, sanitizeStationKey } = require('./inventoryStationFilter');

test('parses and sanitizes station keys', () => {
  assert.equal(sanitizeStationKey('yg n,'), 'YGN');
  assert.deepEqual(parseStationKeys('YGN001, ygn, YGN001'), ['YGN001', 'YGN']);
  assert.deepEqual(parseStationKeys(''), []);
});
