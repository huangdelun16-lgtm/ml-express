import { writeFileSync } from 'node:fs';
import { getCode128ModuleRuns } from '../src/utils/barcodeImage';
import {
  fitAndCenterLabelLayout,
  getElementDimensions,
  getLabelGroupBounds,
  labelHeightDots,
  labelWidthDots,
  type LabelBarcodeLayoutConfig,
} from '../src/constants/labelBarcodeLayout';
import { PRINT_PREVIEW_SAMPLE } from '../src/constants/printPreviewSample';

const content = {
  expressNo: PRINT_PREVIEW_SAMPLE.inputBarcode,
  barcode: PRINT_PREVIEW_SAMPLE.barcode,
  inboundCode: PRINT_PREVIEW_SAMPLE.barcode,
};

function emptyLayout(): LabelBarcodeLayoutConfig {
  return {
    version: 1,
    expressNo: { x: 0, y: 0 },
    barcode: { x: 0, y: 0, height: 96 },
    inboundCode: { x: 0, y: 0 },
  };
}

function barcodeRects(code: string, x: number, y: number, width: number, height: number): string {
  const runs = getCode128ModuleRuns(code);
  const total = runs.reduce((sum, run) => sum + run.modules, 0);
  const moduleW = width / total;
  let cursor = x;
  const rects: string[] = [];
  for (const run of runs) {
    const w = run.modules * moduleW;
    if (run.black) {
      rects.push(
        `<rect x="${cursor.toFixed(2)}" y="${y}" width="${w.toFixed(2)}" height="${height}" fill="#0f172a"/>`,
      );
    }
    cursor += w;
  }
  return rects.join('');
}

function renderLabel(widthMm: number, heightMm: number, title: string): { svg: string; info: string } {
  const layout = fitAndCenterLabelLayout(emptyLayout(), content, widthMm, heightMm);
  const scale = 8;
  const w = widthMm * scale;
  const h = heightMm * scale;
  const toPx = (dots: number) => (dots / labelWidthDots(widthMm)) * w;
  const expressH = getElementDimensions(layout, 'expressNo', content, widthMm).heightDots;
  const inboundH = getElementDimensions(layout, 'inboundCode', content, widthMm).heightDots;
  const barcodeW = getElementDimensions(layout, 'barcode', content, widthMm).widthDots;
  const bounds = getLabelGroupBounds(layout, content, widthMm);
  const cx = w / 2;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${w + 8}" height="${h + 8}" viewBox="0 0 ${w + 8} ${h + 8}">
      <rect width="100%" height="100%" fill="#e2e8f0"/>
      <g transform="translate(4,4)">
        <rect width="${w}" height="${h}" rx="10" fill="#fff" stroke="#334155" stroke-width="3"/>
        ${[10, 20, 30, 40, 50].filter((mm) => mm < widthMm).map((mm) => {
          const x = (mm / widthMm) * w;
          return `<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="#cbd5e1" stroke-width="1"/>`;
        }).join('')}
        ${[10, 20, 30].filter((mm) => mm < heightMm).map((mm) => {
          const y = (mm / heightMm) * h;
          return `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="#cbd5e1" stroke-width="1"/>`;
        }).join('')}
        <text x="${cx}" y="${toPx(layout.expressNo.y) + toPx(expressH) - 4}" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="${Math.max(11, toPx(expressH) * 0.72)}" font-weight="800" fill="#0f172a">${content.expressNo}</text>
        ${barcodeRects(content.barcode, toPx(layout.barcode.x), toPx(layout.barcode.y), toPx(barcodeW), toPx(layout.barcode.height))}
        <text x="${cx}" y="${toPx(layout.inboundCode.y) + toPx(inboundH) * 0.78}" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="${Math.max(10, toPx(inboundH) * 0.62)}" font-weight="800" fill="#0f172a">${content.barcode}</text>
        <rect x="${toPx(bounds.x)}" y="${toPx(bounds.y)}" width="${toPx(bounds.widthDots)}" height="${toPx(bounds.heightDots)}" fill="none" stroke="#2563eb" stroke-width="2" stroke-dasharray="6 4" rx="4"/>
        <rect x="${toPx(bounds.x)}" y="${Math.max(0, toPx(bounds.y) - 16)}" width="72" height="16" rx="3" fill="#2563eb"/>
        <text x="${toPx(bounds.x) + 8}" y="${Math.max(12, toPx(bounds.y) - 4)}" font-family="PingFang SC, sans-serif" font-size="11" font-weight="800" fill="#fff">标签内容</text>
      </g>
    </svg>
  `;

  const info = [
    title,
    `paper ${widthMm}x${heightMm}mm`,
    `barcode x=${layout.barcode.x} y=${layout.barcode.y} w=${barcodeW} h=${layout.barcode.height}`,
    `group ${bounds.widthDots}x${bounds.heightDots} @ ${bounds.x},${bounds.y}`,
  ].join(' | ');

  return { svg, info };
}

const wide = renderLabel(58, 40, '58×40');
const compact = renderLabel(40, 20, '40×20');

const combined = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720">
  <rect width="1200" height="720" fill="#020617"/>
  <text x="60" y="58" font-family="PingFang SC, sans-serif" font-size="28" font-weight="800" fill="#f8fafc">打印预览草稿 · 纸条规格自动合并居中</text>
  <text x="60" y="92" font-family="PingFang SC, sans-serif" font-size="16" fill="#94a3b8">快递单 ${content.expressNo}  ·  入库码 ${content.barcode}  ·  蓝色虚线 = 标签内容组合</text>

  <rect x="48" y="128" width="1104" height="520" rx="24" fill="#cbd5e1"/>
  <text x="90" y="172" font-family="PingFang SC, sans-serif" font-size="18" font-weight="800" fill="#0f172a">58×40 mm</text>
  <text x="680" y="172" font-family="PingFang SC, sans-serif" font-size="18" font-weight="800" fill="#0f172a">40×20 mm</text>
  <g transform="translate(90,196)">${wide.svg.replace(/<\?xml[^>]*>/, '').replace('<svg', '<svg').replace(/width="[^"]+" height="[^"]+" viewBox="[^"]+"/, 'width="464" height="320" viewBox="0 0 472 328"')}</g>
  <g transform="translate(680,250)">${compact.svg.replace(/<\?xml[^>]*>/, '').replace(/width="[^"]+" height="[^"]+" viewBox="[^"]+"/, 'width="320" height="160" viewBox="0 0 328 168"')}</g>
  <text x="90" y="620" font-family="PingFang SC, sans-serif" font-size="14" fill="#334155">${wide.info}</text>
  <text x="680" y="620" font-family="PingFang SC, sans-serif" font-size="14" fill="#334155">${compact.info}</text>
</svg>
`;

const desktop = '/Users/aungmyatthu/Desktop';
writeFileSync(`${desktop}/label-preview-58x40.svg`, wide.svg);
writeFileSync(`${desktop}/label-preview-40x20.svg`, compact.svg);
writeFileSync(`${desktop}/打印预览-纸条规格居中草稿.svg`, combined);
console.log(wide.info);
console.log(compact.info);
console.log('wrote Desktop SVGs');
