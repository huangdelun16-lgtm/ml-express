import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { getBarcodeImageUrl } from '../utils/barcodeImage';

type Props = {
  code: string;
  height?: number;
  showCodeText?: boolean;
};

export default function BarcodeImage({ code, height = 72, showCodeText = true }: Props) {
  const [failed, setFailed] = useState(false);
  const uri = getBarcodeImageUrl(code, { scale: 3, height: 14, includeText: false });

  if (!code) return null;

  return (
    <View style={styles.wrap}>
      {!failed ? (
        <Image
          source={{ uri }}
          style={[styles.image, { height }]}
          resizeMode="contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <View style={[styles.fallback, { minHeight: height }]}>
          <View style={styles.fallbackBars}>
            {code.split('').map((ch, i) => (
              <View
                key={`${ch}-${i}`}
                style={[styles.bar, { height: 16 + (ch.charCodeAt(0) % 5) * 8 }]}
              />
            ))}
          </View>
        </View>
      )}
      {showCodeText ? <Text style={styles.code}>{code}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', width: '100%' },
  image: { width: '100%' },
  fallback: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
  },
  fallbackBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 2,
    minHeight: 48,
  },
  bar: { width: 3, backgroundColor: '#0f172a', borderRadius: 1 },
  code: {
    marginTop: 10,
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
});
