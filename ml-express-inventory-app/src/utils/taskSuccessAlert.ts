import { feedbackService } from '../services/FeedbackService';

/** 任务完成时的统一成功提示（Toast，不打断扫码） */
export function showTaskSuccess(
  title: string,
  message?: string,
  onOk?: () => void,
): void {
  const text = message?.trim() ? `${title}：${message.trim()}` : title;
  feedbackService.success(text);
  onOk?.();
}
