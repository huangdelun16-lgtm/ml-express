import { Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';
import { toastService } from './toastService';

export enum FeedbackType {
  Success = 'success',
  Error = 'error',
  Warning = 'warning',
  Selection = 'selection',
  ImpactLight = 'impactLight',
  ImpactMedium = 'impactMedium',
  ImpactHeavy = 'impactHeavy',
}

function isGenericTitle(title: string): boolean {
  return /^(错误|失败|提示|成功|警告|Error|Failed|Success|Warning|Hint|Notice|失敗|提示訊息)$/i.test(
    title.trim(),
  );
}

function classifyByTitle(title: string): 'success' | 'error' | 'warning' | 'info' {
  const t = title.trim();
  if (/成功|完成|已送达|扫码成功|Success|Done|Delivered|အောင်မြင်/i.test(t)) return 'success';
  if (/错误|失败|无效|上传失败|更新失败|操作失败|Error|Fail|Invalid|အမှား/i.test(t)) return 'error';
  if (
    /权限|距离|异常|禁止|提示|警告|网络|超时|Permission|Too far|Warning|Hint|Tip|Notice|Network|timeout|အသိပေး|အကြောင်း/i.test(
      t,
    )
  ) {
    return 'warning';
  }
  return 'info';
}

class FeedbackService {
  private static instance: FeedbackService;

  private constructor() {}

  static getInstance(): FeedbackService {
    if (!FeedbackService.instance) {
      FeedbackService.instance = new FeedbackService();
    }
    return FeedbackService.instance;
  }

  trigger(type: FeedbackType = FeedbackType.Selection) {
    try {
      switch (type) {
        case FeedbackType.Success:
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case FeedbackType.Error:
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        case FeedbackType.Warning:
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case FeedbackType.ImpactHeavy:
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case FeedbackType.ImpactMedium:
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case FeedbackType.ImpactLight:
        case FeedbackType.Selection:
        default:
          void Haptics.selectionAsync();
          break;
      }
    } catch {
      // Expo Go / 无触觉硬件时回退 Vibration
      if (type === FeedbackType.Error) Vibration.vibrate(400);
      else if (type === FeedbackType.Warning) Vibration.vibrate([0, 30, 30, 30, 30, 30]);
      else if (type === FeedbackType.Success) Vibration.vibrate([0, 50, 50, 50]);
      else Vibration.vibrate(10);
    }
  }

  success(message: string) {
    this.trigger(FeedbackType.Success);
    toastService.success(message);
  }

  error(message: string) {
    this.trigger(FeedbackType.Error);
    toastService.error(message);
  }

  warning(message: string) {
    this.trigger(FeedbackType.Warning);
    toastService.warning(message);
  }

  info(message: string) {
    toastService.info(message);
  }

  /**
   * 将旧式 Alert.alert(title, message) 的非确认提示统一到 Toast。
   * 需用户点选按钮的确认框请继续用 Alert.alert。
   */
  notify(title: string, message?: string) {
    const body =
      message == null || message === ''
        ? title
        : isGenericTitle(title)
          ? message
          : `${title}：${message}`;
    const kind = classifyByTitle(title);
    if (kind === 'success') this.success(body);
    else if (kind === 'error') this.error(body);
    else if (kind === 'warning') this.warning(body);
    else this.info(body);
  }
}

export const feedbackService = FeedbackService.getInstance();
