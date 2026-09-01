import React, { useEffect, useRef, useState } from 'react';
import { Image, ImageStyle, StyleProp, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { remoteImageUri } from '../services/clientApi/nativeSupabaseUrl';

const MAX_ATTEMPTS = 3;

type Props = {
  uri?: string | null;
  style: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain';
  iconSize?: number;
  fallback?: React.ReactNode;
};

/** Product / mall images via market-link-express.com/__sb; retries transient proxy failures. */
export default function ProxiedImage({
  uri,
  style,
  resizeMode = 'cover',
  iconSize = 22,
  fallback,
}: Props) {
  const src = remoteImageUri(uri);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setAttempt(0);
    setFailed(false);
    return () => {
      if (retryTimer.current) {
        clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }
    };
  }, [src]);

  if (!src || failed) {
    if (fallback) return <>{fallback}</>;
    return (
      <View
        style={[
          style as ViewStyle,
          { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' },
        ]}
      >
        <Ionicons name="image-outline" size={iconSize} color="#cbd5e1" />
      </View>
    );
  }

  return (
    <Image
      key={`${src}-${attempt}`}
      source={{ uri: src }}
      style={style}
      resizeMode={resizeMode}
      onError={() => {
        if (attempt + 1 < MAX_ATTEMPTS) {
          retryTimer.current = setTimeout(() => {
            setAttempt((n) => n + 1);
          }, 400 * (attempt + 1));
          return;
        }
        setFailed(true);
      }}
    />
  );
}
