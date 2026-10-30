import React, { useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

type Props = {
  scrollY: Animated.Value;
  /** 列表可视高度 */
  viewportHeight: number;
  /** 列表内容总高度 */
  contentHeight: number;
};

const TRACK_INSET = 22;
const THUMB_MIN = 36;

/** 右侧滑块跟着滚动位置走。往回滑会退回，停下就停在当前位置。 */
export default function ScrollPositionRail({ scrollY, viewportHeight, contentHeight }: Props) {
  const [trackHeight, setTrackHeight] = useState(0);
  const maxScroll = Math.max(contentHeight - viewportHeight, 0);
  const visible = maxScroll > 48 && trackHeight > 0;
  const ratio = contentHeight > 0 ? Math.min(viewportHeight / contentHeight, 1) : 1;
  const share = Math.min(Math.max(ratio, 0.14), 0.36);
  const fittedThumb = trackHeight > 0 ? Math.max(THUMB_MIN, Math.min(trackHeight * share, trackHeight - 6)) : 0;
  const travel = Math.max(trackHeight - fittedThumb, 1);
  const translateY = scrollY.interpolate({
    inputRange: [0, Math.max(maxScroll, 1)],
    outputRange: [0, travel],
    extrapolate: 'clamp',
  });

  return (
    <View pointerEvents="none" style={[styles.wrap, !visible && styles.hidden]}>
      <View
        style={styles.track}
        onLayout={(event) => {
          const next = event.nativeEvent.layout.height;
          setTrackHeight((current) => (Math.abs(current - next) > 0.5 ? next : current));
        }}
      >
        {visible ? (
          <Animated.View style={[styles.thumb, { height: fittedThumb, transform: [{ translateY }] }]}>
            <View style={styles.thumbSheen} />
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: TRACK_INSET,
    bottom: TRACK_INSET,
    right: 4,
    width: 14,
    alignItems: 'center',
  },
  hidden: { opacity: 0 },
  track: {
    flex: 1,
    width: 2,
    borderRadius: 2,
    backgroundColor: 'rgba(226, 232, 240, 0.16)',
    overflow: 'visible',
  },
  thumb: {
    position: 'absolute',
    top: 0,
    left: -2,
    width: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(248, 250, 252, 0.94)',
    shadowColor: '#7dd3fc',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 6,
    elevation: 4,
  },
  thumbSheen: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 1,
    width: 1.5,
    borderRadius: 1,
    backgroundColor: 'rgba(125, 211, 252, 0.95)',
  },
});
