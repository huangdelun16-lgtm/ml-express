/** 距过期不足此时长则主动 refresh，避免写操作带上即将失效的 JWT */
export const INVENTORY_JWT_REFRESH_SKEW_MS = 120_000;

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error ?? '');
}

function decodeBase64Url(input: string): string {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  if (typeof globalThis.atob === 'function') return globalThis.atob(padded);
  return Buffer.from(padded, 'base64').toString('utf8');
}

export function decodeJwtPayload(accessToken: string): Record<string, unknown> | null {
  const parts = accessToken.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(decodeBase64Url(parts[1])) as unknown;
    return payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** RLS 读的是 JWT 声明，不是 JS user 对象上的 app_metadata */
export function inventoryAccessTokenHasRequiredClaims(accessToken: string): boolean {
  const payload = decodeJwtPayload(accessToken);
  if (!payload) return false;
  const meta =
    payload.app_metadata && typeof payload.app_metadata === 'object'
      ? (payload.app_metadata as Record<string, unknown>)
      : payload;
  return Boolean(
    String(meta.inventory_store_id ?? '').trim() &&
      String(meta.inventory_store_code ?? '').trim() &&
      String(meta.inventory_hub_code ?? '').trim() &&
      String(meta.inventory_session_id ?? '').trim(),
  );
}

export function shouldRefreshInventoryAccessToken(options: {
  expiresAtMs: number;
  hasInventoryClaims: boolean;
  force?: boolean;
  nowMs?: number;
  skewMs?: number;
}): boolean {
  if (options.force) return true;
  if (!options.hasInventoryClaims) return true;
  const now = options.nowMs ?? Date.now();
  const skew = options.skewMs ?? INVENTORY_JWT_REFRESH_SKEW_MS;
  return !options.expiresAtMs || options.expiresAtMs < now + skew;
}

export function shouldJoinInventorySessionRefresh(params: {
  hasInFlight: boolean;
  inFlightIsForce: boolean;
  requestedForce: boolean;
}): boolean {
  if (!params.hasInFlight) return false;
  if (!params.requestedForce) return true;
  return params.inFlightIsForce;
}

/** 云端 JWT / RLS 鉴权失败（P4 需重新登录） */
export function isInventoryCloudAuthError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'name' in error) {
    if ((error as { name: string }).name === 'InventoryAuthRequiredError') return true;
  }
  const msg = errorMessage(error);
  return /jwt|session expired|invalid refresh token|401 unauthorized|row-level security|inventory_session|not authenticated|invalid claim|syncRlsBlocked/i.test(
    msg,
  );
}

export function isInventoryRlsPolicyError(error: unknown): boolean {
  const msg = errorMessage(error);
  return /row-level security|violates row-level security policy|permission denied for (table|relation|function)|syncRlsBlocked|42501/i.test(
    msg,
  );
}

export function isRetryableInventoryCloudWriteError(error: unknown): boolean {
  if (isInventoryCloudAuthError(error) || isInventoryRlsPolicyError(error)) return true;
  const msg = errorMessage(error);
  return /invalid inventory session|permission denied/i.test(msg);
}

/** 读到店铺行才判定停用；读不到行是会话/RLS，不是“已停用” */
export function interpretInventoryStoreAccess(row: {
  store_type?: string | null;
  status?: string | null;
} | null | undefined): 'allowed' | 'disabled' | 'unknown' {
  if (!row) return 'unknown';
  const typeOk = String(row.store_type ?? '').trim() === 'transit_station';
  const status = String(row.status ?? '').trim();
  const statusOk = !status || status === 'active';
  return typeOk && statusOk ? 'allowed' : 'disabled';
}

export const INVENTORY_RELOGIN_HINT =
  '云端登录已失效，请退出后重新登录（P4 安全策略要求使用店铺 JWT）';

export const INVENTORY_RLS_HINT =
  '云端权限校验失败（RLS）。请确认已部署 inventory-store-login 与数据库迁移 20260617120000 / 20260619120000，并重新登录；若仍失败请联系管理员。';
