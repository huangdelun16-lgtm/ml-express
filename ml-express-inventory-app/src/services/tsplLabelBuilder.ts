import { XPRINTER_P203A, type PrintLabelSheetKind } from '../constants/xprinterP203a';
import {
  DEFAULT_LABEL_BARCODE_LAYOUT,
  getBarcodePrintMetrics,
  getElementDimensions,
  getTextPrintMul,
  type LabelBarcodeLayoutConfig,
} from '../constants/labelBarcodeLayout';
import {
  normalizeLabelContent,
  truncateLabelText,
  type LabelPrintPayload,
  type NormalizedLabelContent,
} from '../utils/labelPrintLayout';

function escapeTsplText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function tsplTextLine(
  x: number,
  y: number,
  widthDots: number,
  heightDots: number,
  text: string,
): string {
  const { xMul, yMul } = getTextPrintMul(widthDots, heightDots, text);
  return `TEXT ${x},${y},"2",0,${xMul},${yMul},"${escapeTsplText(truncateLabelText(text, 24))}"`;
}

function buildMetaLines(content: NormalizedLabelContent): string[] {
  const lines: string[] = [];
  if (content.destination) {
    lines.push(truncateLabelText(`→ ${content.destination}`, 18));
  }
  if (content.customerName) {
    lines.push(truncateLabelText(content.customerName, 16));
  }
  if (content.productName) {
    lines.push(truncateLabelText(content.productName, 20));
  }
  return lines.slice(0, 2);
}

/** 生成 Xprinter P203A TSPL 标签指令（间隙纸） */
export function buildTsplInboundLabel(params: {
  barcode: string;
  extras?: Partial<LabelPrintPayload>;
  widthMm?: number;
  heightMm?: number;
  gapMm?: number;
  copies?: number;
  sheetKind?: PrintLabelSheetKind;
  layout?: LabelBarcodeLayoutConfig;
}): string {
  const sheetKind = params.sheetKind ?? 'barcode';
  const content = normalizeLabelContent(params.barcode, params.extras);
  const widthMm = params.widthMm ?? XPRINTER_P203A.defaultWidthMm;
  const heightMm = params.heightMm ?? XPRINTER_P203A.defaultHeightMm;
  const gapMm = params.gapMm ?? XPRINTER_P203A.defaultGapMm;
  const copies = Math.max(1, params.copies ?? 1);
  const layout = params.layout ?? DEFAULT_LABEL_BARCODE_LAYOUT;

  const lines: string[] = [
    `SIZE ${widthMm} mm, ${heightMm} mm`,
    `GAP ${gapMm} mm, 0 mm`,
    'DIRECTION 1',
    'REFERENCE 0,0',
    'OFFSET 0 mm',
    'SET PEEL OFF',
    'SET CUTTER OFF',
    'SET PARTIAL_CUTTER OFF',
    'SET TEAR ON',
    'CLS',
  ];

  let y = 8;
  const printCode =
    sheetKind === 'express'
      ? (content.inputBarcode || content.barcode).trim()
      : content.barcode.trim();

  if (sheetKind === 'barcode') {
    const layoutContent = {
      expressNo: content.inputBarcode?.trim() ?? '',
      barcode: printCode,
      inboundCode: printCode,
    };
    const expressDims = getElementDimensions(layout, 'expressNo', layoutContent, widthMm);
    const inboundDims = getElementDimensions(layout, 'inboundCode', layoutContent, widthMm);

    if (content.inputBarcode?.trim()) {
      lines.push(
        tsplTextLine(
          layout.expressNo.x,
          layout.expressNo.y,
          expressDims.widthDots,
          expressDims.heightDots,
          content.inputBarcode.trim(),
        ),
      );
    }
    const barcodeMetrics = getBarcodePrintMetrics(layout, layoutContent, widthMm);
    lines.push(
      `BARCODE ${layout.barcode.x},${layout.barcode.y},"128",${barcodeMetrics.height},0,0,${barcodeMetrics.narrow},${barcodeMetrics.wide},"${escapeTsplText(printCode)}"`,
    );
    lines.push(
      tsplTextLine(
        layout.inboundCode.x,
        layout.inboundCode.y,
        inboundDims.widthDots,
        inboundDims.heightDots,
        printCode,
      ),
    );
    lines.push(`PRINT ${copies}`);
    return `${lines.join('\r\n')}\r\n`;
  }

  if (sheetKind === 'express' || sheetKind === 'pack' || sheetKind === 'inbound') {
    const heading =
      sheetKind === 'express' ? 'Express' : sheetKind === 'pack' ? 'PKG' : 'Inbound';
    lines.push(`TEXT 12,${y},"2",0,1,1,"${escapeTsplText(heading)}"`);
    y += 28;
  }

  if (sheetKind === 'express' && content.destination) {
    lines.push(
      `TEXT 12,${y},"1",0,1,1,"${escapeTsplText(truncateLabelText(`→ ${content.destination}`, 18))}"`,
    );
    y += 22;
  }

  if (sheetKind === 'pack' || sheetKind === 'inbound') {
    for (const meta of buildMetaLines(content)) {
      lines.push(`TEXT 12,${y},"1",0,1,1,"${escapeTsplText(meta)}"`);
      y += 22;
    }
  }

  const barcodeHeight = 80;
  lines.push(
    `BARCODE 12,${y},"128",${barcodeHeight},0,0,3,6,"${escapeTsplText(printCode)}"`,
  );
  y += barcodeHeight + 10;
  lines.push(tsplTextLine(12, y, 12 * printCode.length, 24, printCode));
  lines.push(`PRINT ${copies}`);

  return `${lines.join('\r\n')}\r\n`;
}
