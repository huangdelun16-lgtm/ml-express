import { XPRINTER_P203A } from '../constants/xprinterP203a';
import {
  labelHeightDots,
  labelWidthDots,
  normalizeLabelContent,
  truncateLabelText,
  type NormalizedLabelContent,
} from '../utils/labelPrintLayout';
import type { LabelPrintPayload } from './printerService';

function escapeTsplText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
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
}): string {
  const content = normalizeLabelContent(params.barcode, params.extras);
  const widthMm = params.widthMm ?? XPRINTER_P203A.defaultWidthMm;
  const heightMm = params.heightMm ?? XPRINTER_P203A.defaultHeightMm;
  const gapMm = params.gapMm ?? XPRINTER_P203A.defaultGapMm;
  const copies = Math.max(1, params.copies ?? 1);
  const widthDots = labelWidthDots(widthMm);
  const heightDots = labelHeightDots(heightMm);

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
  if (content.inputBarcode) {
    lines.push(
      `TEXT 12,${y},"2",0,1,1,"${escapeTsplText(truncateLabelText(content.inputBarcode, 22))}"`,
    );
    y += 34;
  }

  const barcodeHeight = content.inputBarcode ? 72 : 88;
  lines.push(
    `BARCODE 12,${y},"128",${barcodeHeight},1,0,2,4,"${escapeTsplText(content.barcode)}"`,
  );
  y += barcodeHeight + 10;
  lines.push(`TEXT 12,${y},"2",0,1,1,"${escapeTsplText(truncateLabelText(content.barcode, 24))}"`);
  y += 30;

  for (const meta of buildMetaLines(content)) {
    lines.push(`TEXT 12,${y},"1",0,1,1,"${escapeTsplText(meta)}"`);
    y += 22;
  }

  const brandY = Math.min(heightDots - 24, Math.max(y + 4, heightDots - 28));
  lines.push(`TEXT 12,${brandY},"0",0,1,1,"MARKET LINK"`);
  lines.push(`PRINT ${copies}`);

  return `${lines.join('\r\n')}\r\n`;
}
