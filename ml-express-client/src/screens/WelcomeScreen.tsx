import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../contexts/AppContext';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }: any) {
  const { language } = useApp();
  const [countdown, setCountdown] = useState(5);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const t = {
    zh: {
      skip: '跳过',
      welcomeTitle: '曼德勒最萌快递服务',
      welcomeSubtitle: '务喵星人为您闪电送达！',
      features: [
        '实时小猫追踪',
        '快速安全送达',
        '可爱客服体验'
      ],
      download: '扫码下载',
      start: '立即体验',
    },
    en: {
      skip: 'Skip',
      welcomeTitle: 'Mandalay\'s Cutest Delivery',
      welcomeSubtitle: 'Meow Express at Lightning Speed!',
      features: [
        'Real-time Cat Tracking',
        'Fast & Safe Delivery',
        'Lovely Service'
      ],
      download: 'Scan to Download',
      start: 'Get Started',
    },
    my: {
      skip: 'ကျော်သွားမည်',
      welcomeTitle: 'မန္တလေးမြို့၏ အချစ်စရာအကောင်းဆုံး ပို့ဆောင်ရေး',
      welcomeSubtitle: 'ကြောင်လေးများဖြင့် လျှပ်စီးလိုအမြန်ပို့ဆောင်ပေးမည်!',
      features: [
        'ကြောင်လေးများကို အချိန်နှင့်တပြေးညီ ကြည့်ရှုပါ',
        'မြန်ဆန်ပြီး လုံခြုံသော ပို့ဆောင်မှု',
        'ချစ်စရာ ဝန်ဆောင်မှု အတွေ့အကြုံ'
      ],
      download: 'ဒေါင်းလုဒ်လုပ်ရန် စကင်ဖတ်ပါ',
      start: 'စတင်လိုက်ပါ',
    },
  };

  const currentT = t[language] || t.zh;

  const navigateToNextScreen = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (userId) {
        navigation.replace('Main');
      } else {
        navigation.replace('Login');
      }
    } catch (error) {
      console.error('Navigation check failed:', error);
      navigation.replace('Login');
    }
  };

  useEffect(() => {
    // 动画效果
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // 倒计时逻辑
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigateToNextScreen();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#0f172a', '#1e293b', '#334155']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* 跳过按钮 */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={navigateToNextScreen}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>
            {currentT.skip} {countdown}s
          </Text>
        </TouchableOpacity>

        {/* 内容区域 */}
        <View style={styles.contentContainer}>
          <Animated.View
            style={[
              styles.mainVisualContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* 这里模拟海报中的猫咪快递员形象 */}
            <View style={styles.characterContainer}>
              <View style={styles.characterCircle}>
                <Image
                  source={require('../../assets/logo-large.png')}
                  style={styles.characterImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.catEmoji}>🐱</Text>
            </View>
            
            <View style={styles.titleContainer}>
              <Text style={styles.welcomeTitle}>{currentT.welcomeTitle}</Text>
              <Text style={styles.welcomeSubtitle}>{currentT.welcomeSubtitle}</Text>
            </View>
          </Animated.View>

          <Animated.View
            style={[
              styles.featuresContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {currentT.features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Text style={styles.checkIcon}>✓</Text>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </Animated.View>

          {/* 二维码区域 (模拟) */}
          <Animated.View
            style={[
              styles.qrContainer,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            <View style={styles.qrBox}>
              {/* 使用 View 模拟二维码 */}
              <View style={styles.qrCodeMock}>
                <View style={[styles.qrDot, { top: 2, left: 2 }]} />
                <View style={[styles.qrDot, { top: 2, right: 2 }]} />
                <View style={[styles.qrDot, { bottom: 2, left: 2 }]} />
                <View style={[styles.qrDot, { bottom: 8, right: 8 }]} />
                <View style={{width: 20, height: 20, backgroundColor: '#000', alignSelf: 'center', marginTop: 10}} />
              </View>
              <View style={styles.qrTextContainer}>
                <Text style={styles.qrLabel}>{currentT.download}</Text>
                <Text style={styles.qrCodeText}>#2E86AB</Text>
                <Text style={styles.qrCodeText}>#FFA726</Text>
              </View>
            </View>
          </Animated.View>
        </View>

        {/* 底部按钮 */}
        <Animated.View
          style={[
            styles.bottomContainer,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.startButton}
            onPress={navigateToNextScreen}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#f97316', '#ea580c', '#c2410c']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.startButtonText}>{currentT.start}</Text>
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
    backgroundColor: '#0f172a', // 深蓝色背景
  },
  gradient: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: StatusBar.currentHeight || 44,
  },
  skipButton: {
    position: 'absolute',
    top: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 50,
    right: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
  },
  skipText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 60,
  },
  mainVisualContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  characterContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  characterCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    borderWidth: 4,
    borderColor: '#fbbf24', // 橙色边框
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  characterImage: {
    width: '100%',
    height: '100%',
  },
  catEmoji: {
    fontSize: 40,
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 5,
    overflow: 'hidden',
    elevation: 5,
  },
  titleContainer: {
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  welcomeSubtitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fbbf24', // 橙色高亮
    textAlign: 'center',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  featuresContainer: {
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkIcon: {
    color: '#fbbf24',
    fontSize: 18,
    marginRight: 10,
    fontWeight: 'bold',
  },
  featureText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  qrContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  qrBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qrCodeMock: {
    width: 60,
    height: 60,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginRight: 16,
    position: 'relative',
    padding: 4,
  },
  qrDot: {
    width: 16,
    height: 16,
    backgroundColor: '#000',
    position: 'absolute',
  },
  qrTextContainer: {
    justifyContent: 'center',
  },
  qrLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  qrCodeText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  bottomContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    width: '100%',
  },
  startButton: {
    borderRadius: 30,
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#f97316', // 橙色按钮
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
