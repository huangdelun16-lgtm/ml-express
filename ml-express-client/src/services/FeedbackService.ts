import { Vibration, Platform } from 'react-native';
import { toastService } from './ToastService';

// 定义触觉反馈类型
export enum FeedbackType {
  Success = 'success',
  Error = 'error',
  Warning = 'warning',
  Selection = 'selection',
  ImpactLight = 'impactLight',
  ImpactMedium = 'impactMedium',
  ImpactHeavy = 'impactHeavy',
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

  /**
   * 触发触觉反馈
   * 目前使用 Vibration API，未来可升级为 expo-haptics
   */
  trigger(type: FeedbackType = FeedbackType.Selection) {
    switch (type) {
      case FeedbackType.Success:
        // 两次短震动
        Vibration.vibrate([0, 50, 50, 50]);
        break;
      case FeedbackType.Error:
        // 长震动
        Vibration.vibrate(400);
        break;
      case FeedbackType.Warning:
        // 三次短震动
        Vibration.vibrate([0, 30, 30, 30, 30, 30]);
        break;
      case FeedbackType.Selection:
      case FeedbackType.ImpactLight:
        // 极短震动
        Vibration.vibrate(10);
        break;
      case FeedbackType.ImpactMedium:
        Vibration.vibrate(20);
        break;
      case FeedbackType.ImpactHeavy:
        Vibration.vibrate(40);
        break;
      default:
        Vibration.vibrate(10);
    }
  }

  /**
   * 显示成功提示并震动
   */
  success(message: string) {
    this.trigger(FeedbackType.Success);
    toastService.success(message);
  }

  /**
   * 显示错误提示并震动
   */
  error(message: string) {
    this.trigger(FeedbackType.Error);
    toastService.error(message);
  }

  /**
   * 显示警告提示并震动
   */
  warning(message: string) {
    this.trigger(FeedbackType.Warning);
    toastService.warning(message);
  }

  /**
   * 显示信息提示（无震动）
   */
  info(message: string) {
    toastService.info(message);
  }
}

export const feedbackService = FeedbackService.getInstance();

