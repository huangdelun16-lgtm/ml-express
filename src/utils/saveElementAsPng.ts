import { toPng } from 'html-to-image';

/** 把整张单据拍成一张可放大的长图，不是 PDF。 */
export async function saveElementAsPng(node: HTMLElement, filename: string): Promise<void> {
  const width = Math.max(node.scrollWidth, node.offsetWidth);
  const height = Math.max(node.scrollHeight, node.offsetHeight);
  const dataUrl = await toPng(node, {
    pixelRatio: 3,
    cacheBust: true,
    backgroundColor: '#f7f3ea',
    width,
    height,
  });
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
