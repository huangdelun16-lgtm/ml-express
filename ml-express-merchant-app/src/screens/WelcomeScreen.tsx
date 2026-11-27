import React, { useEffect, useState, useRef, useCallback } from 'react';
import LoggerService from '../services/LoggerService';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../contexts/AppContext';
import { welcomeScreenService, WelcomeScreen as WelcomeScreenData } from '../services/supabase';

function backgroundIsLight(start?: string | null, end?: string | null): boolean {
  const pick = (start || end || '').trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(pick)) return false;
  const r = parseInt(pick.slice(0, 2), 16);
  const g = parseInt(pick.slice(2, 4), 16);
  const b = parseInt(pick.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62;
}

export default function WelcomeScreen({ navigation }: any) {
  const { language, enableRealtimeAfterSplash } = useApp();
  const insets = useSafeAreaInsets();
  const [countdown, setCountdown] = useState(5);
  const [dynamicScreen, setDynamicScreen] = useState<WelcomeScreenData | null>(null);
  const leavingRef = useRef(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  const t = {
    zh: {
      skip: '跳过',
      welcomeTitle: '欢迎使用',
      description: '快速、安全、可靠的同城配送',
      start: '进入商家端',
      role: '商家端',
    },
    en: {
      skip: 'Skip',
      welcomeTitle: 'Welcome',
      description: 'Fast, safe, same-city delivery',
      start: 'Continue',
      role: 'Merchants',
    },
    my: {
      skip: 'ကျော်သွားမည်',
      welcomeTitle: 'ကြိုဆိုပါတယ်',
      description: 'မြန်ဆန်၊ ဘေးကင်းသော ပို့ဆောင်ရေး',
      start: 'ဆက်သွားမည်',
      role: 'ကုန်သည်',
    },
  };

  const currentT = t[language] || t.zh;
  const lightInk = dynamicScreen
    ? backgroundIsLight(dynamicScreen.bg_color_start, dynamicScreen.bg_color_end)
    : false;
  const ink = lightInk ? '#0f172a' : '#f8fafc';
  const muted = lightInk ? '#475569' : '#94a3b8';
  const accent = lightInk ? '#1d4ed8' : '#7dd3fc';

  useEffect(() => {
    const loadDynamicContent = async () => {
      try {
        const screen = await welcomeScreenService.getActiveWelcomeScreen();
        if (screen) {
          setDynamicScreen(screen);
        }
      } catch (error) {
        console.warn('Failed to load dynamic welcome screen');
      }
    };
    void loadDynamicContent();
  }, []);

  const navigateToNextScreen = useCallback(async () => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (userId) {
        void enableRealtimeAfterSplash();
        navigation.replace('Main');
      } else {
        navigation.replace('Login');
      }
    } catch (error) {
      leavingRef.current = false;
      LoggerService.error('Navigation check failed:', error);
      navigation.replace('Login');
    }
  }, [enableRealtimeAfterSplash, navigation]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    if (countdown > 0) return;
    void navigateToNextScreen();
  }, [countdown, navigateToNextScreen]);

  const title = dynamicScreen
    ? language === 'zh'
      ? dynamicScreen.title_zh
      : language === 'en'
        ? dynamicScreen.title_en || dynamicScreen.title_zh
        : dynamicScreen.title_my || dynamicScreen.title_zh
    : currentT.welcomeTitle;
  const description = dynamicScreen
    ? language === 'zh'
      ? dynamicScreen.description_zh
      : language === 'en'
        ? dynamicScreen.description_en || dynamicScreen.description_zh
        : dynamicScreen.description_my || dynamicScreen.description_zh
    : currentT.description;
  const buttonText = dynamicScreen
    ? language === 'zh'
      ? dynamicScreen.button_text_zh
      : language === 'en'
        ? dynamicScreen.button_text_en || dynamicScreen.button_text_zh
        : dynamicScreen.button_text_my || dynamicScreen.button_text_zh
    : currentT.start;

  return (
    <View style={styles.container}>
      <StatusBar barStyle={lightInk ? 'dark-content' : 'light-content'} />

      <LinearGradient
        colors={
          dynamicScreen
            ? [dynamicScreen.bg_color_start || '#0f172a', dynamicScreen.bg_color_end || '#1e293b']
            : ['#0f172a', '#162032', '#0f172a']
        }
        style={styles.gradient}
      >
        <TouchableOpacity
          style={[styles.skipButton, { top: insets.top + 12 }]}
          onPress={navigateToNextScreen}
          activeOpacity={0.7}
          hitSlop={8}
        >
          <Text style={[styles.skipText, { color: muted }]}>
            {currentT.skip} {countdown}s
          </Text>
        </TouchableOpacity>

        <View style={styles.contentContainer}>
          <Animated.View style={[styles.logoPlate, { opacity: fadeAnim }]}>
            <Image
              source={
                dynamicScreen?.image_url
                  ? { uri: dynamicScreen.image_url }
                  : require('../../assets/logo-large.png')
              }
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.textContainer,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <Text style={[styles.role, { color: accent }]}>{currentT.role}</Text>
            <Text style={[styles.welcomeTitle, { color: ink }]}>{title}</Text>
            <Text style={[styles.brandName, { color: ink }]}>MARKET LINK</Text>
            <Text style={[styles.brandExpress, { color: accent }]}>EXPRESS</Text>
            <Text style={[styles.description, { color: muted }]}>{description}</Text>
          </Animated.View>
        </View>

        <Animated.View
          style={[
            styles.bottomContainer,
            {
              opacity: fadeAnim,
              paddingBottom: Math.max(insets.bottom, 20) + 16,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.startButton}
            onPress={navigateToNextScreen}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={
                dynamicScreen?.button_color_start
                  ? [dynamicScreen.button_color_start, dynamicScreen.button_color_end || dynamicScreen.button_color_start]
                  : ['#3b82f6', '#2563eb']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.startButtonText}>{buttonText}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  gradient: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoPlate: {
    width: 112,
    height: 112,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 8,
  },
  logo: {
    width: 72,
    height: 72,
  },
  textContainer: {
    alignItems: 'center',
    width: '100%',
  },
  role: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  welcomeTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 14,
  },
  brandName: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  brandExpress: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 3,
  },
  description: {
    marginTop: 22,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
    textAlign: 'center',
    maxWidth: 280,
  },
  bottomContainer: {
    paddingHorizontal: 28,
    width: '100%',
  },
  startButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  buttonGradient: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
