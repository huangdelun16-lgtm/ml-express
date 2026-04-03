import React, { useState } from 'react';
import LoggerService from './../services/LoggerService';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Image, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { customerService, supabase } from '../services/supabase';
import { useApp } from '../contexts/AppContext';
import { useLoading } from '../contexts/LoadingContext';
import LanguageSelector from '../components/LanguageSelector';
import { feedbackService } from '../services/FeedbackService';

export default function LoginScreen({ navigation }: any) {
  const { language, refreshSession } = useApp();
  const { showLoading, hideLoading } = useLoading();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const t = {
    zh: {
      welcome: '欢迎回来',
      title: '登录',
      subtitle: '登录您的账户继续使用服务',
      email: '邮箱/手机号',
      password: '密码',
      loginButton: '登录',
      noAccount: '还没有账号？',
      register: '立即注册',
      emailPlaceholder: '请输入注册时的邮箱或手机号',
      passwordPlaceholder: '请输入密码',
      loginSuccess: '登录成功',
      loginFailed: '登录失败',
      fillAllFields: '请填写完整信息',
      loggingIn: '正在登录...',
      language: '语言',
      languageChinese: '中文',
      languageEnglish: 'English',
      languageBurmese: 'မြန်မာ',
    },
    en: {
      welcome: 'Welcome Back',
      title: 'Login',
      subtitle: 'Sign in to your account to continue',
      email: 'Email/Phone',
      password: 'Password',
      loginButton: 'Login',
      noAccount: "Don't have an account?",
      register: 'Register Now',
      emailPlaceholder: 'Enter registered email or phone',
      passwordPlaceholder: 'Enter password',
      loginSuccess: 'Login successful',
      loginFailed: 'Login failed',
      fillAllFields: 'Please fill all fields',
      loggingIn: 'Logging in...',
      language: 'Language',
      languageChinese: '中文',
      languageEnglish: 'English',
      languageBurmese: 'မြန်မာ',
    },
    my: {
      welcome: 'ပြန်လည်ကြိုဆိုပါတယ်',
      title: 'ဝင်ရောက်ရန်',
      subtitle: 'သင့်အကောင့်သို့ဝင်ရောက်ပါ',
      email: 'အီးမေးလ်/ဖုန်း',
      password: 'စကားဝှက်',
      loginButton: 'ဝင်ရောက်',
      noAccount: 'အကောင့်မရှိသေးဘူးလား?',
      register: 'စာရင်းသွင်း',
      emailPlaceholder: 'မှတ်ပုံတင်ထားသော အီးမေးလ် သို့မဟုတ် ဖုန်းနံပါတ်ထည့်ပါ',
      passwordPlaceholder: 'စကားဝှက်ထည့်ပါ',
      loginSuccess: 'အောင်မြင်စွာဝင်ရောက်ပြီး',
      loginFailed: 'ဝင်ရောက်မှုမအောင်မြင်',
      fillAllFields: 'အချက်အလက်များဖြည့်ပါ',
      loggingIn: 'ဝင်ရောက်နေသည်...',
      language: 'ဘာသာစကား',
      languageChinese: '中文',
      languageEnglish: 'English',
      languageBurmese: 'မြန်မာ',
    },
  };

  const currentT = t[language];

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

        await supabase.from('users').update({ current_session_id: newSessionId }).eq('id', result.data.id);

        await AsyncStorage.setItem('currentUser', JSON.stringify(result.data));
        await AsyncStorage.setItem('userId', result.data.id);
        await AsyncStorage.setItem('userEmail', result.data.email);
        await AsyncStorage.setItem('userName', result.data.name);
        await AsyncStorage.setItem('userPhone', result.data.phone);
        await AsyncStorage.setItem('userType', 'customer');
        await AsyncStorage.setItem('currentSessionId', newSessionId);

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
        const errorMessage = result.error?.message || currentT.loginFailed;
        feedbackService.error(errorMessage);
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={['#b0d3e8', '#a2c3d6', '#93b4c5', '#86a4b4', '#7895a3']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <LanguageSelector />

          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <View style={styles.appTitleContainer}>
              <Text style={styles.appTitleMain}>MARKET LINK </Text>
              <Text style={styles.appTitleExpress}>EXPRESS</Text>
            </View>
            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.dividerText}>DELIVERY SERVICE</Text>
              <View style={styles.line} />
            </View>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{currentT.email}</Text>
              <TextInput
                style={styles.input}
                placeholder={currentT.emailPlaceholder}
                placeholderTextColor="#A0AEC0"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{currentT.password}</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder={currentT.passwordPlaceholder}
                  placeholderTextColor="#A0AEC0"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.passwordIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={24}
                    color="#A0AEC0"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>{currentT.loginButton}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.registerLink}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.registerText}>
                {currentT.noAccount} <Text style={styles.registerHighlight}>{currentT.register}</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
    width: '100%',
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  appTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  appTitleMain: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  appTitleExpress: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 1,
    fontStyle: 'italic',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '80%',
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  dividerText: {
    color: '#fff',
    marginHorizontal: 10,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2,
    fontStyle: 'italic',
  },
  formContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#2D3748',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#2D3748',
  },
  passwordIcon: {
    padding: 10,
  },
  loginButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#2563EB',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  registerLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  registerText: {
    color: '#718096',
    fontSize: 14,
  },
  registerHighlight: {
    color: '#2563EB',
    fontWeight: 'bold',
  },
});
