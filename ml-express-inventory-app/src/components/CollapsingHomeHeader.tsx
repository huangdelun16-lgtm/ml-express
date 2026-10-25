import React, { useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

export function useCollapsingHomeScroll() {
  const scrollY = useRef(new Animated.Value(0)).current;
  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: false,
      }),
    [scrollY],
  );
  return { scrollY, onScroll };
}

type Props = {
  title: string;
  onHome: () => void;
  scrollY: Animated.Value;
  children?: React.ReactNode;
};

/** 与快递明细相同：下滑时 Home 收起，回到顶部时再展开。 */
export default function CollapsingHomeHeader({ title, onHome, scrollY, children }: Props) {
  const insets = useSafeAreaInsets();
  const headerBodyHeight = scrollY.interpolate({
    inputRange: [0, 64],
    outputRange: [48, 0],
    extrapolate: 'clamp',
  });
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 48],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <Animated.View style={[styles.navRow, { height: headerBodyHeight, opacity: headerOpacity }]}>
        <Pressable
          style={styles.homeBtn}
          onPress={onHome}
          accessibilityRole="button"
          accessibilityLabel="Home"
        >
          <Text style={styles.homeChevron}>‹</Text>
          <Text style={styles.homeLabel}>Home</Text>
        </Pressable>
        <Text style={styles.screenTitle} numberOfLines={1}>
          {title}
        </Text>
      </Animated.View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.bg },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    paddingHorizontal: 16,
    gap: 10,
  },
  homeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    paddingLeft: 8,
    paddingRight: 14,
    borderRadius: 18,
    backgroundColor: '#334155',
    gap: 2,
  },
  homeChevron: { color: '#f8fafc', fontSize: 26, lineHeight: 28, marginTop: -2 },
  homeLabel: { color: '#f8fafc', fontSize: 16, fontWeight: '700' },
  screenTitle: { color: '#f8fafc', fontSize: 17, fontWeight: '800', flexShrink: 1 },
});
