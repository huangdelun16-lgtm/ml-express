import { uint8ToBase64, utf8Bytes, zipStore } from './zipStore';

export type InventoryExcelCell = string | number | boolean | Date | null | undefined;

export type InventoryExcelColumn = {
  header: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  numFmt?: string;
};

export type InventoryExcelSheetInput = {
  name: string;
  title?: string;
  subtitle?: string;
  columns: InventoryExcelColumn[];
  rows: InventoryExcelCell[][];
  rowFills?: Array<string | undefined>;
};

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function colLetter(index: number): string {
  let n = index;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function cellRef(col: number, row: number): string {
  return `${colLetter(col)}${row}`;
}

function normalizeArgb(argb: string): string {
  const hex = argb.replace(/^#/, '').toUpperCase();
  if (hex.length === 8) return hex;
  if (hex.length === 6) return `FF${hex}`;
  return 'FFFFFFFF';
}

function sheetName(raw: string): string {
  return raw.replace(/[\\/*?[\]:]/g, ' ').slice(0, 31) || 'Sheet';
}

function cellXml(value: InventoryExcelCell, ref: string, style: number): string {
  const s = ` r="${ref}" s="${style}"`;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c${s} t="n"><v>${value}</v></c>`;
  }
  if (typeof value === 'boolean') {
    return `<c${s} t="b"><v>${value ? 1 : 0}</v></c>`;
  }
  const text = value == null ? '' : value instanceof Date ? value.toISOString() : String(value);
  return `<c${s} t="inlineStr"><is><t xml:space="preserve">${xmlEscape(text)}</t></is></c>`;
}

function xf(font: number, fill: number, border: number, align: 'left' | 'center' | 'right'): string {
  return `<xf fontId="${font}" fillId="${fill}" borderId="${border}" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="${align}" vertical="center" wrapText="1"/></xf>`;
}

function fillXml(argb: string): string {
  return `<fill><patternFill patternType="solid"><fgColor rgb="${normalizeArgb(argb)}"/><bgColor rgb="${normalizeArgb(argb)}"/></patternFill></fill>`;
}

type StyleBook = {
  xfTitle: number;
  xfSubtitle: number;
  xfHeader: number;
  data: Record<'left' | 'center' | 'right', number>;
  alt: Record<'left' | 'center' | 'right', number>;
  custom: Map<string, Record<'left' | 'center' | 'right', number>>;
  stylesXml: string;
};

function buildStyles(customFills: string[]): StyleBook {
  const fills = ['FFFFFFFF', 'FFF1F5F9', 'FF0F172A', 'FFF8FAFC', 'FF0F766E', ...customFills.map(normalizeArgb)];
  const uniqueFills = [...new Set(fills)];
  const fillIndex = (argb: string) => uniqueFills.indexOf(normalizeArgb(argb)) + 2;

  const fillXmls = uniqueFills.map(fillXml).join('');
  const xfs: string[] = [
    xf(0, 0, 0, 'left'),
    xf(1, fillIndex('FF0F172A'), 1, 'left'),
    xf(2, fillIndex('FFF8FAFC'), 0, 'left'),
    xf(3, fillIndex('FF0F766E'), 1, 'center'),
  ];
  const data: Record<'left' | 'center' | 'right', number> = { left: 0, center: 0, right: 0 };
  const alt: Record<'left' | 'center' | 'right', number> = { left: 0, center: 0, right: 0 };
  (['left', 'center', 'right'] as const).forEach((align) => {
    data[align] = xfs.length;
    xfs.push(xf(0, fillIndex('FFFFFFFF'), 1, align));
    alt[align] = xfs.length;
    xfs.push(xf(0, fillIndex('FFF1F5F9'), 1, align));
  });
  const custom = new Map<string, Record<'left' | 'center' | 'right', number>>();
  for (const fill of customFills) {
    const key = normalizeArgb(fill);
    if (custom.has(key)) continue;
    const map: Record<'left' | 'center' | 'right', number> = { left: 0, center: 0, right: 0 };
    (['left', 'center', 'right'] as const).forEach((align) => {
      map[align] = xfs.length;
      xfs.push(xf(0, fillIndex(key), 1, align));
    });
    custom.set(key, map);
  }

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="4">
    <font><sz val="11"/><color rgb="FF0F172A"/><name val="Calibri"/></font>
    <font><b/><sz val="16"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><sz val="10"/><color rgb="FF64748B"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
  </fonts>
  <fills count="${uniqueFills.length + 2}">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    ${fillXmls}
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FF94A3B8"/></left>
      <right style="thin"><color rgb="FF94A3B8"/></right>
      <top style="thin"><color rgb="FF94A3B8"/></top>
      <bottom style="thin"><color rgb="FF94A3B8"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1"><xf fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs>
</styleSheet>`;

  return {
    xfTitle: 1,
    xfSubtitle: 2,
    xfHeader: 3,
    data,
    alt,
    custom,
    stylesXml,
  };
}

function worksheetXml(spec: InventoryExcelSheetInput, book: StyleBook): string {
  const colCount = Math.max(1, spec.columns.length);
  const lastCol = colLetter(colCount);
  const headerRow = (spec.title ? 1 : 0) + (spec.subtitle ? 1 : 0) + 1;
  const totalRows = headerRow + spec.rows.length;
  const freeze = headerRow;

  const cols = spec.columns
    .map((col, index) => {
      const width = col.width ?? Math.min(36, Math.max(12, col.header.length + 4));
      return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`;
    })
    .join('');

  const rows: string[] = [];
  if (spec.title) {
    rows.push(
      `<row r="1" ht="22" customHeight="1">${cellXml(spec.title, 'A1', book.xfTitle)}</row>`,
    );
  }
  if (spec.subtitle) {
    const r = spec.title ? 2 : 1;
    rows.push(
      `<row r="${r}" ht="18" customHeight="1">${cellXml(spec.subtitle, `A${r}`, book.xfSubtitle)}</row>`,
    );
  }
  rows.push(
    `<row r="${headerRow}" ht="20" customHeight="1">${spec.columns
      .map((col, index) => cellXml(col.header, cellRef(index + 1, headerRow), book.xfHeader))
      .join('')}</row>`,
  );

  spec.rows.forEach((row, rowIndex) => {
    const r = headerRow + 1 + rowIndex;
    const tint = spec.rowFills?.[rowIndex];
    const alignSet = tint
      ? book.custom.get(normalizeArgb(tint)) || book.data
      : rowIndex % 2 === 1
        ? book.alt
        : book.data;
    const cells = spec.columns
      .map((col, colIndex) => {
        const align = col.align ?? (typeof row[colIndex] === 'number' ? 'right' : 'left');
        return cellXml(row[colIndex], cellRef(colIndex + 1, r), alignSet[align]);
      })
      .join('');
    rows.push(`<row r="${r}" ht="18" customHeight="1">${cells}</row>`);
  });

  const merges: string[] = [];
  if (spec.title) merges.push(`<mergeCell ref="A1:${lastCol}1"/>`);
  if (spec.subtitle) {
    const r = spec.title ? 2 : 1;
    merges.push(`<mergeCell ref="A${r}:${lastCol}${r}"/>`);
  }

  const autoFilter =
    spec.rows.length > 0
      ? `<autoFilter ref="A${headerRow}:${lastCol}${totalRows}"/>`
      : '';

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetViews>
    <sheetView workbookViewId="0" showGridLines="0">
      <pane ySplit="${freeze}" topLeftCell="A${freeze + 1}" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="16"/>
  <cols>${cols}</cols>
  <sheetData>${rows.join('')}</sheetData>
  ${merges.length ? `<mergeCells count="${merges.length}">${merges.join('')}</mergeCells>` : ''}
  ${autoFilter}
  <pageSetup orientation="${colCount > 6 ? 'landscape' : 'portrait'}" fitToPage="1" fitToWidth="1" fitToHeight="0"/>
</worksheet>`;
}

/** 真正的 xlsx（ZIP+OOXML），iOS / Excel / WPS 都能打开 */
export function buildInventoryExcelXlsx(sheets: InventoryExcelSheetInput[]): Uint8Array {
  const list = sheets.length
    ? sheets
    : [{ name: 'Sheet', columns: [{ header: '—', width: 12 }], rows: [] }];
  const customFills = [
    ...new Set(list.flatMap((sheet) => (sheet.rowFills ?? []).filter((fill): fill is string => Boolean(fill)))),
  ];
  const book = buildStyles(customFills);

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    ${list
      .map(
        (sheet, index) =>
          `<sheet name="${xmlEscape(sheetName(sheet.name))}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
      )
      .join('')}
  </sheets>
</workbook>`;

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  ${list
    .map(
      (_, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
    )
    .join('')}
</Relationships>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${list
    .map(
      (_, index) =>
        `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    )
    .join('')}
</Types>`;

  const files = [
    { name: '[Content_Types].xml', data: utf8Bytes(contentTypes) },
    { name: '_rels/.rels', data: utf8Bytes(rootRels) },
    { name: 'xl/workbook.xml', data: utf8Bytes(workbookXml) },
    { name: 'xl/_rels/workbook.xml.rels', data: utf8Bytes(workbookRels) },
    { name: 'xl/styles.xml', data: utf8Bytes(book.stylesXml) },
    ...list.map((sheet, index) => ({
      name: `xl/worksheets/sheet${index + 1}.xml`,
      data: utf8Bytes(worksheetXml(sheet, book)),
    })),
  ];
  return zipStore(files);
}

export function buildInventoryExcelXlsxBase64(sheets: InventoryExcelSheetInput[]): string {
  return uint8ToBase64(buildInventoryExcelXlsx(sheets));
}
