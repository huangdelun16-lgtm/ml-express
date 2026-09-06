const test = require('node:test');
const assert = require('node:assert/strict');
const {
  matchesPackTransportFilter,
  packStatusesForQuery,
} = require('./packDisplayStatus');

test('进行中 query still includes hub/split, then drops display-completed', () => {
  assert.deepEqual(packStatusesForQuery('active'), [
    'in_transit',
    'hub_received',
    'split_at_hub',
  ]);
  assert.equal(
    matchesPackTransportFilter(
      { status: 'split_at_hub', display_status: 'completed' },
      'active',
    ),
    false,
  );
  assert.equal(
    matchesPackTransportFilter(
      { status: 'in_transit', display_status: 'loaded' },
      'active',
    ),
    true,
  );
});

test('已完成 query includes hub/split so display-completed packs can land there', () => {
  assert.deepEqual(packStatusesForQuery('completed'), [
    'completed',
    'hub_received',
    'split_at_hub',
  ]);
  assert.equal(
    matchesPackTransportFilter(
      { status: 'split_at_hub', display_status: 'completed' },
      'completed',
    ),
    true,
  );
});
