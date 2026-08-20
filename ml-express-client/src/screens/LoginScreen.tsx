import React, { useState } from 'react';
import LoggerService from './../services/LoggerService';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { customerService, supabase } from '../services/supabase';
import { useApp } from '../contexts/AppContext';
import { useLoading } from '../contexts/LoadingContext';
import { feedbackService } from '../services/FeedbackService';
import { persistUserAvatarUrl } from '../utils/userAvatar';
import { enterGuestMode, clearGuestMode } from '../utils/guestSession';
import { APP_CONFIG } from '../config/constants';
import LanguageSelector from '../components/LanguageSelector';
import BrandRider from '../components/BrandRider';

const TEAL = '#2C98A6';
const TEAL_PRESSED = '#238089';
const NAVY = '#1A2B48';
const MUTED = '#8A94A6';
const PAGE = '#E8F4FA';
const BORDER = '#E2E8F0';
const WHITE = '#FFFFFF';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export default function LoginScreen({ navigation }: any) {
  const { language, refreshSession, setIsGuest } = useApp();
  const { showLoading, hideLoading } = useLoading();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [loading, setLoading] = useState(false);

  const t = {
    zh: {
      heroTitle1: '同城闪送',
      heroTitle2: '30分钟到家',
      featFast: '极速送达',
      featSafe: '安全可靠',
      featCare: '贴心服务',
      welcome: '欢迎回来',
      subtitle: '登录后追踪订单、快速下单',
      emailPlaceholder: '邮箱或手机号',
      passwordPlaceholder: '密码',
      keepSignedIn: '保持登录状态',
      forgotPassword: '忘记密码？',
      loginButton: '登录',
      or: '或',
      browseGuest: '暂不登录，先逛逛',
      noAccount: '还没有账号？',
      register: '立即注册',
      loginSuccess: '登录成功',
      loginFailed: '登录失败',
      fillAllFields: '请填写完整信息',
      loggingIn: '正在登录...',
      forgotTitle: '重置密码',
      forgotBody: `请使用注册手机号联系客服重置密码：\n${APP_CONFIG.CONTACT.PHONE_DISPLAY}`,
      forgotOk: '知道了',
    },
    en: {
      heroTitle1: 'Flash delivery',
      heroTitle2: 'Home in 30 min',
      featFast: 'Fast delivery',
      featSafe: 'Safe & reliable',
      featCare: 'Careful service',
      welcome: 'Welcome back',
      subtitle: 'Log in to track orders and checkout faster',
      emailPlaceholder: 'Email or phone number',
      passwordPlaceholder: 'Password',
      keepSignedIn: 'Keep me signed in',
      forgotPassword: 'Forgot password?',
      loginButton: 'Login',
      or: 'or',
      browseGuest: 'Browse without signing in',
      noAccount: "Don't have an account? ",
      register: 'Sign up now',
      loginSuccess: 'Login successful',
      loginFailed: 'Login failed',
      fillAllFields: 'Please fill all fields',
      loggingIn: 'Logging in...',
      forgotTitle: 'Reset password',
      forgotBody: `Contact support with your registered phone to reset:\n${APP_CONFIG.CONTACT.PHONE_DISPLAY}`,
      forgotOk: 'OK',
    },
    my: {
      heroTitle1: 'မြို့တွင်းအမြန်ပို့',
      heroTitle2: 'မိနစ် ၃၀ အိမ်ရောက်',
      featFast: 'အမြန်ပို့',
      featSafe: 'လုံခြုံစိတ်ချ',
      featCare: 'ဂရုစိုက်ဝန်ဆောင်မှု',
      welcome: 'ပြန်လည်ကြိုဆိုပါတယ်',
      subtitle: 'ဝင်ရောက်ပြီး အော်ဒါလိုက်၊ အမြန်မှာယူပါ',
      emailPlaceholder: 'အီးမေးလ် သို့မဟုတ် ဖုန်း',
      passwordPlaceholder: 'စကားဝှက်',
      keepSignedIn: 'လော့အင်ထားမည်',
      forgotPassword: 'စကားဝှက်မေ့?',
      loginButton: 'ဝင်ရောက်',
      or: 'သို့မဟုတ်',
      browseGuest: 'မဝင်ဘဲ အရင်လှည့်ကြည့်မည်',
      noAccount: 'အကောင့်မရှိသေးဘူးလား? ',
      register: 'စာရင်းသွင်း',
      loginSuccess: 'အောင်မြင်စွာဝင်ရောက်ပြီး',
      loginFailed: 'ဝင်ရောက်မှုမအောင်မြင်',
      fillAllFields: 'အချက်အလက်များဖြည့်ပါ',
      loggingIn: 'ဝင်ရောက်နေသည်...',
      forgotTitle: 'စကားဝှက်ပြန်သတ်',
      forgotBody: `မှတ်ပုံတင်ဖုန်းဖြင့် ဝန်ဆောင်မှုဆက်သွယ်ပါ:\n${APP_CONFIG.CONTACT.PHONE_DISPLAY}`,
      forgotOk: 'OK',
    },
  };

  const currentT = t[language];
  const heroMinHeight = Math.max(300, Math.round(SCREEN_H * 0.42));
  const riderW = Math.round(Math.min(228, SCREEN_W * 0.56));

  const handleBrowseAsGuest = async () => {
    try {
      await enterGuestMode(setIsGuest);
      navigation.replace('Main');
    } catch (error) {
      LoggerService.error('进入访客模式失败:', error);
      feedbackService.error(currentT.loginFailed);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(currentT.forgotTitle, currentT.forgotBody, [{ text: currentT.forgotOk }]);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      feedbackService.warning(currentT.fillAllFields);
      return;
    }

    setLoading(true);
    showLoading(currentT.loggingIn);

    try {
      const result = await customerService.login(email.trim(), password);
      hideLoading();

      if (result.success && result.data) {
        const newSessionId = `SESS_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        await AsyncStorage.setItem('ml_keep_signed_in', keepSignedIn ? 'true' : 'false');
        await AsyncStorage.setItem('currentUser', JSON.stringify(result.data));
        await AsyncStorage.setItem('userId', result.data.id);
        await AsyncStorage.setItem('userEmail', result.data.email);
        await AsyncStorage.setItem('userName', result.data.name);
        await AsyncStorage.setItem('userPhone', result.data.phone);
        await AsyncStorage.setItem('userType', 'customer');
        await AsyncStorage.setItem('currentSessionId', newSessionId);
        await persistUserAvatarUrl(result.data.id, result.data.avatar_url || '');
        await clearGuestMode(setIsGuest);

        void supabase
          .from('users')
          .update({ current_session_id: newSessionId })
          .eq('id', result.data.id)
          .then(({ error }) => {
            if (error) LoggerService.warn('更新 current_session_id 失败:', error.message);
          });

        await refreshSession();

        try {
          const NotificationService = require('../services/notificationService').default;
          const ns = NotificationService.getInstance();
          const token = await ns.getExpoPushToken();
          if (token) {
            await ns.savePushTokenToSupabase(result.data.id, token);
          }
        } catch (nsError) {
          console.warn('推送注册失败，但不影响登录:', nsError);
        }

        feedbackService.success(currentT.loginSuccess);
        navigation.replace('Main');
      } else {
        feedbackService.error(result.error?.message || currentT.loginFailed);
      }
    } catch (error: any) {
      hideLoading();
      LoggerService.error('登录错误:', error);
      feedbackService.error(error.message || currentT.loginFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#C5EAF4', '#E8F4FA', '#FFFFFF']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { minHeight: SCREEN_H }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.hero, { minHeight: heroMinHeight, paddingTop: insets.top + 8 }]}>
            <View style={styles.topRow}>
              <View style={styles.brand}>
                <Image
                  source={require('../../assets/login-logo.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
                <View style={styles.brandText}>
                  <Text style={styles.brandName}>MARKET LINK</Text>
                  <Text style={styles.brandSub}>EXPRESS</Text>
                </View>
              </View>
              <LanguageSelector position="relative" variant="pills" />
            </View>

            <Text style={styles.h1}>{currentT.heroTitle1}</Text>
            <Text style={styles.h1}>{currentT.heroTitle2}</Text>
            <View style={styles.feats}>
              <View style={styles.feat}>
                <View style={styles.featIcon}>
                  <Ionicons name="flash" size={11} color={WHITE} />
                </View>
                <Text style={styles.featTxt}>{currentT.featFast}</Text>
              </View>
              <View style={styles.feat}>
                <View style={styles.featIcon}>
                  <Ionicons name="shield-checkmark" size={11} color={WHITE} />
                </View>
                <Text style={styles.featTxt}>{currentT.featSafe}</Text>
              </View>
              <View style={styles.feat}>
                <View style={styles.featIcon}>
                  <Ionicons name="thumbs-up" size={11} color={WHITE} />
                </View>
                <Text style={styles.featTxt}>{currentT.featCare}</Text>
              </View>
            </View>

            <View style={styles.heroRider} pointerEvents="none">
              <BrandRider width={riderW} />
            </View>
          </View>

          <View style={[styles.sheet, { paddingBottom: Math.max(20, insets.bottom + 8) }]}>
            <Text style={styles.welcome}>{currentT.welcome}</Text>
            <Text style={styles.lead}>{currentT.subtitle}</Text>

            <View style={styles.field}>
              <Ionicons name="mail-outline" size={20} color={TEAL} />
              <TextInput
                style={styles.input}
                placeholder={currentT.emailPlaceholder}
                placeholderTextColor={MUTED}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            <View style={styles.field}>
              <Ionicons name="lock-closed-outline" size={20} color={TEAL} />
              <TextInput
                style={styles.input}
                placeholder={currentT.passwordPlaceholder}
                placeholderTextColor={MUTED}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={MUTED}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.metaRow}>
              <TouchableOpacity
                style={styles.keep}
                onPress={() => setKeepSignedIn((v) => !v)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: keepSignedIn }}
              >
                <View style={[styles.box, keepSignedIn && styles.boxOn]}>
                  {keepSignedIn ? <Ionicons name="checkmark" size={12} color={WHITE} /> : null}
                </View>
                <Text style={styles.keepTxt}>{currentT.keepSignedIn}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleForgotPassword}>
                <Text style={styles.link}>{currentT.forgotPassword}</Text>
              </TouchableOpacity>
            </View>

            <Pressable
              onPress={handleLogin}
              disabled={loading}
              style={({ pressed }) => [
                styles.primary,
                pressed && styles.primaryPressed,
                loading && styles.primaryDisabled,
              ]}
            >
              {loading ? (
                <ActivityIndicator color={WHITE} />
              ) : (
                <Text style={styles.primaryTxt}>{currentT.loginButton}</Text>
              )}
            </Pressable>

            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Text style={styles.or}>{currentT.or}</Text>
              <View style={styles.orLine} />
            </View>

            <TouchableOpacity
              style={styles.ghost}
              onPress={handleBrowseAsGuest}
              disabled={loading}
            >
              <Text style={styles.ghostTxt}>{currentT.browseGuest}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.signup}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.signupTxt}>
                {currentT.noAccount}
                <Text style={styles.signupEm}>{currentT.register}</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PAGE,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
  },
  hero: {
    paddingHorizontal: 20,
    overflow: 'visible',
    zIndex: 1,
  },
  heroRider: {
    position: 'absolute',
    right: -10,
    bottom: -48,
    zIndex: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
    gap: 8,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  logo: {
    width: 42,
    height: 42,
  },
  brandText: {
    marginLeft: 8,
    flexShrink: 1,
  },
  brandName: {
    color: NAVY,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  brandSub: {
    marginTop: 1,
    color: NAVY,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.4,
  },
  h1: {
    color: NAVY,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 34,
    maxWidth: '58%',
  },
  feats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    maxWidth: '64%',
  },
  feat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  featIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featTxt: {
    color: '#5B6B7C',
    fontSize: 11,
    fontWeight: '600',
  },
  sheet: {
    flexGrow: 1,
    marginTop: -6,
    backgroundColor: WHITE,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 24,
    paddingTop: 26,
    shadowColor: '#1A2B48',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 3,
  },
  welcome: {
    color: NAVY,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  lead: {
    marginTop: 6,
    marginBottom: 22,
    color: MUTED,
    fontSize: 13,
    lineHeight: 18,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    marginBottom: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    paddingVertical: 0,
    fontSize: 16,
    color: NAVY,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
    marginTop: 4,
  },
  keep: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  box: {
    width: 18,
    height: 18,
    marginRight: 8,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHITE,
  },
  boxOn: {
    backgroundColor: TEAL,
  },
  keepTxt: {
    color: TEAL,
    fontSize: 13,
    fontWeight: '600',
  },
  link: {
    color: TEAL,
    fontSize: 13,
    fontWeight: '600',
  },
  primary: {
    height: 52,
    borderRadius: 16,
    backgroundColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryPressed: {
    backgroundColor: TEAL_PRESSED,
  },
  primaryDisabled: {
    opacity: 0.75,
  },
  primaryTxt: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '700',
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  orLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
  },
  or: {
    marginHorizontal: 12,
    color: MUTED,
    fontSize: 12,
  },
  ghost: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHITE,
  },
  ghostTxt: {
    color: TEAL,
    fontSize: 15,
    fontWeight: '700',
  },
  signup: {
    marginTop: 18,
    alignItems: 'center',
  },
  signupTxt: {
    color: MUTED,
    fontSize: 14,
  },
  signupEm: {
    color: TEAL,
    fontWeight: '700',
  },
});
