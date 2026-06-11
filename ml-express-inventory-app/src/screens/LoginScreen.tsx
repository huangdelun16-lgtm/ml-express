import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { getSupabaseConfigHint, isSupabaseConfigured } from '../services/supabase';

export default function LoginScreen() {
  const { login } = useAuth();
  const [storeCode, setStoreCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async () => {
    setError('');
    if (!storeCode.trim() || !password.trim()) {
      setError('请填写店铺代码和密码');
      return;
    }
    setLoading(true);
    try {
      await login(storeCode.trim().toUpperCase(), password);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const configured = isSupabaseConfigured();
  const configHint = getSupabaseConfigHint();

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <View style={styles.hero}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoEmoji}>📦</Text>
          </View>
          <Text style={styles.brand}>ML Inventory</Text>
          <Text style={styles.tagline}>中转站库存管理</Text>
          <View style={styles.pill}>
            <Text style={styles.pillText}>仅中转站合伙店铺可登录</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>店铺登录</Text>
          <Text style={styles.cardSub}>
            使用 Admin 后台「新增合伙店铺」创建的中转站账号
          </Text>

          {!configured ? (
            <View style={styles.warnBox}>
              <Text style={styles.warnTitle}>未连接服务器</Text>
              <Text style={styles.warnText}>
                {configHint || '请在 .env 中配置 Supabase 后重启 Expo（npx expo start -c）。'}
              </Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>店铺代码</Text>
            <TextInput
              style={styles.input}
              placeholder="如 MDY001"
              placeholderTextColor="#94a3b8"
              autoCapitalize="characters"
              autoCorrect={false}
              value={storeCode}
              onChangeText={(v) => setStoreCode(v.toUpperCase())}
              editable={!loading}
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>登录密码</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="请输入店铺密码"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                value={password}
                onChangeText={setPassword}
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={() => void onSubmit()}
              />
              <Pressable
                style={styles.eyeBtn}
                onPress={() => setShowPassword((v) => !v)}
                accessibilityLabel={showPassword ? '隐藏密码' : '显示密码'}
              >
                <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁'}</Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            style={[styles.btn, (loading || !configured) && styles.btnDisabled]}
            onPress={() => void onSubmit()}
            disabled={loading || !configured}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>登录库存系统</Text>
            )}
          </Pressable>
        </View>

        <Text style={styles.footer}>
          店铺类型须为「中转站」{'\n'}
          库存数据仍保存在本机，登录仅用于身份校验
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  hero: { alignItems: 'center', marginBottom: 28 },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(37,99,235,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logoEmoji: { fontSize: 36 },
  brand: { color: '#f8fafc', fontSize: 28, fontWeight: '900', letterSpacing: 0.5 },
  tagline: { color: '#94a3b8', fontSize: 15, marginTop: 6, fontWeight: '600' },
  pill: {
    marginTop: 12,
    backgroundColor: 'rgba(168,85,247,0.12)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.3)',
  },
  pillText: { color: '#c4b5fd', fontSize: 12, fontWeight: '800' },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  cardTitle: { color: '#f8fafc', fontSize: 20, fontWeight: '900' },
  cardSub: { color: '#64748b', fontSize: 13, marginTop: 6, lineHeight: 20, marginBottom: 16 },
  warnBox: {
    backgroundColor: 'rgba(251,191,36,0.1)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.35)',
  },
  warnTitle: { color: '#fbbf24', fontSize: 13, fontWeight: '800', marginBottom: 4 },
  warnText: { color: '#fde68a', fontSize: 12, lineHeight: 18 },
  errorBox: {
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.35)',
  },
  errorText: { color: '#fca5a5', fontSize: 13, fontWeight: '600', lineHeight: 20 },
  field: { marginBottom: 14 },
  label: { color: '#cbd5e1', fontSize: 13, fontWeight: '700', marginBottom: 6 },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  passwordInput: { flex: 1, paddingRight: 48 },
  eyeBtn: {
    position: 'absolute',
    right: 4,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeText: { fontSize: 18 },
  btn: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 6,
  },
  btnDisabled: { opacity: 0.55 },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  footer: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 24,
  },
});
