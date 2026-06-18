/** 云端 JWT / RLS 鉴权失败（P4 需重新登录） */
export function isInventoryCloudAuthError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'name' in error) {
    if ((error as { name: string }).name === 'InventoryAuthRequiredError') return true;
  }
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : String(error ?? '');
  return /jwt|session expired|invalid refresh token|401 unauthorized|row-level security|inventory_session|not authenticated|invalid claim/i.test(
    msg,
  );
}

export function isInventoryRlsPolicyError(error: unknown): boolean {
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : String(error ?? '');
  return /row-level security|violates row-level security policy/i.test(msg);
}

export const INVENTORY_RELOGIN_HINT =
  '云端登录已失效，请退出后重新登录（P4 安全策略要求使用店铺 JWT）';

export const INVENTORY_RLS_HINT =
  '云端权限校验失败（RLS）。请确认已部署 inventory-store-login 与数据库迁移 20260617120000 / 20260619120000，并重新登录；若仍失败请联系管理员。';
