import { describe, expect, it } from 'vitest';
import { crc32, uint8ToBase64, utf8Bytes, zipStore } from './zipStore';
import { buildInventoryExcelXlsx } from './inventoryExcelExport';

describe('zipStore', () => {
  it('writes PK zip that contains uncompressed file bytes', () => {
    const packed = zipStore([{ name: 'hello.txt', data: utf8Bytes('hello') }]);
    expect(String.fromCharCode(packed[0], packed[1])).toBe('PK');
    expect(new TextDecoder().decode(packed)).toContain('hello');
    expect(crc32(utf8Bytes('hello'))).toBe(0x3610a686);
  });

  it('base64 is stack-safe and round-trips', () => {
    const bytes = Uint8Array.from([0, 1, 2, 254, 255]);
    const b64 = uint8ToBase64(bytes);
    expect(Buffer.from(b64, 'base64').equals(Buffer.from(bytes))).toBe(true);
  });
});

describe('buildInventoryExcelXlsx', () => {
  it('is a zip with workbook and styles', () => {
    const bytes = buildInventoryExcelXlsx([
      {
        name: '汇总',
        title: 'MARKET LINK',
        columns: [{ header: '项目', width: 12 }, { header: '数值', width: 10, align: 'right' }],
        rows: [['结余', 1425]],
      },
    ]);
    const text = new TextDecoder().decode(bytes);
    expect(text.startsWith('PK')).toBe(true);
    expect(text).toContain('xl/workbook.xml');
    expect(text).toContain('MARKET LINK');
    expect(text).toContain('<v>1425</v>');
  });
});
