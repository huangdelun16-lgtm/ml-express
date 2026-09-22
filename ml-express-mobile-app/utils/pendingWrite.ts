import { tr3 } from './tr3';

export type PendingWriteResult = {
  ok: boolean;
  queued?: boolean;
};

export function pendingWriteFailed(): PendingWriteResult {
  return { ok: false };
}

export function pendingWriteSynced(): PendingWriteResult {
  return { ok: true };
}

export function pendingWriteQueuedResult(): PendingWriteResult {
  return { ok: true, queued: true };
}

export function isWriteOk(result: PendingWriteResult | undefined | null): boolean {
  return Boolean(result?.ok);
}

export function isWriteQueued(result: PendingWriteResult | undefined | null): boolean {
  return Boolean(result?.ok && result.queued);
}

export function pendingWriteUserMessage(
  language: string,
  result: PendingWriteResult,
  syncedZh: string,
  syncedEn = syncedZh,
  syncedMy = syncedEn,
): string {
  if (!result.ok) {
    return tr3(language, '操作失败，请重试', 'Action failed. Please retry.', 'မအောင်မြင်ပါ။ ထပ်ကြိုးစားပါ။');
  }
  if (result.queued) {
    return tr3(
      language,
      '已保存到待同步队列，联网后自动上传。请勿重复操作。',
      'Saved to the sync queue. It will upload when you are online. Do not repeat.',
      'ချိတ်ဆက်မှုပြန်ရမှ အလိုအလျောက် တင်မည်။ ထပ်မလုပ်ပါနှင့်။',
    );
  }
  return tr3(language, syncedZh, syncedEn, syncedMy);
}
