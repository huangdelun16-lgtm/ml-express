/** 商家 Web 新订单桌面提醒（系统通知 / 标题闪烁 / 尽力聚焦窗口） */

const TITLE_FLASH_MS = 900;

let titleFlashTimer: ReturnType<typeof setInterval> | null = null;
let savedDocumentTitle = '';

export function isDesktopNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function ensureDesktopNotificationPermission(): Promise<NotificationPermission> {
  if (!isDesktopNotificationSupported()) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

function buildNotificationCopy(count: number, language: string): { title: string; body: string } {
  if (language === 'my') {
    return {
      title: 'အော်ဒါအသစ်',
      body:
        count > 1
          ? `待确认 ${count} ခု — နှိပ်ပြီး Merchant Web သို့ ပြန်သွားပါ`
          : '待确认 အော်ဒါ 1 ခု — နှိပ်ပြီး Merchant Web သို့ ပြန်သွားပါ',
    };
  }
  if (language === 'en') {
    return {
      title: 'New order',
      body:
        count > 1
          ? `${count} orders awaiting confirmation — click to open merchant web`
          : '1 order awaiting confirmation — click to open merchant web',
    };
  }
  return {
    title: '新订单提醒',
    body:
      count > 1
        ? `您有 ${count} 个待确认订单，点击返回商家端处理`
        : '您有 1 个待确认新订单，点击返回商家端处理',
  };
}

/** 系统级通知：即使用户在其它软件/桌面也能弹出（需已授权） */
export function showNewOrderDesktopNotification(
  count: number,
  language: string,
  onActivate?: () => void,
): void {
  if (!isDesktopNotificationSupported() || Notification.permission !== 'granted') return;
  if (count <= 0) return;

  const { title, body } = buildNotificationCopy(count, language);
  try {
    const notification = new Notification(title, {
      body,
      tag: 'ml-merchant-pending-order',
      requireInteraction: true,
      silent: false,
    });
    notification.onclick = (event) => {
      event.preventDefault();
      notification.close();
      focusMerchantWindow();
      onActivate?.();
    };
  } catch {
    /* 部分浏览器在后台可能拒绝创建通知 */
  }
}

/** 浏览器允许范围内尽力把窗口/tab 拉回；无法越过其它桌面应用 */
export function focusMerchantWindow(): void {
  try {
    window.focus();
  } catch {
    /* ignore */
  }
}

export function startPendingOrderTitleFlash(pendingCount: number, language: string): void {
  if (typeof document === 'undefined' || pendingCount <= 0) return;
  stopPendingOrderTitleFlash();

  savedDocumentTitle = document.title;
  const alertLabel =
    language === 'my'
      ? `(${pendingCount}) အော်ဒါ`
      : language === 'en'
        ? `(${pendingCount}) New order`
        : `(${pendingCount}) 新订单`;

  let on = false;
  titleFlashTimer = setInterval(() => {
    document.title = on ? savedDocumentTitle : `🔔 ${alertLabel} — ${savedDocumentTitle}`;
    on = !on;
  }, TITLE_FLASH_MS);
}

export function stopPendingOrderTitleFlash(): void {
  if (titleFlashTimer) {
    clearInterval(titleFlashTimer);
    titleFlashTimer = null;
  }
  if (savedDocumentTitle && typeof document !== 'undefined') {
    document.title = savedDocumentTitle;
    savedDocumentTitle = '';
  }
}

/** 短提示音：后台 tab 有时比 speechSynthesis 更可靠 */
export function playNewOrderChime(): void {
  if (typeof window === 'undefined') return;
  try {
    const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.value = 0.12;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
    osc.onended = () => {
      void ctx.close();
    };
  } catch {
    /* ignore */
  }
}
