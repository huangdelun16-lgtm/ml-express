import React, { useEffect, useState } from 'react';
import { publicStorageUrl } from '../utils/supabaseBrowserUrl';

type Props = {
  src?: string | null;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  fallback?: React.ReactNode;
};

/** Loads Storage images via /__sb so Myanmar browsers are not stuck on supabase.co. */
export default function StorageImg({ src, alt = '', className, style, fallback }: Props) {
  const url = publicStorageUrl(src);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [url]);

  if (!url || failed) {
    return <>{fallback ?? null}</>;
  }

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      style={style}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
