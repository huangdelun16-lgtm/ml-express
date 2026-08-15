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

  static getInstance(): ToastService {
    if (!ToastService.instance) {
      ToastService.instance = new ToastService();
    }
    return ToastService.instance;
  }

  private generateId(): string {
    return `toast_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  private show(message: ToastMessage) {
    if (this.currentMessage) {
      this.messageQueue.push(message);
      return;
    }
    this.currentMessage = message;
    this.emit('show', message);
  }

  private hide() {
    this.currentMessage = null;
    this.emit('hide');
    if (this.messageQueue.length > 0) {
      const nextMessage = this.messageQueue.shift()!;
      setTimeout(() => this.show(nextMessage), 300);
    }
  }

  success(message: string, duration = 3000) {
    this.show({ id: this.generateId(), message, type: 'success', duration });
  }

  error(message: string, duration = 4000) {
    this.show({ id: this.generateId(), message, type: 'error', duration });
  }

  info(message: string, duration = 3000) {
    this.show({ id: this.generateId(), message, type: 'info', duration });
  }

  warning(message: string, duration = 3500) {
    this.show({ id: this.generateId(), message, type: 'warning', duration });
  }

  dismiss() {
    this.hide();
  }

  on(event: 'show' | 'hide', listener: EventListener | (() => void)) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(listener as EventListener);
  }

  off(event: 'show' | 'hide', listener: EventListener | (() => void)) {
    const listeners = this.listeners.get(event);
    if (!listeners) return;
    const index = listeners.indexOf(listener as EventListener);
    if (index > -1) listeners.splice(index, 1);
  }

  private emit(event: 'show' | 'hide', data?: ToastMessage) {
    const listeners = this.listeners.get(event);
    if (!listeners) return;
    listeners.forEach((listener) => {
      if (event === 'show' && data) listener(data);
      else (listener as () => void)();
    });
  }
}

export const toastService = ToastService.getInstance();
