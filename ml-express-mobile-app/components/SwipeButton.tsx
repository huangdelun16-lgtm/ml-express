import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  LayoutChangeEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SwipeButtonProps {
  onSwipeComplete: () => void;
  title: string;
  subTitle?: string;
  color?: string;
  gradientColors?: string[];
  disabled?: boolean;
}

const BUTTON_HEIGHT = 64;
const SWIPE_SIZE = 56;
const SWIPE_MARGIN = 4;

export const SwipeButton: React.FC<SwipeButtonProps> = ({
  onSwipeComplete,
  title,
  subTitle,
  gradientColors = ['#10b981', '#059669'],
  disabled = false,
}) => {
  const [isComplete, setIsComplete] = useState(false);
  const [containerWidth, setContainerWidth] = useState(SCREEN_WIDTH * 0.8);
  const translateX = useRef(new Animated.Value(0)).current;
  
  // 计算可滑动的最大距离
  const maxTranslate = Math.max(0, containerWidth - SWIPE_SIZE - SWIPE_MARGIN * 2);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setContainerWidth(width);
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled && !isComplete,
      onMoveShouldSetPanResponder: () => !disabled && !isComplete,
      onPanResponderGrant: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0 && gestureState.dx <= maxTranslate) {
          translateX.setValue(gestureState.dx);
        } else if (gestureState.dx > maxTranslate) {
          translateX.setValue(maxTranslate);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx >= maxTranslate * 0.75) {
          // 完成滑动
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Animated.timing(translateX, {
            toValue: maxTranslate,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setIsComplete(true);
            onSwipeComplete();
            // 延迟一点重置，给用户看一眼完成状态
            setTimeout(() => {
              reset();
            }, 1500);
          });
        } else {
          // 未滑到终点，回弹
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8,
            tension: 40,
          }).start();
        }
      },
    })
  ).current;

  const reset = () => {
    setIsComplete(false);
    Animated.timing(translateX, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const textOpacity = translateX.interpolate({
    inputRange: [0, maxTranslate * 0.5],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const arrowScale = translateX.interpolate({
    inputRange: [0, maxTranslate],
    outputRange: [1, 1.2],
    extrapolate: 'clamp',
  });

  return (
    <View 
      style={[styles.container, disabled && styles.disabled]}
      onLayout={onLayout}
    >
      <View style={styles.background}>
        <Text style={styles.backgroundText}>{title}</Text>
      </View>

      <Animated.View style={[styles.textContainer, { opacity: textOpacity }]}>
        <View style={styles.hintWrapper}>
          <Text style={styles.hintText}>{subTitle || (isComplete ? '确认成功' : '向右滑动确认')}</Text>
          {!isComplete && (
            <Animated.View style={styles.shimmerEffect} />
          )}
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.swipeThumb,
          {
            transform: [
              { translateX },
              { scale: arrowScale }
            ],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <LinearGradient
          colors={isComplete ? ['#3b82f6', '#2563eb'] : gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.thumbGradient}
        >
          {isComplete ? (
            <Ionicons name="checkmark-sharp" size={30} color="white" />
          ) : (
            <Ionicons name="chevron-forward-outline" size={30} color="white" />
          )}
        </LinearGradient>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: BUTTON_HEIGHT,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: BUTTON_HEIGHT / 2,
    justifyContent: 'center',
    padding: SWIPE_MARGIN,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    width: '100%',
    marginTop: 10,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
  },
  backgroundText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
    opacity: 0.15,
    letterSpacing: 1,
  },
  textContainer: {
    position: 'absolute',
    left: SWIPE_SIZE + SWIPE_MARGIN + 10,
    right: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  hintWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hintText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 15,
    fontWeight: '700',
  },
  shimmerEffect: {
    // 可以添加动画效果
  },
  swipeThumb: {
    width: SWIPE_SIZE,
    height: SWIPE_SIZE,
    borderRadius: SWIPE_SIZE / 2,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  thumbGradient: {
    width: '100%',
    height: '100%',
    borderRadius: SWIPE_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  disabled: {
    opacity: 0.5,
  },
});
