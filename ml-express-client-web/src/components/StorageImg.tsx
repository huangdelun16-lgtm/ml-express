import React, { useEffect, useRef, useState } from 'react';
import { publicStorageUrl } from '../utils/supabaseBrowserUrl';

type Props = {
  src?: string | null;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  fallback?: React.ReactNode;
};

const MAX_ATTEMPTS = 3;

/** Loads Storage images via /__sb so Myanmar browsers are not stuck on supabase.co. */
export default function StorageImg({ src, alt = '', className, style, fallback }: Props) {
  const url = publicStorageUrl(src);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const retryTimer = useRef<number | null>(null);

  useEffect(() => {
    setAttempt(0);
    setFailed(false);
    return () => {
      if (retryTimer.current != null) {
        window.clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }
    };
  }, [url]);

  if (!url || failed) {
    return <>{fallback ?? null}</>;
  }

  return (
    <img
      key={`${url}-${attempt}`}
      src={url}
      alt={alt}
      className={className}
      style={style}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => {
        if (attempt + 1 < MAX_ATTEMPTS) {
          retryTimer.current = window.setTimeout(() => {
            setAttempt((n) => n + 1);
          }, 400 * (attempt + 1));
          return;
        }
        setFailed(true);
      }}
    />
  );
}
