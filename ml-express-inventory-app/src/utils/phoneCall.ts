import { Linking } from 'react-native';
import { tRuntime } from '../i18n/runtime';
import { feedbackService } from '../services/FeedbackService';

/** 拨号：仅保留数字与 + 号 */
export function normalizePhoneForDial(raw: string): string {
  return raw.replace(/[^\d+]/g, '').trim();
}

export async function callPhoneNumber(raw: string): Promise<void> {
  const phone = normalizePhoneForDial(raw);
  const t = tRuntime();
  if (!phone) {
    feedbackService.notify(t.common.tip, t.common.noPhone);
    return;
  }

  const url = `tel:${phone}`;
  try {
    const can = await Linking.canOpenURL(url);
    if (!can) {
      feedbackService.notify(t.common.cannotDialTitle, t.common.cannotDial);
      return;
    }
    await Linking.openURL(url);
  } catch (e: unknown) {
    feedbackService.notify(
      t.common.dialFailed,
      e instanceof Error ? e.message : t.common.retry,
    );
  }
}
