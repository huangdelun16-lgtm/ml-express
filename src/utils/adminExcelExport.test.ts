import { buildAdminExcelWorkbook } from './adminExcelExport';

describe('buildAdminExcelWorkbook', () => {
  it('writes a titled sheet with numeric cells', async () => {
    const wb = await buildAdminExcelWorkbook([
      {
        name: '客户',
        title: 'MARKET LINK · 客户',
        subtitle: '测试',
        columns: [
          { header: '姓名', width: 16 },
          { header: '余额', width: 12, align: 'right' },
        ],
        rows: [
          ['Aung', 1200],
          ['Ei Ei', 37.6],
        ],
      },
    ]);
    const sheet = wb.getWorksheet('客户');
    expect(sheet?.getCell(1, 1).value).toBe('MARKET LINK · 客户');
    expect(sheet?.getCell(3, 1).value).toBe('姓名');
    expect(sheet?.getCell(4, 2).value).toBe(1200);
    expect(sheet?.getCell(5, 2).value).toBe(37.6);
  });
});
