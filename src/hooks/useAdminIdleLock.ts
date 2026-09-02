import { useEffect, useRef, useState } from 'react';
import { systemSettingsService } from '../services/supabase';
import {
  DEFAULT_SESSION_TIMEOUT_MINUTES,
  idleLockMs,
  idleLockMinutes,
  parseJsonbNumber,
} from '../utils/adminSecuritySettings';

/**
 * 后台闲置保护：分钟数读 `security.session_timeout_minutes`（默认 45）。
 * 提前 5 分钟提示，到期自动退出。不改登录/校验逻辑。
 */
export function useAdminIdleLock(enabled: boolean, onLogout: () => void) {
  const [{ warnMs, logoutMs, timeoutMinutes, warnMinutes }, setWindows] = useState(() => {
    const idle = idleLockMinutes(DEFAULT_SESSION_TIMEOUT_MINUTES);
    const ms = idleLockMs(DEFAULT_SESSION_TIMEOUT_MINUTES);
    return { ...ms, ...idle };
  });
  const [warning, setWarning] = useState(false);
  const lastActiveRef = useRef(Date.now());
  const logoutRef = useRef(onLogout);
  logoutRef.current = onLogout;

  const bump = () => {
    lastActiveRef.current = Date.now();
    setWarning(false);
  };

  useEffect(() => {
    let cancelled = false;
    const applyTimeout = (minutes: number) => {
      const idle = idleLockMinutes(minutes);
      const ms = idleLockMs(minutes);
      if (!cancelled) setWindows({ ...ms, ...idle });
    };

    const load = async () => {
      const rows = await systemSettingsService.getSettingsByKeys(['security.session_timeout_minutes']);
      const raw = rows[0]?.settings_value;
      applyTimeout(parseJsonbNumber(raw, DEFAULT_SESSION_TIMEOUT_MINUTES));
    };

    void load();
    const poll = window.setInterval(() => {
      void load();
    }, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
    };
  }, []);

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
      if (idle >= logoutMs) {
        logoutRef.current();
        return;
      }
      if (idle >= warnMs) setWarning(true);
    }, 15_000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, onActivity));
      window.clearInterval(timer);
    };
  }, [enabled, warnMs, logoutMs]);

  return { warning, staySignedIn: bump, timeoutMinutes, warnMinutes };
}
