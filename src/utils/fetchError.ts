/** 页面切换 / 组件卸载时 fetch 被中止，不属于真实业务错误 */
export function isAbortLikeError(err: unknown): boolean {
  if (err == null) return false;
  if (typeof err === 'string') {
    const s = err.toLowerCase();
    return s.includes('abort') || s.includes('aborterror');
  }
  if (typeof err !== 'object') return false;
  const e = err as { name?: string; message?: string; details?: string; code?: string };
  if (e.name === 'AbortError') return true;
  const msg = `${e.message ?? ''} ${e.details ?? ''}`.toLowerCase();
  return msg.includes('abort') || msg.includes('operation was aborted');
}
