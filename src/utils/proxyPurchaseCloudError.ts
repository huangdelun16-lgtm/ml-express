type AppLanguage = 'zh' | 'en' | 'my';

type SupabaseLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

export function isProxyPurchaseTableMissingError(error: unknown): boolean {
  const e = error as SupabaseLikeError;
  const msg = `${e?.message ?? ''} ${e?.details ?? ''} ${e?.hint ?? ''}`.toLowerCase();
  const code = String(e?.code ?? '');
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    msg.includes('proxy_purchase_workspaces') ||
    msg.includes('schema cache') ||
    msg.includes('does not exist') ||
    msg.includes('could not find the table')
  );
}

export function describeProxyPurchaseCloudError(error: unknown, language: AppLanguage | string): string {
  if (isProxyPurchaseTableMissingError(error)) {
    return language === 'en'
      ? 'Cloud table proxy_purchase_workspaces is missing. In Supabase Dashboard → SQL Editor, run migration 20260707120000_proxy_purchase_workspace.sql, then tap «Retry sync».'
      : language === 'my'
        ? 'proxy_purchase_workspaces table မရှိ — Supabase SQL Editor တွင် migration run ပြီး «Retry sync» နှိပ်ပါ။'
        : '云端数据表 proxy_purchase_workspaces 尚未创建。请在 Supabase Dashboard → SQL Editor 执行 migration 文件 20260707120000_proxy_purchase_workspace.sql，完成后点下方「重试同步」。';
  }

  const e = error as SupabaseLikeError;
  const detail = [e?.message, e?.details].filter(Boolean).join(' — ');
  if (language === 'en') {
    return detail
      ? `Cloud sync failed: ${detail}`
      : 'Cloud sync failed. Check Supabase connection, then tap «Retry sync».';
  }
  if (language === 'my') {
    return detail ? `Cloud sync မအောင်မြင်: ${detail}` : 'Cloud sync မအောင်မြင် — «Retry sync» နှိပ်ပါ။';
  }
  return detail
    ? `云端同步失败：${detail}`
    : '云端同步失败，请检查 Supabase 连接后点「重试同步」。';
}
