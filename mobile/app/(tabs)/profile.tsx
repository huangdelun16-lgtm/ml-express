import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, TextInput, Button, Card } from 'react-native-paper';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { EnhancedCard } from '../../src/components/EnhancedCard';
import { StatusIndicator } from '../../src/components/StatusIndicator';
import { LoadingAnimation } from '../../src/components/LoadingAnimation';
import { DesignTokens } from '../../src/designSystem';

const API_BASE = 'https://market-link-express.com/.netlify/functions';

export default function Profile() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState<{username?: string, role?: string}>({});

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const token = await SecureStore.getItemAsync('ml_token');
      const payload = await SecureStore.getItemAsync('ml_token_payload');
      if (token && payload) {
        setIsLoggedIn(true);
        setUserInfo(JSON.parse(payload));
      }
    } catch (e) {
      console.log('检查登录状态失败:', e);
    }
  };

  const tryLogin = async (u: string, p: string) => {
    const r = await axios.post(`${API_BASE}/auth-login`, { username: u, password: p });
    const token = r.data?.token;
    if (!token) throw new Error('登录成功但未返回 token');
    await SecureStore.setItemAsync('ml_token', token);
    await SecureStore.setItemAsync('ml_token_payload', JSON.stringify({ username: r.data?.username, role: r.data?.role }));
    setUserInfo({ username: r.data?.username, role: r.data?.role });
    setIsLoggedIn(true);
  };

  const login = async () => {
    if (!username || !password) return;
    setBusy(true);
    try {
      try {
        await tryLogin(username, password);
        Alert.alert('登录成功');
        setUsername('');
        setPassword('');
      } catch (e1: any) {
        const sha = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password);
        await tryLogin(username, sha);
        Alert.alert('登录成功');
        setUsername('');
        setPassword('');
      }
    } catch (e2: any) {
      const res = e2?.response;
      const msg = res?.data?.message || e2?.message || '未知错误';
      const code = res?.status ? ` (HTTP ${res.status})` : '';
      Alert.alert('登录失败', msg + code);
    } finally { setBusy(false); }
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('ml_token');
    await SecureStore.deleteItemAsync('ml_token_payload');
    setIsLoggedIn(false);
    setUserInfo({});
    Alert.alert('已退出');
  };

  return (
    <View style={s.wrap}>
      {isLoggedIn ? (
        // 已登录状态
        <View>
          <EnhancedCard variant="success" size="large" style={s.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: DesignTokens.spacing.md }}>
              <View>
                <Text variant="headlineSmall" style={{ color: DesignTokens.colors.text.primary }}>欢迎回来</Text>
                <Text variant="bodyMedium" style={{ color: DesignTokens.colors.text.secondary, marginTop: 4 }}>MARKET-LINK EXPRESS</Text>
              </View>
              <StatusIndicator status="success" size="large" label="已登录" />
            </View>
            
            <View style={{ marginBottom: DesignTokens.spacing.lg }}>
              <Text variant="titleMedium" style={{ color: DesignTokens.colors.text.primary, marginBottom: DesignTokens.spacing.sm }}>账户信息</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: DesignTokens.spacing.xs }}>
                <Text variant="bodyMedium" style={{ color: DesignTokens.colors.text.secondary, minWidth: 80 }}>用户名：</Text>
                <Text variant="bodyMedium" style={{ color: DesignTokens.colors.text.primary }}>{userInfo.username || '未知'}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text variant="bodyMedium" style={{ color: DesignTokens.colors.text.secondary, minWidth: 80 }}>角色：</Text>
                <Text variant="bodyMedium" style={{ color: DesignTokens.colors.text.primary }}>{userInfo.role || '未知'}</Text>
              </View>
            </View>
            
            <Button 
              mode="outlined" 
              onPress={logout}
              style={{ borderColor: DesignTokens.colors.error.main }}
              textColor={DesignTokens.colors.error.main}
            >
              退出登录
            </Button>
          </EnhancedCard>
        </View>
      ) : (
        // 未登录状态
        <EnhancedCard variant="primary" size="large" style={s.card}>
          <View style={{ marginBottom: DesignTokens.spacing.lg }}>
            <Text variant="headlineSmall" style={{ color: DesignTokens.colors.text.primary, textAlign: 'center' }}>账户登录</Text>
            <Text variant="bodyMedium" style={{ color: DesignTokens.colors.text.secondary, textAlign: 'center', marginTop: 4 }}>MARKET-LINK EXPRESS</Text>
          </View>
          
          <TextInput 
            label="用户名" 
            value={username} 
            onChangeText={setUsername} 
            autoCapitalize='none' 
            style={{ marginBottom: DesignTokens.spacing.md }} 
          />
          <TextInput 
            label="密码" 
            value={password} 
            onChangeText={setPassword} 
            secureTextEntry 
            style={{ marginBottom: DesignTokens.spacing.lg }} 
          />
          
          {busy ? (
            <LoadingAnimation type="spinner" size="medium" text="登录中..." />
          ) : (
            <Button 
              mode="contained" 
              onPress={login} 
              disabled={!username || !password}
              style={{ backgroundColor: DesignTokens.colors.primary.main, marginBottom: DesignTokens.spacing.md }}
            >
              登录
            </Button>
          )}
          
          <Button 
            mode="text" 
            onPress={logout}
            textColor={DesignTokens.colors.text.secondary}
          >
            清除本地数据
          </Button>
        </EnhancedCard>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { 
    flex: 1, 
    padding: DesignTokens.spacing.lg, 
    justifyContent: 'center', 
    backgroundColor: DesignTokens.colors.background.primary 
  },
  card: { 
    borderRadius: DesignTokens.borderRadius.lg, 
    ...DesignTokens.shadows.medium
  },
});
