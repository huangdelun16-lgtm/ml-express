import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DeliveryLoadingAnimationProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  showOverlay?: boolean;
}

export default function DeliveryLoadingAnimation({
  message = '加载中...',
  size = 'medium',
  showOverlay = true,
}: DeliveryLoadingAnimationProps) {
  // 动画值
  const motorcyclePosition = useRef(new Animated.Value(-150)).current;
  const wheelRotation = useRef(new Animated.Value(0)).current;
  const packageBounce = useRef(new Animated.Value(0)).current;
  const smokeOpacity = useRef(new Animated.Value(0)).current;
  const deliveryManBounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 摩托车移动动画
    const motorcycleAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(motorcyclePosition, {
          toValue: SCREEN_WIDTH + 50,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(motorcyclePosition, {
          toValue: -150,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    // 车轮旋转动画
    const wheelAnimation = Animated.loop(
      Animated.timing(wheelRotation, {
        toValue: 1,
        duration: 500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // 包裹弹跳动画
    const packageAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(packageBounce, {
          toValue: -5,
          duration: 300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(packageBounce, {
          toValue: 0,
          duration: 300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // 烟雾动画
    const smokeAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(smokeOpacity, {
          toValue: 0.6,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(smokeOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ])
    );

    // 快递员弹跳动画
    const deliveryManAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(deliveryManBounce, {
          toValue: -3,
          duration: 250,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(deliveryManBounce, {
          toValue: 0,
          duration: 250,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    motorcycleAnimation.start();
    wheelAnimation.start();
    packageAnimation.start();
    smokeAnimation.start();
    deliveryManAnimation.start();

    return () => {
      motorcycleAnimation.stop();
      wheelAnimation.stop();
      packageAnimation.stop();
      smokeAnimation.stop();
      deliveryManAnimation.stop();
    };
  }, []);

  const wheelRotate = wheelRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const sizeStyles = {
    small: { scale: 0.6, containerHeight: 120 },
    medium: { scale: 1, containerHeight: 200 },
    large: { scale: 1.3, containerHeight: 260 },
  };

  const currentSize = sizeStyles[size];

  const containerStyle = showOverlay
    ? [styles.overlayContainer]
    : [styles.inlineContainer, { height: currentSize.containerHeight }];

  return (
    <View style={containerStyle}>
      {showOverlay && (
        <LinearGradient
          colors={['rgba(176, 211, 232, 0.95)', 'rgba(120, 149, 163, 0.95)']}
          style={styles.gradientOverlay}
        />
      )}

      <View style={[styles.animationContainer, { transform: [{ scale: currentSize.scale }] }]}>
        {/* 道路 */}
        <View style={styles.road}>
          <View style={styles.roadLine} />
        </View>

        {/* 摩托车和快递员组合 */}
        <Animated.View
          style={[
            styles.motorcycleContainer,
            {
              transform: [{ translateX: motorcyclePosition }],
            },
          ]}
        >
          {/* 烟雾效果 */}
          <Animated.View
            style={[
              styles.smoke,
              {
                opacity: smokeOpacity,
              },
            ]}
          >
            <Text style={styles.smokeText}>💨</Text>
          </Animated.View>

          {/* 快递包裹（在后座） */}
          <Animated.View
            style={[
              styles.package,
              {
                transform: [{ translateY: packageBounce }],
              },
            ]}
          >
            <Text style={styles.packageText}>📦</Text>
          </Animated.View>

          {/* 快递员 */}
          <Animated.View
            style={[
              styles.deliveryMan,
              {
                transform: [{ translateY: deliveryManBounce }],
              },
            ]}
          >
            <Text style={styles.deliveryManText}>🏍️</Text>
            <View style={styles.helmet}>
              <Text style={styles.helmetText}>⛑️</Text>
            </View>
          </Animated.View>

          {/* 摩托车车身 */}
          <View style={styles.motorcycleBody}>
            {/* 前轮 */}
            <Animated.View
              style={[
                styles.wheel,
                styles.frontWheel,
                {
                  transform: [{ rotate: wheelRotate }],
                },
              ]}
            >
              <View style={styles.wheelInner}>
                <View style={styles.spoke} />
                <View style={[styles.spoke, { transform: [{ rotate: '45deg' }] }]} />
                <View style={[styles.spoke, { transform: [{ rotate: '90deg' }] }]} />
                <View style={[styles.spoke, { transform: [{ rotate: '135deg' }] }]} />
              </View>
            </Animated.View>

            {/* 后轮 */}
            <Animated.View
              style={[
                styles.wheel,
                styles.backWheel,
                {
                  transform: [{ rotate: wheelRotate }],
                },
              ]}
            >
              <View style={styles.wheelInner}>
                <View style={styles.spoke} />
                <View style={[styles.spoke, { transform: [{ rotate: '45deg' }] }]} />
                <View style={[styles.spoke, { transform: [{ rotate: '90deg' }] }]} />
                <View style={[styles.spoke, { transform: [{ rotate: '135deg' }] }]} />
              </View>
            </Animated.View>
          </View>
        </Animated.View>

        {/* 加载文字 */}
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>{message}</Text>
          <View style={styles.dotsContainer}>
            <Animated.Text style={styles.dot}>●</Animated.Text>
            <Animated.Text style={[styles.dot, { opacity: 0.6 }]}>●</Animated.Text>
            <Animated.Text style={[styles.dot, { opacity: 0.3 }]}>●</Animated.Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  inlineContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  animationContainer: {
    width: SCREEN_WIDTH,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  road: {
    position: 'absolute',
    bottom: 60,
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(100, 100, 100, 0.3)',
  },
  roadLine: {
    position: 'absolute',
    top: -5,
    width: '100%',
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderStyle: 'dashed',
  },
  motorcycleContainer: {
    position: 'absolute',
    bottom: 50,
    width: 150,
    height: 100,
  },
  motorcycleBody: {
    position: 'absolute',
    bottom: 0,
    left: 20,
    width: 100,
    height: 50,
  },
  wheel: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2c3e50',
    borderWidth: 3,
    borderColor: '#34495e',
    bottom: -5,
  },
  frontWheel: {
    right: 0,
  },
  backWheel: {
    left: 10,
  },
  wheelInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spoke: {
    position: 'absolute',
    width: 2,
    height: '70%',
    backgroundColor: '#7f8c8d',
  },
  deliveryMan: {
    position: 'absolute',
    bottom: 35,
    left: 45,
    alignItems: 'center',
  },
  deliveryManText: {
    fontSize: 40,
  },
  helmet: {
    position: 'absolute',
    top: -15,
    left: 5,
  },
  helmetText: {
    fontSize: 20,
  },
  package: {
    position: 'absolute',
    bottom: 35,
    right: 25,
  },
  packageText: {
    fontSize: 28,
  },
  smoke: {
    position: 'absolute',
    bottom: 10,
    left: 0,
  },
  smokeText: {
    fontSize: 20,
  },
  messageContainer: {
    position: 'absolute',
    bottom: 20,
    alignItems: 'center',
  },
  messageText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    fontSize: 8,
    color: '#3b82f6',
  },
});

