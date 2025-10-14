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
      guestMode: '访客模式',
      noAccount: '还没有账号？',
      register: '立即注册',
      emailPlaceholder: '请输入邮箱或手机号',
      passwordPlaceholder: '请输入密码',
      loginSuccess: '登录成功',
      loginFailed: '登录失败',
      fillAllFields: '请填写邮箱/手机号和密码',
      guestModeDesc: '以访客身份浏览',
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
      guestMode: 'Guest Mode',
      noAccount: "Don't have an account?",
      register: 'Register Now',
      emailPlaceholder: 'Enter email or phone number',
      passwordPlaceholder: 'Enter password',
      loginSuccess: 'Login successful',
      loginFailed: 'Login failed',
      fillAllFields: 'Please fill email/phone and password',
      guestModeDesc: 'Browse as guest',
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
      guestMode: 'ဧည့်သည်မုဒ်',
      noAccount: 'အကောင့်မရှိသေးဘူးလား?',
      register: 'စာရင်းသွင်း',
      emailPlaceholder: 'အီးမေးလ် သို့မဟုတ် ဖုန်းနံပါတ်ထည့်ပါ',
      passwordPlaceholder: 'စကားဝှက်ထည့်ပါ',
      loginSuccess: 'အောင်မြင်စွာဝင်ရောက်ပြီး',
      loginFailed: 'ဝင်ရောက်မှုမအောင်မြင်',
      fillAllFields: 'အီးမေးလ်/ဖုန်းနှင့်စကားဝှက်ဖြည့်ပါ',
      guestModeDesc: 'ဧည့်သည်အနေဖြင့်ကြည့်ရှုရန်',
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
      Alert.alert('', currentT.fillAllFields);
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
        
        navigation.replace('Main');
      } else {
        const errorMessage = result.error?.message || currentT.loginFailed;
        Alert.alert(currentT.loginFailed, errorMessage);
      }
    } catch (error: any) {
      hideLoading();
      console.error('登录错误:', error);
      Alert.alert(currentT.loginFailed, error.message || currentT.loginFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestMode = async () => {
    try {
      // 保存访客信息
      const guestUser = {
        id: 'guest',
        name: '访客用户',
        email: '',
        phone: '',
        user_type: 'guest',
      };
      await AsyncStorage.setItem('currentUser', JSON.stringify(guestUser));
      await AsyncStorage.setItem('userId', 'guest');
      await AsyncStorage.setItem('isGuest', 'true');
      navigation.replace('Main');
    } catch (error) {
      console.error('访客模式错误:', error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
            <Text style={styles.welcomeText}>{currentT.welcome}</Text>
            <Text style={styles.title}>{currentT.title}</Text>
            <Text style={styles.subtitle}>{currentT.subtitle}</Text>
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
                keyboardType="email-address"
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

            {/* Guest Mode Button */}
            <TouchableOpacity
              style={styles.guestButton}
              onPress={handleGuestMode}
              activeOpacity={0.8}
            >
              <Text style={styles.guestIcon}>👤</Text>
              <View>
                <Text style={styles.guestButtonText}>{currentT.guestMode}</Text>
                <Text style={styles.guestButtonDesc}>{currentT.guestModeDesc}</Text>
              </View>
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
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ffffff',
    padding: 12,
    marginBottom: 20,
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
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
    fontWeight: '500',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1e293b',
  },
  loginButton: {
    marginTop: 8,
    borderRadius: 12,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginGradient: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  guestIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  guestButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
  guestButtonDesc: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  registerPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  registerText: {
    fontSize: 15,
    color: '#64748b',
  },
  registerLink: {
    fontSize: 15,
    color: '#3b82f6',
    fontWeight: '700',
  },
});
