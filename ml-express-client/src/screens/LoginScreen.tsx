import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { customerService } from '../services/supabase';
import { useApp } from '../contexts/AppContext';

export default function LoginScreen({ navigation }: any) {
  const { language } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const t = {
    zh: {
      title: '登录',
      email: '电子邮箱',
      password: '密码',
      loginButton: '登录',
      noAccount: '还没有账号？',
      register: '立即注册',
      emailPlaceholder: '请输入邮箱',
      passwordPlaceholder: '请输入密码',
      loginSuccess: '登录成功',
      loginFailed: '登录失败',
      fillAllFields: '请填写所有字段',
    },
    en: {
      title: 'Login',
      email: 'Email',
      password: 'Password',
      loginButton: 'Login',
      noAccount: "Don't have an account?",
      register: 'Register Now',
      emailPlaceholder: 'Enter email',
      passwordPlaceholder: 'Enter password',
      loginSuccess: 'Login successful',
      loginFailed: 'Login failed',
      fillAllFields: 'Please fill all fields',
    },
    my: {
      title: 'ဝင်ရောက်ရန်',
      email: 'အီးမေးလ်',
      password: 'စကားဝှက်',
      loginButton: 'ဝင်ရောက်',
      noAccount: 'အကောင့်မရှိသေးဘူးလား?',
      register: 'စာရင်းသွင်း',
      emailPlaceholder: 'အီးမေးလ်ထည့်ပါ',
      passwordPlaceholder: 'စကားဝှက်ထည့်ပါ',
      loginSuccess: 'အောင်မြင်စွာဝင်ရောက်ပြီး',
      loginFailed: 'ဝင်ရောက်မှုမအောင်မြင်',
      fillAllFields: 'အချက်အလက်အားလုံးဖြည့်ပါ',
    },
  };

  const currentT = t[language];

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('', currentT.fillAllFields);
      return;
    }

    setLoading(true);
    try {
      const result = await customerService.login(email, password);
      
      if (result.success && result.data) {
        await AsyncStorage.setItem('userId', result.data.id);
        await AsyncStorage.setItem('userEmail', result.data.email);
        await AsyncStorage.setItem('userName', result.data.name);
        
        Alert.alert('', currentT.loginSuccess);
        navigation.replace('Main');
      } else {
        Alert.alert('', currentT.loginFailed);
      }
    } catch (error) {
      console.error('登录错误:', error);
      Alert.alert('', currentT.loginFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>🚚</Text>
        <Text style={styles.title}>{currentT.title}</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{currentT.email}</Text>
          <TextInput
            style={styles.input}
            placeholder={currentT.emailPlaceholder}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
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
          />
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

        <View style={styles.registerPrompt}>
          <Text style={styles.registerText}>{currentT.noAccount} </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerLink}>{currentT.register}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fafc',
  },
  header: {
    backgroundColor: '#2c5282',
    padding: 40,
    paddingTop: 80,
    alignItems: 'center',
  },
  logo: {
    fontSize: 60,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  form: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: '#3182ce',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  registerPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  registerText: {
    fontSize: 16,
    color: '#666',
  },
  registerLink: {
    fontSize: 16,
    color: '#3182ce',
    fontWeight: '600',
  },
});

