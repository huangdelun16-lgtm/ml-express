import { useEffect, useRef, useState } from 'react';

const WARN_MS = 20 * 60 * 1000;
const LOGOUT_MS = 25 * 60 * 1000;

/**
 * 后台闲置保护：20 分钟提示，25 分钟自动退出。不改登录/校验逻辑。
 */
export function useAdminIdleLock(enabled: boolean, onLogout: () => void) {
  const [warning, setWarning] = useState(false);
  const lastActiveRef = useRef(Date.now());
  const logoutRef = useRef(onLogout);
  logoutRef.current = onLogout;

  const bump = () => {
    lastActiveRef.current = Date.now();
    setWarning(false);
  };

  useEffect(() => {
    if (!enabled) return undefined;
    lastActiveRef.current = Date.now();
    setWarning(false);

    const onActivity = () => {
      lastActiveRef.current = Date.now();
      setWarning(false);
    };

    const events: Array<keyof WindowEventMap> = ['mousedown', 'keydown', 'touchstart', 'mousemove', 'scroll'];
    events.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));

    const timer = window.setInterval(() => {
      const idle = Date.now() - lastActiveRef.current;
      if (idle >= LOGOUT_MS) {
        logoutRef.current();
        return;
      }
      if (idle >= WARN_MS) setWarning(true);
    }, 15_000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, onActivity));
      window.clearInterval(timer);
    };
  }, [enabled]);

  return { warning, staySignedIn: bump };
}
