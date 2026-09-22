export const TAB_SWIPE_CLAIM_DX = 10;
export const TAB_SWIPE_CLAIM_RATIO = 1.25;
export const TAB_SWIPE_EDGE = 36;
export const TAB_SWIPE_DISTANCE_RATIO = 0.18;
export const TAB_SWIPE_MIN_DISTANCE = 56;
export const TAB_SWIPE_COMMIT_DX = 48;
export const TAB_SWIPE_COMMIT_RATIO = 2;
export const TAB_SWIPE_FLICK_VELOCITY = 0.55;
export const TAB_SWIPE_RUBBER = 0.32;

export function clampIndex(n: number, count: number): number {
  if (count <= 0) return 0;
  if (n < 0) return 0;
  if (n > count - 1) return count - 1;
  return n;
}

export function shouldClaimTabSwipe(dx: number, dy: number): boolean {
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);
  return adx >= TAB_SWIPE_CLAIM_DX && adx > ady * TAB_SWIPE_CLAIM_RATIO;
}

export function isTabSwipeEdgeStart(x0: number, width: number, edge = TAB_SWIPE_EDGE): boolean {
  if (width <= 0) return false;
  return x0 <= edge || x0 >= width - edge;
}

export function shouldCaptureCommittedTabSwipe(dx: number, dy: number): boolean {
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);
  return adx >= TAB_SWIPE_COMMIT_DX && adx > ady * TAB_SWIPE_COMMIT_RATIO;
}

export const TAB_SWIPE_EDGE_ONLY_ROUTES = ['PlaceOrder', 'TrackOrder', 'CityMall'] as const;

export function isEdgeOnlyTabSwipeRoute(
  routeName: string,
  names: readonly string[] = TAB_SWIPE_EDGE_ONLY_ROUTES,
): boolean {
  return names.includes(routeName);
}

export function shouldCaptureTabSwipeOnRoute(
  routeName: string,
  x0: number,
  width: number,
  dx: number,
  dy: number,
): boolean {
  if (!shouldClaimTabSwipe(dx, dy)) return false;
  if (isEdgeOnlyTabSwipeRoute(routeName)) return isTabSwipeEdgeStart(x0, width);
  return isTabSwipeEdgeStart(x0, width) || shouldCaptureCommittedTabSwipe(dx, dy);
}

export function rubberbandDx(
  dx: number,
  startIndex: number,
  count: number,
  rubber = TAB_SWIPE_RUBBER,
): number {
  if (dx > 0 && startIndex <= 0) return dx * rubber;
  if (dx < 0 && startIndex >= count - 1) return dx * rubber;
  return dx;
}

export function tabSwipeTranslateX(
  startIndex: number,
  dx: number,
  width: number,
  count: number,
): number {
  return -startIndex * width + rubberbandDx(dx, startIndex, count);
}

export function resolveTabSwipeIndex(options: {
  startIndex: number;
  dx: number;
  vx: number;
  width: number;
  count: number;
}): number {
  const { startIndex, dx, vx, width, count } = options;
  const gate = Math.max(TAB_SWIPE_MIN_DISTANCE, width * TAB_SWIPE_DISTANCE_RATIO);
  let next = startIndex;
  if (dx <= -gate || vx <= -TAB_SWIPE_FLICK_VELOCITY) next = startIndex + 1;
  else if (dx >= gate || vx >= TAB_SWIPE_FLICK_VELOCITY) next = startIndex - 1;
  return clampIndex(next, count);
}
