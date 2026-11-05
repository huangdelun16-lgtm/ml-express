import type { GoodsProduct } from '../services/goodsTradeService';

const NAVY = 'FF0B1220';
const INK = 'FF1C1917';
const GOLD = 'FFC6A15B';
const PAPER = 'FFF7F4EE';
const CREAM = 'FFFFF8EE';
const ALT = 'FFFBF8F3';
const LINE = 'FFE7E0D6';
const MUTED = 'FF78716C';

const BORDER = {
  top: { style: 'thin' as const, color: { argb: LINE } },
  left: { style: 'thin' as const, color: { argb: LINE } },
  bottom: { style: 'thin' as const, color: { argb: LINE } },
  right: { style: 'thin' as const, color: { argb: LINE } },
};

const PHONES = '09788848928  ·  09259369349  ·  09941118588';

function yangonStamp(): { display: string; file: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Yangon',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const pick = (type: string) => parts.find((part) => part.type === type)?.value || '';
  const year = pick('year');
  const month = pick('month');
  const day = pick('day');
  return { display: `${year}-${month}-${day}`, file: `${year}${month}${day}` };
}

async function urlToPngBase64(url: string): Promise<string | null> {
  const absolute = /^https?:/i.test(url) ? url : `${window.location.origin}${url.startsWith('/') ? url : `/${url}`}`;
  const response = await fetch(absolute);
  if (!response.ok) return null;
  const blob = await response.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('read'));
    reader.readAsDataURL(blob);
  });
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const side = 240;
        const canvas = document.createElement('canvas');
        canvas.width = side;
        canvas.height = side;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.fillStyle = '#F7F4EE';
        ctx.fillRect(0, 0, side, side);
        const w0 = img.naturalWidth || side;
        const h0 = img.naturalHeight || side;
        const scale = Math.min(side / w0, side / h0);
        const w = Math.round(w0 * scale);
        const h = Math.round(h0 * scale);
        ctx.drawImage(img, Math.round((side - w) / 2), Math.round((side - h) / 2), w, h);
        const out = canvas.toDataURL('image/png');
        resolve(out.replace(/^data:image\/png;base64,/, '') || null);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

function unitInMyanmar(unit: string): string {
  const labels: Record<string, string> = {
    个数: 'လုံး',
    件数: 'ခု',
    公斤: 'ကီလို',
    件: 'ခု',
  };
  const trimmed = unit.trim();
  return labels[trimmed] || trimmed || 'ခု';
}

function hasMyanmar(text: string): boolean {
  return /[\u1000-\u109F\uAA60-\uAA7F\uA9E0-\uA9FF]/.test(text);
}

function cellFont(text: string, size: number, bold: boolean, color: string) {
  return {
    name: hasMyanmar(text) ? 'Myanmar Text' : 'Calibri',
    size,
    bold,
    color: { argb: color },
  };
}

function priceAmount(amount: number): number | string {
  if (!(amount > 0)) return '—';
  return Math.round(amount);
}

function priceFormat(currency: GoodsProduct['price_currency']): string {
  return currency === 'RMB' ? '#,##0" CNY"' : '#,##0" MMK"';
}

export async function exportGoodsPriceList(products: GoodsProduct[]): Promise<void> {
  const rows = products.filter((row) => row.name.trim());
  if (rows.length === 0) throw new Error('还没有可导出的商品');

  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Market Link Express';
  const stamp = yangonStamp();
  const ws = wb.addWorksheet('ဈေးနှုန်း', {
    views: [{ state: 'frozen', ySplit: 5, showGridLines: false }],
    properties: { defaultRowHeight: 22, tabColor: { argb: GOLD } },
    pageSetup: {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      printTitlesRow: '1:5',
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.25 },
    },
  });
  ws.headerFooter.oddFooter = '&LMarket Link Express&CPrice List&R&P / &N';

  const cols = 9;
  const paint = (row: number, color: string, height: number) => {
    ws.mergeCells(row, 1, row, cols);
    const cell = ws.getCell(row, 1);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
    ws.getRow(row).height = height;
    return cell;
  };

  const title = paint(1, NAVY, 36);
  title.value = 'MARKET LINK EXPRESS';
  title.font = { name: 'Calibri', size: 20, bold: true, color: { argb: 'FFFFFFFF' } };
  title.alignment = { vertical: 'middle', horizontal: 'center' };

  const sub = paint(2, 'FF132033', 30);
  sub.value = 'ကုန်ပစ္စည်းဈေးနှုန်းစာရင်း';
  sub.font = { name: 'Myanmar Text', size: 16, bold: true, color: { argb: GOLD } };
  sub.alignment = { vertical: 'middle', horizontal: 'center' };

  const meta = paint(3, PAPER, 24);
  meta.value = `ရက်စွဲ  ${stamp.display}      ကုန်ပစ္စည်း ${rows.length} မျိုး`;
  meta.font = { name: 'Myanmar Text', size: 12, color: { argb: INK } };
  meta.alignment = { vertical: 'middle', horizontal: 'center' };

  paint(4, GOLD, 5);

  const headerRow = 5;
  const header = ws.getRow(headerRow);
  header.height = 34;
  ['စဉ်', 'ပုံ', 'ကုန်ပစ္စည်း', 'အမှတ်တံဆိပ်', 'အသေးစိတ်', 'ယူနစ်', 'လက်လီဈေး', 'လက်ကားဈေး', '၁ခုတွင်'].forEach((label, index) => {
    const cell = header.getCell(index + 1);
    cell.value = label;
    cell.font = {
      name: 'Myanmar Text',
      size: 12,
      bold: true,
      color: { argb: index === 6 || index === 7 ? GOLD : 'FFFFFFFF' },
    };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = BORDER;
  });

  const firstDataRow = headerRow + 1;
  for (let i = 0; i < rows.length; i += 1) {
    const item = rows[i];
    const excelRow = ws.getRow(firstDataRow + i);
    excelRow.height = item.image_url ? 74 : 30;
    const alt = i % 2 === 1;
    const hasPack = item.pieces_per_pack > 0 && item.wholesale_mmk > 0;
    const retail = priceAmount(item.price_mmk);
    const wholesale = hasPack ? priceAmount(item.wholesale_mmk) : '—';
    const values: Array<string | number> = [
      i + 1,
      '',
      item.name.trim(),
      item.brand.trim() || '—',
      item.spec.trim() || '—',
      unitInMyanmar(item.unit),
      retail,
      wholesale,
      hasPack ? item.pieces_per_pack : '—',
    ];
    values.forEach((value, index) => {
      const priceCol = index === 6 || index === 7;
      const text = typeof value === 'number' ? '' : String(value);
      const cell = excelRow.getCell(index + 1);
      cell.value = value;
      cell.font = priceCol
        ? { name: 'Calibri', size: 13, bold: true, color: { argb: 'FF9A3412' } }
        : cellFont(text, index === 2 ? 13 : 12, index === 2, INK);
      cell.alignment = {
        vertical: 'middle',
        horizontal: index === 0 || index === 1 || index === 5 || index === 8 ? 'center' : priceCol ? 'right' : 'left',
        wrapText: index === 2 || index === 3 || index === 4,
        indent: index === 2 || index === 3 || index === 4 ? 1 : 0,
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: priceCol ? CREAM : alt ? ALT : 'FFFFFFFF' },
      };
      cell.border = BORDER;
      if (index === 6 && typeof value === 'number') cell.numFmt = priceFormat(item.price_currency);
      if (index === 7 && typeof value === 'number') cell.numFmt = priceFormat(item.wholesale_currency);
    });

    if (item.image_url) {
      try {
        const base64 = await urlToPngBase64(item.image_url);
        if (base64) {
          const imageId = wb.addImage({ base64, extension: 'png' });
          ws.addImage(imageId, {
            tl: { col: 1.2, row: headerRow + i + 0.18 },
            ext: { width: 54, height: 54 },
            editAs: 'oneCell',
          });
        }
      } catch {
        excelRow.getCell(2).value = '';
      }
    }
  }

  const foot = firstDataRow + rows.length + 1;
  ws.mergeCells(foot, 1, foot, cols);
  const note = ws.getCell(foot, 1);
  note.value = 'လက်လီဈေးသည် တစ်လုံးဈေး ဖြစ်သည်။ လက်ကားဈေးသည် တစ်ခုဈေး ဖြစ်သည်။ ၁ ခုတွင် ပါဝင်သော လုံးအရေအတွက်ကို ဇယားတွင် ဖော်ပြထားသည်။ ဈေးနှုန်း ပြောင်းလဲနိုင်ပါသည်။';
  note.font = { name: 'Myanmar Text', size: 11, italic: true, color: { argb: MUTED } };
  note.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  ws.getRow(foot).height = 36;

  ws.mergeCells(foot + 1, 1, foot + 1, cols);
  const phone = ws.getCell(foot + 1, 1);
  phone.value = `ဆက်သွယ်ရန်  ${PHONES}`;
  phone.font = { name: 'Myanmar Text', size: 12, bold: true, color: { argb: NAVY } };
  phone.alignment = { vertical: 'middle', horizontal: 'left' };
  ws.getRow(foot + 1).height = 22;

  ws.columns = [
    { width: 7 },
    { width: 14 },
    { width: 28 },
    { width: 18 },
    { width: 24 },
    { width: 12 },
    { width: 18 },
    { width: 18 },
    { width: 12 },
  ];
  ws.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: headerRow + rows.length, column: cols } };

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `MarketLink_PriceList_${stamp.file}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
