import React, { PropsWithChildren } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

type ScreenProps = PropsWithChildren<{
  padding?: number;
  style?: ViewStyle | ViewStyle[];
}>;

export function Screen({ children, padding = 16, style }: ScreenProps) {
  return (
    <View style={[styles.container, { padding }, style]}
    >
      <View style={styles.bgLayer} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f8fb',
  },
  bgLayer: {
    position: 'absolute',
    inset: 0 as unknown as number,
    backgroundColor: 'transparent',
    // 简易渐变背景：用两个叠加的径向/线性渐变近似（Web 有效，原生忽略）
    // @ts-ignore web only
    backgroundImage: 'radial-gradient(60% 40% at 10% 10%, rgba(26,115,232,0.10), rgba(26,115,232,0.0)), linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.6))',
    filter: 'saturate(1.05)',
  },
});



