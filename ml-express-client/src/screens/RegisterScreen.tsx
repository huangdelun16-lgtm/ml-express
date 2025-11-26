import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { customerService } from '../services/supabase';
import { useApp } from '../contexts/AppContext';
import { useLoading } from '../contexts/LoadingContext';
import LanguageSelector from '../components/LanguageSelector';

export default function RegisterScreen({ navigation }: any) {
  const { language } = useApp();
  const { showLoading, hideLoading } = useLoading();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [address, setAddress] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);

  const t = {
    zh: {
      register: '注册',
      backToLogin: '返回登录',
      name: '姓名',
      namePlaceholder: '请输入您的姓名',
      email: '电子邮箱',
      emailPlaceholder: '请输入邮箱地址',
      phone: '手机号码',
      phonePlaceholder: '请输入手机号码',
      password: '密码',
      passwordPlaceholder: '请输入密码（至少6位）',
      confirmPassword: '确认密码',
      confirmPasswordPlaceholder: '请再次输入密码',
      address: '地址',
      addressPlaceholder: '请输入您的地址（可选）',
      registerButton: '立即注册',
      haveAccount: '已有账号？',
      login: '立即登录',
      fillAllFields: '请填写所有必填字段',
      passwordMismatch: '两次密码输入不一致',
      passwordTooShort: '密码至少需要6位',
      invalidEmail: '请输入有效的邮箱地址',
      invalidPhone: '请输入有效的手机号码',
      registerSuccess: '注册成功',
      registerSuccessMsg: '注册成功！请登录',
      registerFailed: '注册失败',
      registering: '正在注册...',
      verificationCode: '验证码',
      verificationCodePlaceholder: '请输入6位验证码',
      sendCode: '发送验证码',
      resendCode: '重新发送',
      codeSent: '验证码已发送',
      codeSentMsg: '验证码已发送到您的邮箱',
      invalidCode: '验证码错误',
      codeRequired: '请输入验证码',
      sendCodeFirst: '请先发送验证码',
    },
    en: {
      register: 'Register',
      backToLogin: 'Back to Login',
      name: 'Full Name',
      namePlaceholder: 'Enter your full name',
      email: 'Email',
      emailPlaceholder: 'Enter email address',
      phone: 'Phone Number',
      phonePlaceholder: 'Enter phone number',
      password: 'Password',
      passwordPlaceholder: 'Enter password (min 6 characters)',
      confirmPassword: 'Confirm Password',
      confirmPasswordPlaceholder: 'Re-enter password',
      address: 'Address',
      addressPlaceholder: 'Enter your address (optional)',
      registerButton: 'Register Now',
      haveAccount: 'Already have an account?',
      login: 'Login',
      fillAllFields: 'Please fill all required fields',
      passwordMismatch: 'Passwords do not match',
      passwordTooShort: 'Password must be at least 6 characters',
      invalidEmail: 'Please enter a valid email address',
      invalidPhone: 'Please enter a valid phone number',
      registerSuccess: 'Success',
      registerSuccessMsg: 'Registration successful! Please login',
      registerFailed: 'Registration Failed',
      registering: 'Registering...',
      verificationCode: 'Verification Code',
      verificationCodePlaceholder: 'Enter 6-digit code',
      sendCode: 'Send Code',
      resendCode: 'Resend',
      codeSent: 'Code Sent',
      codeSentMsg: 'Verification code sent to your email',
      invalidCode: 'Invalid code',
      codeRequired: 'Please enter verification code',
      sendCodeFirst: 'Please send verification code first',
    },
    my: {
      register: 'စာရင်းသွင်း',
      backToLogin: 'ဝင်ရောက်ရန်ပြန်သွားရန်',
      name: 'အမည်',
      namePlaceholder: 'သင့်အမည်ထည့်ပါ',
      email: 'အီးမေးလ်',
      emailPlaceholder: 'အီးမေးလ်လိပ်စာထည့်ပါ',
      phone: 'ဖုန်းနံပါတ်',
      phonePlaceholder: 'ဖုန်းနံပါတ်ထည့်ပါ',
      password: 'စကားဝှက်',
      passwordPlaceholder: 'စကားဝှက်ထည့်ပါ (အနည်းဆုံး ၆ လုံး)',
      confirmPassword: 'စကားဝှက်အတည်ပြုရန်',
      confirmPasswordPlaceholder: 'စကားဝှက်ထပ်ထည့်ပါ',
      address: 'လိပ်စာ',
      addressPlaceholder: 'သင့်လိပ်စာထည့်ပါ (ရွေးချယ်ခွင့်)',
      registerButton: 'စာရင်းသွင်းမည်',
      haveAccount: 'အကောင့်ရှိပြီးသားလား?',
      login: 'ဝင်ရောက်မည်',
      fillAllFields: 'လိုအပ်သောအချက်အလက်အားလုံးဖြည့်ပါ',
      passwordMismatch: 'စကားဝှက်များမကိုက်ညီပါ',
      passwordTooShort: 'စကားဝှက်အနည်းဆုံး ၆ လုံးရှိရမည်',
      invalidEmail: 'မှန်ကန်သောအီးမေးလ်ထည့်ပါ',
      invalidPhone: 'မှန်ကန်သောဖုန်းနံပါတ်ထည့်ပါ',
      registerSuccess: 'အောင်မြင်',
      registerSuccessMsg: 'စာရင်းသွင်းပြီးပါပြီ! ဝင်ရောက်ပါ',
      registerFailed: 'စာရင်းသွင်းမှုမအောင်မြင်',
      registering: 'စာရင်းသွင်းနေသည်...',
      verificationCode: 'အတည်ပြုကုဒ်',
      verificationCodePlaceholder: '6 လုံးကုဒ်ထည့်ပါ',
      sendCode: 'ကုဒ်ပို့ရန်',
      resendCode: 'ပြန်ပို့ရန်',
      codeSent: 'ကုဒ်ပို့ပြီးပါပြီ',
      codeSentMsg: 'အတည်ပြုကုဒ်ကို သင့်အီးမေးလ်သို့ ပို့ပြီးပါပြီ',
      invalidCode: 'ကုဒ်မှားနေပါသည်',
      codeRequired: 'အတည်ပြုကုဒ်ထည့်ပါ',
      sendCodeFirst: 'ဦးစွာ အတည်ပြုကုဒ်ပို့ပါ',
    },
  };

  const currentT = t[language];

  // 倒计时效果
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [countdown]);

  // 发送验证码
  const handleSendVerificationCode = async () => {
    if (!email) {
      Alert.alert('', currentT.invalidEmail);
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('', currentT.invalidEmail);
      return;
    }

    try {
      showLoading('发送验证码中...');
      
      // 调用邮箱验证服务
      const response = await fetch('https://market-link-express.com/.netlify/functions/send-email-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          language: language
        })
      });

      const result = await response.json();
      hideLoading();

      if (result.success) {
        setCodeSent(true);
        setCountdown(60);
        Alert.alert(currentT.codeSent, currentT.codeSentMsg);
      } else {
        Alert.alert('发送失败', result.message || '验证码发送失败');
      }
    } catch (error) {
      hideLoading();
      Alert.alert('发送失败', '网络错误，请重试');
    }
  };

  // 验证邮箱格式
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // 验证手机号格式（支持多种格式）
  const validatePhone = (phone: string) => {
    const phoneRegex = /^[0-9]{9,15}$/;
    return phoneRegex.test(phone.replace(/[\s-]/g, ''));
  };

  const handleRegister = async () => {
    // 验证必填字段
    if (!name || !email || !phone || !password || !confirmPassword) {
      Alert.alert('', currentT.fillAllFields);
      return;
    }

    // 验证邮箱格式
    if (!validateEmail(email)) {
      Alert.alert('', currentT.invalidEmail);
      return;
    }

    // 验证手机号格式
    if (!validatePhone(phone)) {
      Alert.alert('', currentT.invalidPhone);
      return;
    }

    // 验证密码长度
    if (password.length < 6) {
      Alert.alert('', currentT.passwordTooShort);
      return;
    }

    // 验证密码一致性
    if (password !== confirmPassword) {
      Alert.alert('', currentT.passwordMismatch);
      return;
    }

    // 验证验证码
    if (!verificationCode) {
      Alert.alert('', currentT.codeRequired);
      return;
    }

    if (!codeSent) {
      Alert.alert('', currentT.sendCodeFirst);
      return;
    }

    setLoading(true);
    showLoading(currentT.registering);

    try {
      // 先验证验证码
      const verifyResponse = await fetch('https://market-link-express.com/.netlify/functions/verify-email-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: verificationCode,
          language: language
        })
      });

      const verifyResult = await verifyResponse.json();
      
      if (!verifyResult.success) {
        hideLoading();
        Alert.alert(currentT.invalidCode, verifyResult.message || currentT.invalidCode);
        return;
      }

      // 验证码验证成功，继续注册
      const result = await customerService.register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password: password,
        address: address.trim(),
      });

      hideLoading();

      if (result.success) {
        Alert.alert(
          currentT.registerSuccess, 
          currentT.registerSuccessMsg,
          [
            { 
              text: 'OK', 
              onPress: () => navigation.replace('Login')
            }
          ]
        );
      } else {
        const errorMessage = result.error?.message || currentT.registerFailed;
        Alert.alert(currentT.registerFailed, errorMessage);
      }
    } catch (error: any) {
      hideLoading();
      Alert.alert(currentT.registerFailed, error.message || currentT.registerFailed);
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

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>← {currentT.backToLogin}</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{currentT.register}</Text>
          </View>

          {/* Register Form Card */}
          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{currentT.name} *</Text>
              <TextInput
                style={styles.input}
                placeholder={currentT.namePlaceholder}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{currentT.phone} *</Text>
              <TextInput
                style={styles.input}
                placeholder={currentT.phonePlaceholder}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{currentT.password} *</Text>
              <TextInput
                style={styles.input}
                placeholder={currentT.passwordPlaceholder}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{currentT.confirmPassword} *</Text>
              <TextInput
                style={styles.input}
                placeholder={currentT.confirmPasswordPlaceholder}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{currentT.email} *</Text>
              <View style={styles.emailRow}>
                <TextInput
                  style={[styles.input, styles.emailInput]}
                  placeholder={currentT.emailPlaceholder}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#9ca3af"
                />
                <TouchableOpacity
                  style={[
                    styles.sendCodeButton,
                    countdown > 0 && styles.sendCodeButtonDisabled
                  ]}
                  onPress={handleSendVerificationCode}
                  disabled={countdown > 0}
                >
                  <Text style={styles.sendCodeButtonText}>
                    {countdown > 0 ? `${countdown}s` : currentT.sendCode}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 验证码输入 */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{currentT.verificationCode} *</Text>
              <TextInput
                style={styles.input}
                placeholder={currentT.verificationCodePlaceholder}
                value={verificationCode}
                onChangeText={setVerificationCode}
                keyboardType="numeric"
                maxLength={6}
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{currentT.address}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={currentT.addressPlaceholder}
                value={address}
                onChangeText={setAddress}
                multiline
                numberOfLines={3}
                placeholderTextColor="#9ca3af"
              />
            </View>

            <TouchableOpacity
              style={styles.registerButton}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#3b82f6', '#2563eb', '#1d4ed8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.registerGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.registerButtonText}>{currentT.registerButton}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Login Prompt */}
            <View style={styles.loginPrompt}>
              <Text style={styles.loginText}>{currentT.haveAccount} </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>{currentT.login}</Text>
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
    paddingVertical: 16,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 32,
    paddingBottom: 18,
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
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
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emailInput: {
    flex: 1,
  },
  sendCodeButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 75,
    alignItems: 'center',
  },
  sendCodeButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  sendCodeButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
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
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  registerButton: {
    marginTop: 6,
    borderRadius: 10,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  registerGradient: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 18,
  },
  loginText: {
    fontSize: 14,
    color: '#64748b',
  },
  loginLink: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '700',
  },
});
