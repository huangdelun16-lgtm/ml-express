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

/** 前半段跟手，后半段放慢，避免顶栏和筛选被直线压扁。 */
export function easedScrollSpan(
  scrollY: Animated.Value,
  distance: number,
  from: number,
  to: number,
) {
  const span = Math.max(distance, 1);
  const delta = to - from;
  return scrollY.interpolate({
    inputRange: [0, span * 0.45, span],
    outputRange: [from, from + delta * 0.72, to],
    extrapolate: 'clamp',
  });
}

type Props = {
  title: string;
  onHome: () => void;
  scrollY: Animated.Value;
  children?: React.ReactNode;
};

const HEADER_TRAVEL = 56;

/** 下滑时 Home 跟着手指收起，回到顶部再展开。 */
export default function CollapsingHomeHeader({ title, onHome, scrollY, children }: Props) {
  const insets = useSafeAreaInsets();
  const headerBodyHeight = easedScrollSpan(scrollY, HEADER_TRAVEL, 48, 0);
  const headerOpacity = easedScrollSpan(scrollY, HEADER_TRAVEL, 1, 0);
  const headerLift = easedScrollSpan(scrollY, HEADER_TRAVEL, 0, -10);
  const edgeOpacity = scrollY.interpolate({
    inputRange: [12, HEADER_TRAVEL],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <Animated.View
        style={[
          styles.navRow,
          {
            height: headerBodyHeight,
            opacity: headerOpacity,
            transform: [{ translateY: headerLift }],
          },
        ]}
      >
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
      <Animated.View style={[styles.edge, { opacity: edgeOpacity }]} />
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
  edge: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(148, 163, 184, 0.45)',
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
