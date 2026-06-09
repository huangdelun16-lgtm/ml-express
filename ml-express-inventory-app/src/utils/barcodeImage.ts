/** Code128 条码图（打印 / 预览用，需联网加载图片） */
export function getBarcodeImageUrl(
  code: string,
  opts?: { scale?: number; height?: number; includeText?: boolean },
): string {
  const scale = opts?.scale ?? 3;
  const height = opts?.height ?? 12;
  const text = opts?.includeText !== false ? '&includetext' : '';
  return `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(code)}&scale=${scale}&height=${height}${text}`;
}
