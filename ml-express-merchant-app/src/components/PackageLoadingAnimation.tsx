import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';

interface PackageLoadingAnimationProps {
  size?: 'small' | 'medium' | 'large';
  showOverlay?: boolean;
  message?: string;
}

const TEAL = '#2C98A6';
const NAVY = '#1A2B48';

const SIZE_MAP = {
  small: 104,
  medium: 148,
  large: 168,
};

const PackageLoadingAnimation: React.FC<PackageLoadingAnimationProps> = ({
  size = 'medium',
  showOverlay = false,
  message = '加载中...',
}) => {
  const imgSize = SIZE_MAP[size];
  const bounce = useRef(new Animated.Value(0)).current;
  const dotAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    const bounceLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bounce, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const dotLoops = dotAnims.map((anim, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 180),
          Animated.timing(anim, {
            toValue: 1,
            duration: 420,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 420,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.delay((2 - index) * 180),
        ])
      )
    );

    bounceLoop.start();
    dotLoops.forEach((loop) => loop.start());

    return () => {
      bounceLoop.stop();
      dotLoops.forEach((loop) => loop.stop());
      bounce.stopAnimation();
      dotAnims.forEach((anim) => anim.stopAnimation());
    };
  }, [bounce, dotAnims]);

  const translateY = bounce.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });
  const scale = bounce.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.04],
  });
  const art = (
    <View style={[styles.stage, { width: imgSize, height: imgSize }]}>
      <Animated.Image
        source={require('../../assets/loading-scooter.png')}
        style={{
          width: imgSize,
          height: imgSize,
          transform: [{ translateY }, { scale }],
        }}
        resizeMode="contain"
      />
    </View>
  );

  const body = (
    <>
      {art}
      <Text style={styles.message}>{message}</Text>
      <View style={styles.dots}>
        {dotAnims.map((anim, index) => (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                opacity: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.28, 1],
                }),
                transform: [
                  {
                    scale: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.85, 1.2],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
    </>
  );

  if (!showOverlay) {
    return <View style={styles.inline}>{body}</View>;
  }

  return (
    <View style={styles.overlayWrap} pointerEvents="auto">
      <View style={styles.overlay} />
      <View style={styles.card}>{body}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlayWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(232,244,250,0.72)',
  },
  card: {
    width: 220,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingTop: 22,
    paddingBottom: 22,
    paddingHorizontal: 16,
    shadowColor: '#1A2B48',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 10,
    zIndex: 1,
  },
  inline: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    backgroundColor: '#FFFFFF',
  },
  message: {
    marginTop: 4,
    color: NAVY,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: TEAL,
  },
});

export default PackageLoadingAnimation;
