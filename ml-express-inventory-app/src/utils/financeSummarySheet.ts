export function clamp01(n: number): number {
  if (n <= 0) return 0;
  if (n >= 1) return 1;
  return n;
}

export function progressFromDrag(startProgress: number, dy: number, dragDistance: number): number {
  const dist = dragDistance > 0 ? dragDistance : 1;
  return clamp01(startProgress + dy / dist);
}

export function shouldClaimFinanceSummaryPan(input: {
  open: boolean;
  dx: number;
  dy: number;
  capture?: boolean;
}): boolean {
  const threshold = input.capture ? 12 : 8;
  const vertical = Math.abs(input.dy) > threshold && Math.abs(input.dy) > Math.abs(input.dx) * 1.1;
  if (!vertical) return false;
  if (input.open) return input.dy < -threshold;
  return input.dy > threshold;
}

export function resolveFinanceSummarySnap(input: {
  startProgress: number;
  dy: number;
  vy: number;
}): 'tap' | 'open' | 'close' {
  if (Math.abs(input.dy) < 10 && Math.abs(input.vy) < 0.18) return 'tap';
  if (input.vy > 0.32) return 'open';
  if (input.vy < -0.28) return 'close';
  if (input.startProgress >= 0.6 && input.dy <= -36) return 'close';
  if (input.startProgress <= 0.4 && input.dy >= 36) return 'open';
  const projected = input.startProgress + input.dy / 180;
  return projected > 0.5 ? 'open' : 'close';
}
