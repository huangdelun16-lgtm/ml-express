const test = require('node:test');
const assert = require('node:assert/strict');
const { collapseExpressList, expressDetailSubject } = require('./expressDetailsGroups');

function row(partial) {
  return {
    id: partial.id,
    barcode: partial.barcode,
    input_barcode: partial.input || '',
    name: partial.name || '',
    spec: '',
    unit: '',
    weight: partial.weight || '',
    qty_on_hand: partial.qty ?? 1,
    recipient_name: partial.customer || 'Kyal Sin Lin',
    final_destination: partial.destination || 'MSE',
    owner_store_code: 'ML-RUILI',
    note: '',
    packed_at: partial.packedAt || '',
    packed_bundle_barcode: partial.pack || '',
    hub_arrived_at: '',
    customer_signed_at: partial.signed || '',
    hub_transit_released_at: '',
    hub_transit_shipped_at: '',
    created_at: partial.updated || '2026-11-01T00:00:00Z',
    updated_at: partial.updated || '2026-11-01T00:00:00Z',
  };
}

const none = () => '';

test('多个入库合成一行，包装壳不出现，件数是订单条数', () => {
  const shell = row({
    id: 'shell',
    barcode: 'RUI26MSE20001',
    name: 'Kyal Sin Lin 包装',
    weight: '134.6 Kg',
    qty: 1,
    updated: '2026-11-09T12:00:00Z',
  });
  const first = row({
    id: 'a',
    barcode: 'MSE092715041126(2-1)',
    input: 'S71664443717',
    qty: 0,
    signed: '2026-11-10T01:00:00Z',
    updated: '2026-11-10T01:00:00Z',
  });
  const second = row({
    id: 'b',
    barcode: 'MSE092715041126(2-2)',
    input: 'S71797078800',
    qty: 0,
    signed: '2026-11-10T02:00:00Z',
    updated: '2026-11-10T02:00:00Z',
  });
  const pack = new Map([
    ['MSE092715041126(2-1)', 'RUI26MSE20001'],
    ['MSE092715041126(2-2)', 'RUI26MSE20001'],
  ]);
  const items = collapseExpressList({
    pageRows: [second, first, shell],
    relatedRows: [],
    packByItemBarcode: pack,
    exceptionStatus: none,
    searching: false,
  });
  assert.equal(items.length, 1);
  assert.equal(items[0].qty, 2);
  assert.equal(items[0].packBarcode, 'RUI26MSE20001');
  assert.equal(items[0].packed, true);
  assert.equal(items[0].weight, '134.6 Kg');
  assert.equal(items[0].status, 'signed');
  assert.equal(items[0].expressBarcode, 'S71664443717\nS71797078800');
  assert.equal(items[0].inboundBarcode, 'MSE092715041126(2-1)\nMSE092715041126(2-2)');
  assert.equal(items[0].id, 'a');
});

test('包装壳在这一页、订单在关联行里时，仍然合成一行', () => {
  const shell = row({ id: 'shell', barcode: 'RUI26MSE20001', weight: '10 Kg', updated: '2026-11-10T03:00:00Z' });
  const line = row({
    id: 'a',
    barcode: 'MSE1(2-1)',
    input: 'AAA',
    signed: '2026-11-09T00:00:00Z',
    updated: '2026-11-09T00:00:00Z',
  });
  const items = collapseExpressList({
    pageRows: [shell],
    relatedRows: [line, row({ id: 'b', barcode: 'MSE1(2-2)', input: 'BBB', signed: '2026-11-09T00:00:00Z', updated: '2026-11-08T00:00:00Z' })],
    packByItemBarcode: new Map([
      ['MSE1(2-1)', 'RUI26MSE20001'],
      ['MSE1(2-2)', 'RUI26MSE20001'],
    ]),
    exceptionStatus: none,
    searching: false,
  });
  assert.equal(items.length, 1);
  assert.equal(items[0].qty, 2);
  assert.equal(items[0].expressBarcode, 'AAA\nBBB');
});

test('订单不在最新那一页时不再单独出现', () => {
  const shell = row({ id: 'shell', barcode: 'RUI26MSE20001', updated: '2026-11-10T03:00:00Z' });
  const line = row({ id: 'a', barcode: 'MSE1(2-1)', input: 'AAA', updated: '2026-11-09T00:00:00Z' });
  const items = collapseExpressList({
    pageRows: [line],
    relatedRows: [shell],
    packByItemBarcode: new Map([['MSE1(2-1)', 'RUI26MSE20001']]),
    exceptionStatus: none,
    searching: false,
  });
  assert.equal(items.length, 0);
});

test('搜索时即使不是最新一条，也要能看到这一包', () => {
  const shell = row({ id: 'shell', barcode: 'RUI26MSE20001', updated: '2026-11-10T03:00:00Z' });
  const line = row({ id: 'a', barcode: 'MSE1(2-1)', input: 'AAA', updated: '2026-11-09T00:00:00Z' });
  const items = collapseExpressList({
    pageRows: [line],
    relatedRows: [shell, row({ id: 'b', barcode: 'MSE1(2-2)', input: 'BBB', updated: '2026-11-08T00:00:00Z' })],
    packByItemBarcode: new Map([
      ['MSE1(2-1)', 'RUI26MSE20001'],
      ['MSE1(2-2)', 'RUI26MSE20001'],
    ]),
    exceptionStatus: none,
    searching: true,
  });
  assert.equal(items.length, 1);
  assert.equal(items[0].qty, 2);
});

test('没有包装关系的订单保持原样，包装壳单独一页不显示', () => {
  const single = row({ id: 's', barcode: 'MDY035908081126', input: '79155850118884', weight: '0.1 Kg', qty: 1 });
  const shell = row({ id: 'shell', barcode: 'RUI26MSE20001', weight: '134.6 Kg' });
  const items = collapseExpressList({
    pageRows: [single, shell],
    relatedRows: [],
    packByItemBarcode: new Map(),
    exceptionStatus: none,
    searching: false,
  });
  assert.equal(items.length, 1);
  assert.equal(items[0].id, 's');
  assert.equal(items[0].qty, 1);
  assert.equal(items[0].weight, '0.1 Kg');
  assert.equal(items[0].packBarcode, '');
});

test('件上没写包装号时，仍按 (2-1)(2-2) 合成，包装号从关联补上', () => {
  const first = row({ id: 'a', barcode: 'MSE092715041126(2-1)', input: 'S71664443717', qty: 0, signed: '2026-11-10T00:00:00Z' });
  const second = row({ id: 'b', barcode: 'MSE092715041126(2-2)', input: 'S71797078800', qty: 0, signed: '2026-11-10T00:00:00Z', updated: '2026-11-10T02:00:00Z' });
  const items = collapseExpressList({
    pageRows: [second],
    relatedRows: [first],
    packByItemBarcode: new Map([['MSE092715041126(2-1)', 'RUI26MSE20001']]),
    exceptionStatus: none,
    searching: false,
  });
  assert.equal(items.length, 1);
  assert.equal(items[0].packBarcode, 'RUI26MSE20001');
  assert.equal(items[0].qty, 2);
});

test('有一件未签收时，整行不显示已签收', () => {
  const first = row({ id: 'a', barcode: 'MSE1(2-1)', input: 'AAA', signed: '2026-11-10T00:00:00Z', updated: '2026-11-10T02:00:00Z' });
  const second = row({ id: 'b', barcode: 'MSE1(2-2)', input: 'BBB', qty: 1, updated: '2026-11-09T00:00:00Z' });
  const items = collapseExpressList({
    pageRows: [first, second],
    relatedRows: [],
    packByItemBarcode: new Map(),
    exceptionStatus: none,
    searching: false,
  });
  assert.equal(items[0].status, 'inbound');
});

test('一包多单显示各单重量之和，包装壳的重量不算进去', () => {
  const shell = row({
    id: 'shell',
    barcode: 'RUI26MSE150001',
    weight: '99 Kg',
    updated: '2026-11-10T04:00:00Z',
  });
  const weights = ['2 Kg', '1 Kg', '0.1 Kg', '0.2 Kg', '3 Kg', '1.2 Kg', '0.5 Kg'];
  const lines = weights.map((weight, index) => row({
    id: `w${index}`,
    barcode: `MSE9(7-${index + 1})`,
    input: `E${index}`,
    weight,
    packedAt: '2026-11-10T00:00:00Z',
    updated: `2026-11-10T00:0${index}:00Z`,
  }));
  const items = collapseExpressList({
    pageRows: [shell, ...lines],
    relatedRows: [],
    packByItemBarcode: new Map(lines.map((line) => [line.barcode, 'RUI26MSE150001'])),
    exceptionStatus: none,
    searching: false,
  });
  assert.equal(items.length, 1);
  assert.equal(items[0].qty, 7);
  assert.equal(items[0].weight, '8 Kg');
  assert.notEqual(items[0].weight, '107 Kg');
  assert.equal(items[0].status, 'packed');
});

test('详情按包装号把订单收在一起，不含包装壳', () => {
  const shell = row({ id: 'shell', barcode: 'RUI26MSE20001', weight: '134.6 Kg' });
  const line = row({ id: 'a', barcode: 'MSE1(2-1)', input: 'AAA' });
  const subject = expressDetailSubject(line, [shell, row({ id: 'b', barcode: 'MSE1(2-2)', input: 'BBB' })], new Map([['MSE1(2-1)', 'RUI26MSE20001']]));
  assert.equal(subject.packBarcode, 'RUI26MSE20001');
  assert.deepEqual(subject.lines.map((item) => item.id), ['a', 'b']);
});
