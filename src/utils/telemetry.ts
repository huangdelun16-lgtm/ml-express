export function sendTelemetry(type: 'vital' | 'error' | 'event', detail: any) {
  try {
    const url = `${window.location.origin}/.netlify/functions/telemetry`;
    const payload = {
      type,
      detail,
      url: window.location.href,
      sessionId: getOrCreateSessionId(),
    };
    navigator.sendBeacon
      ? navigator.sendBeacon(url, new Blob([JSON.stringify(payload)], { type: 'application/json' }))
      : fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  } catch {}
}

function getOrCreateSessionId(): string {
  try {
    const key = '__ML_SESSION_ID__';
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem(key, id);
    }
    return id;
  } catch {
    return 'client';
  }
}

export function installGlobalErrorHandlers() {
  try {
    window.addEventListener('error', (e) => {
      sendTelemetry('error', { message: e.error?.message || e.message, stack: e.error?.stack });
    });
    window.addEventListener('unhandledrejection', (e: any) => {
      sendTelemetry('error', { message: e?.reason?.message || 'unhandledrejection', stack: e?.reason?.stack });
    });
  } catch {}
}


