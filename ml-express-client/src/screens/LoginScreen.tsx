import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { customerService } from '../services/supabase';
import { useApp } from '../contexts/AppContext';
import { useLoading } from '../contexts/LoadingContext';
import LanguageSelector from '../components/LanguageSelector';
import { feedbackService } from '../services/FeedbackService';

export default function LoginScreen({ navigation }: any) {
  const { language } = useApp();
  const { showLoading, hideLoading } = useLoading();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      fillAllFields: '请填写邮箱/手机号和密码',
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
      fillAllFields: 'Please fill email/phone and password',
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
      fillAllFields: 'အီးမေးလ်/ဖုန်းနှင့်စကားဝှက်ဖြည့်ပါ',
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
        // 保存用户信息到本地（保存完整用户对象）
        await AsyncStorage.setItem('currentUser', JSON.stringify(result.data));
        await AsyncStorage.setItem('userId', result.data.id);
        await AsyncStorage.setItem('userEmail', result.data.email);
        await AsyncStorage.setItem('userName', result.data.name);
        await AsyncStorage.setItem('userPhone', result.data.phone);
        
        feedbackService.success(currentT.loginSuccess);
        navigation.replace('Main');
      } else {
        const errorMessage = result.error?.message || currentT.loginFailed;
        feedbackService.error(errorMessage);
      }
    } catch (error: any) {
      hideLoading();
      console.error('登录错误:', error);
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
          {/* Language Selector */}
          <LanguageSelector />

          {/* Header with Logo */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/logo-large.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            {/* <Text style={styles.welcomeText}>{currentT.welcome}</Text> */}
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.brandTitle}>
                MARKET LINK <Text style={styles.brandTitleItalic}>EXPRESS</Text>
              </Text>
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.deliveryServiceText}>DELIVERY SERVICE</Text>
                <View style={styles.dividerLine} />
              </View>
            </View>
          </View>

          {/* Login Form Card */}
          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{currentT.email}</Text>
              <TextInput
                style={styles.input}
                placeholder={currentT.emailPlaceholder}
                value={email}
                onChangeText={setEmail}
                keyboardType="default"
                autoCapitalize="none"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{currentT.password}</Text>
              <TextInput
                style={styles.input}
                placeholder={currentT.passwordPlaceholder}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholderTextColor="#9ca3af"
              />
            </View>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#3b82f6', '#2563eb', '#1d4ed8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginButtonText}>{currentT.loginButton}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Register Prompt */}
            <View style={styles.registerPrompt}>
              <Text style={styles.registerText}>{currentT.noAccount} </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.registerLink}>{currentT.register}</Text>
              </TouchableOpacity>
            </View>
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
    justifyContent: 'center',
    paddingVertical: 30,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 0.5,
  },
  brandTitleItalic: {
    fontStyle: 'italic',
    color: '#f59e0b', // Gold/Amber color
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 10,
  },
  dividerLine: {
    width: 30,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  deliveryServiceText: {
    fontSize: 12,
    fontWeight: '700',
    fontStyle: 'italic',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 2,
  },
  logoContainer: {
    width: 83,
    height: 83,
    borderRadius: 41.5,
    backgroundColor: '#ffffff',
    padding: 10,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  welcomeText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 3,
    fontWeight: '500',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 18,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: '#1e293b',
  },
  loginButton: {
    marginTop: 6,
    borderRadius: 10,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginGradient: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 18,
  },
  registerText: {
    fontSize: 14,
    color: '#64748b',
  },
  registerLink: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '700',
  },
});
