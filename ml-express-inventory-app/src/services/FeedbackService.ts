import { toastService } from './ToastService';

function isGenericTitle(title: string): boolean {
  return /^(错误|失败|提示|成功|警告|Error|Failed|Success|Warning|Hint|Notice)$/i.test(title.trim());
}

function classifyByTitle(title: string): 'success' | 'error' | 'warning' | 'info' {
  const t = title.trim();
  if (/成功|完成|已复制|已保存|Saved|Success|Done|Copied/i.test(t)) return 'success';
  if (/错误|失败|无效|无法|Error|Fail|Invalid/i.test(t)) return 'error';
  if (/权限|异常|禁止|提示|警告|网络|超时|Warning|Hint|Tip|Notice|Network/i.test(t)) {
    return 'warning';
  }
  return 'info';
}

class FeedbackService {
  private static instance: FeedbackService;

  static getInstance(): FeedbackService {
    if (!FeedbackService.instance) {
      FeedbackService.instance = new FeedbackService();
    }
    return FeedbackService.instance;
  }

  success(message: string) {
    toastService.success(message);
  }

  error(message: string) {
    toastService.error(message);
  }

  warning(message: string) {
    toastService.warning(message);
  }

  info(message: string) {
    toastService.info(message);
  }

  /**
   * 将旧式 Alert.alert(title, message) 的非确认提示统一到 Toast。
   * 需用户确认的操作请继续用 Alert.alert。
   */
  notify(title: string, message?: string) {
    const body =
      message == null || message === ''
        ? title
        : isGenericTitle(title)
          ? message
          : `${title}：${message}`;
    const kind = classifyByTitle(`${title} ${message ?? ''}`);
    if (kind === 'success') this.success(body);
    else if (kind === 'error') this.error(body);
    else if (kind === 'warning') this.warning(body);
    else this.info(body);
  }
}

export const feedbackService = FeedbackService.getInstance();
