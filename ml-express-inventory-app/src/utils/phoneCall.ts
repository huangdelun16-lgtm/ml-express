import { Linking } from 'react-native';
import { feedbackService } from '../services/FeedbackService';

/** 拨号：仅保留数字与 + 号 */
export function normalizePhoneForDial(raw: string): string {
  return raw.replace(/[^\d+]/g, '').trim();
}

export async function callPhoneNumber(raw: string): Promise<void> {
  const phone = normalizePhoneForDial(raw);
  if (!phone) {
    feedbackService.notify('提示', '暂无客户电话');
    return;
  }

  const url = `tel:${phone}`;
  try {
    const can = await Linking.canOpenURL(url);
    if (!can) {
      feedbackService.notify('无法拨打', '当前设备不支持拨号');
      return;
    }
    await Linking.openURL(url);
  } catch (e: unknown) {
    feedbackService.notify('拨打失败', e instanceof Error ? e.message : '请重试');
  }
}
