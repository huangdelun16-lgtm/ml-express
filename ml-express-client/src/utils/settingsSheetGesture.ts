export function clamp01(n: number): number {
  if (n <= 0) return 0;
  if (n >= 1) return 1;
  return n;
}

export function overlayOpacityFromDrag(dy: number, slide: number): number {
  const dist = slide > 0 ? slide : 1;
  return 1 - clamp01(dy / dist);
}

export function shouldClaimSettingsSheetPan(dx: number, dy: number, capture = false): boolean {
  const threshold = capture ? 12 : 8;
  return dy > threshold && dy > Math.abs(dx) * 1.1;
}

export function shouldCloseSettingsSheet(dy: number, vy: number): boolean {
  return dy > 72 || vy > 0.55;
}
