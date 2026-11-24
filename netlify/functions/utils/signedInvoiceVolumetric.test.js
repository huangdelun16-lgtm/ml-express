const test = require('node:test');
const assert = require('node:assert/strict');
const { appendVolumetricMeasure, applyVolumetricLines } = require('./signedInvoiceVolumetric');

test('old signed invoice gains a volumetric line and keeps the locked fee', () => {
  const document = {
    lines: [{ title: '单号', expressNos: ['E1'], measure: '重量 0.8 Kg · 定价 ¥40/Kg' }],
    totals: ['总重量 0.8 Kg', '总费用 32,000 MMK'],
    totalFeeCny: 32,
    totalFeeMmk: 32000,
  };
  const next = applyVolumetricLines(
    document,
    [{ input_barcode: 'E1', barcode: 'MDY1', spec: '30 x 20 x 15 cm', weight: '0.8 Kg', packed_bundle_barcode: '' }],
    new Map(),
  );
  assert.equal(next.lines[0].measure, '重量 0.8 Kg · 定价 ¥40/Kg · 体积重量 1.5 Kg');
  assert.equal(next.totalFeeCny, 32);
  assert.equal(next.totalFeeMmk, 32000);
  assert.deepEqual(next.totals, document.totals);
  assert.equal(document.lines[0].measure, '重量 0.8 Kg · 定价 ¥40/Kg');
});

test('package spec is used once and an existing volumetric line is left alone', () => {
  const shells = new Map([
    ['RUI26MDY20001', { spec: '40 x 30 x 20 cm', weight: '1 Kg' }],
  ]);
  const withLine = applyVolumetricLines(
    { lines: [{ expressNos: ['P1', 'P2'], measure: '包裹总重 1 Kg · 定价 ¥40/Kg' }] },
    [
      { input_barcode: 'P1', weight: '', spec: '', packed_bundle_barcode: 'RUI26MDY20001' },
      { input_barcode: 'P2', weight: '', spec: '', packed_bundle_barcode: 'RUI26MDY20001' },
    ],
    shells,
  );
  assert.equal(withLine.lines[0].measure, '包裹总重 1 Kg · 定价 ¥40/Kg · 体积重量 4 Kg');
  assert.equal(
    appendVolumetricMeasure('重量 1 Kg · 体积重量 4 Kg', '40 x 30 x 20 cm', 1),
    '重量 1 Kg · 体积重量 4 Kg',
  );
});
