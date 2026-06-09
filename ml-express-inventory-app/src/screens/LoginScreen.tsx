import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen() {
  const { hasPin, login, setupPin } = useAuth();
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setLoading(true);
    try {
      if (!hasPin) {
        if (pin !== confirmPin) {
          Alert.alert('提示', '两次 PIN 不一致');
          return;
        }
        await setupPin(name, pin);
      } else {
        const ok = await login(name, pin);
        if (!ok) Alert.alert('登录失败', 'PIN 不正确');
      }
    } catch (e: unknown) {
      Alert.alert('错误', e instanceof Error ? e.message : '请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.logo}>📦 ML Inventory</Text>
      <Text style={styles.sub}>平台库存 · 独立运行</Text>
      <View style={styles.card}>
        <Text style={styles.title}>{hasPin ? '工作人员登录' : '首次设置'}</Text>
        <TextInput
          style={styles.input}
          placeholder="姓名"
          placeholderTextColor="#94a3b8"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="PIN（至少 4 位）"
          placeholderTextColor="#94a3b8"
          secureTextEntry
          keyboardType="number-pad"
          value={pin}
          onChangeText={setPin}
        />
        {!hasPin ? (
          <TextInput
            style={styles.input}
            placeholder="确认 PIN"
            placeholderTextColor="#94a3b8"
            secureTextEntry
            keyboardType="number-pad"
            value={confirmPin}
            onChangeText={setConfirmPin}
          />
        ) : null}
        <Pressable style={styles.btn} onPress={onSubmit} disabled={loading}>
          <Text style={styles.btnText}>{hasPin ? '进入' : '创建并进入'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    padding: 24,
  },
  logo: { color: '#f8fafc', fontSize: 28, fontWeight: '900', textAlign: 'center' },
  sub: { color: '#94a3b8', textAlign: 'center', marginBottom: 32, marginTop: 8 },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  title: { color: '#f8fafc', fontSize: 18, fontWeight: '800', marginBottom: 16 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
  },
  btn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
