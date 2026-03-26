export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

type EventListener = (message: ToastMessage) => void;

class ToastService {
  private static instance: ToastService;
  private messageQueue: ToastMessage[] = [];
  private currentMessage: ToastMessage | null = null;
  private listeners: Map<string, EventListener[]> = new Map();

  private constructor() {}

  static getInstance(): ToastService {
    if (!ToastService.instance) {
      ToastService.instance = new ToastService();
    }
    return ToastService.instance;
  }

  private generateId(): string {
    return `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private show(message: ToastMessage) {
    if (this.currentMessage) {
      // 如果已有消息，加入队列
      this.messageQueue.push(message);
      return;
    }

    this.currentMessage = message;
    this.emit('show', message);
  }

  private hide() {
    this.currentMessage = null;
    this.emit('hide');

    // 显示队列中的下一条消息
    if (this.messageQueue.length > 0) {
      const nextMessage = this.messageQueue.shift()!;
      setTimeout(() => {
        this.show(nextMessage);
      }, 300); // 等待隐藏动画完成
    }
  }

  success(message: string, duration: number = 3000) {
    this.show({
      id: this.generateId(),
      message,
      type: 'success',
      duration,
    });
  }

  error(message: string, duration: number = 4000) {
    this.show({
      id: this.generateId(),
      message,
      type: 'error',
      duration,
    });
  }

  info(message: string, duration: number = 3000) {
    this.show({
      id: this.generateId(),
      message,
      type: 'info',
      duration,
    });
  }

  warning(message: string, duration: number = 3500) {
    this.show({
      id: this.generateId(),
      message,
      type: 'warning',
      duration,
    });
  }

  // 手动隐藏当前消息
  dismiss() {
    this.hide();
  }

  // 获取当前消息
  getCurrentMessage(): ToastMessage | null {
    return this.currentMessage;
  }

  // 事件监听
  on(event: 'show' | 'hide', listener: EventListener | (() => void)) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener as any);
  }

  off(event: 'show' | 'hide', listener: EventListener | (() => void)) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener as any);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: 'show' | 'hide', data?: ToastMessage) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        if (event === 'show' && data) {
          (listener as EventListener)(data);
        } else {
          (listener as () => void)();
        }
      });
    }
  }
}

export const toastService = ToastService.getInstance();

