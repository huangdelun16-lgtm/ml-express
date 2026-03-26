import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

interface FadeInViewProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  style?: any;
}

export const FadeInView: React.FC<FadeInViewProps> = ({ 
  children, 
  delay = 0, 
  duration = 300,
  style 
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration,
          delay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration,
          delay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [fadeAnim, slideAnim, delay, duration]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

interface ScaleInViewProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  style?: any;
}

export const ScaleInView: React.FC<ScaleInViewProps> = ({ 
  children, 
  delay = 0, 
  duration = 300,
  style 
}) => {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration,
          delay,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration,
          delay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [scaleAnim, fadeAnim, delay, duration]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

interface PulseViewProps {
  children: React.ReactNode;
  style?: any;
}

export const PulseView: React.FC<PulseViewProps> = ({ children, style }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };

    pulse();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [{ scale: pulseAnim }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

interface ShakeViewProps {
  children: React.ReactNode;
  trigger?: boolean;
  style?: any;
}

export const ShakeView: React.FC<ShakeViewProps> = ({ 
  children, 
  trigger = false,
  style 
}) => {
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (trigger) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
      ]).start();
    }
  }, [trigger, shakeAnim]);

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [{ translateX: shakeAnim }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

