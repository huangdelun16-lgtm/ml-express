const test = require('node:test');
const assert = require('node:assert/strict');
const {
  listRange,
  orderListIsSimple,
  packListIsSimple,
  parseConsoleListQuery,
  searchOrFilter,
} = require('./inventoryConsoleList');

test('parses list page and caps page size', () => {
  assert.deepEqual(parseConsoleListQuery({ listPage: '2', listPageSize: '15', q: ' PKG1 ' }), {
    page: 2,
    pageSize: 15,
    q: 'PKG1',
  });
  assert.equal(parseConsoleListQuery({ listPageSize: '500' }).pageSize, 50);
  assert.equal(parseConsoleListQuery({ listPage: '9999' }).page, 200);
  assert.equal(parseConsoleListQuery({}).page, 1);
});

test('range and search cover the whole table, not a fixed 500 window', () => {
  assert.deepEqual(listRange(3, 20), { from: 40, to: 59 });
  assert.equal(
    searchOrFilter('YGN_1%', ['order_barcode', 'recipient_phone']),
    'order_barcode.ilike.%YGN\\_1\\%%,recipient_phone.ilike.%YGN\\_1\\%%',
  );
  assert.equal(searchOrFilter('', ['order_barcode']), '');
});

test('marks filters that can use SQL count versus a scan', () => {
  assert.equal(packListIsSimple('hub_received'), true);
  assert.equal(packListIsSimple('active'), false);
  assert.equal(orderListIsSimple('awaiting_pickup'), false);
  assert.equal(orderListIsSimple('in_transit'), true);
});
