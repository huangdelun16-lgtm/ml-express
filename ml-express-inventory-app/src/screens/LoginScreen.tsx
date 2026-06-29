import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { LOGIN_LOGO } from '../constants/branding';
import { INVENTORY_PRIVACY_URL, INVENTORY_SUPPORT_URL } from '../constants/support';
import LanguageSelector from '../components/LanguageSelector';
import { resolveAppError, useTranslation } from '../i18n';
import { consumeSessionKickedFlag } from '../services/authService';
import { getSupabaseConfigHint, isSupabaseConfigured } from '../services/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
/** login-logo.png 裁剪后宽高比（透明底 PNG） */
const LOGIN_LOGO_ASPECT = 618 / 705;
/** 登录页 LOGO 最大宽度（约为原先 340 的一半） */
const LOGO_MAX_WIDTH = 170;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const { t } = useTranslation();
  const [storeCode, setStoreCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [storeFocused, setStoreFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  useEffect(() => {
    void consumeSessionKickedFlag().then((kicked) => {
      if (!kicked) return;
      Alert.alert(t.auth.sessionKickedTitle, t.auth.sessionKickedMessage, [
        { text: t.common.ok },
      ]);
    });
  }, [t.auth.sessionKickedMessage, t.auth.sessionKickedTitle, t.common.ok]);

  const onSubmit = async () => {
    setError('');
    if (!storeCode.trim() || !password.trim()) {
      setError(t.login.fillFields);
      return;
    }
    setLoading(true);
    try {
      await login(storeCode.trim().toUpperCase(), password);
    } catch (e: unknown) {
      setError(resolveAppError(t, e));
    } finally {
      setLoading(false);
    }
  };

  const configured = isSupabaseConfigured();
  const configHint = getSupabaseConfigHint();
  const logoWidth = Math.min(SCREEN_WIDTH - 32, LOGO_MAX_WIDTH);
  const logoHeight = logoWidth / LOGIN_LOGO_ASPECT;

  return (
    <View style={styles.root}>
      <View style={styles.bgOrbTop} pointerEvents="none" />
      <View style={styles.bgOrbBottom} pointerEvents="none" />
      <View style={styles.bgGrid} pointerEvents="none" />

      <LanguageSelector />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={[styles.logoFrame, { width: logoWidth, height: logoHeight }]}>
              <View style={styles.logoGlow} pointerEvents="none" />
              <Image
                source={LOGIN_LOGO}
                style={[styles.logo, { width: logoWidth, height: logoHeight }]}
                resizeMode="contain"
                accessibilityLabel="ML Inventory"
              />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t.login.cardTitle}</Text>

            <Text style={styles.accountNote}>{t.login.accountAccess}</Text>

            {!configured ? (
              <View style={styles.warnBox}>
                <Text style={styles.warnTitle}>{t.login.serverOffline}</Text>
                <Text style={styles.warnText}>
                  {configHint || t.login.supabaseHint}
                </Text>
              </View>
            ) : null}

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>{t.login.storeCode}</Text>
              <TextInput
                style={[styles.input, storeFocused && styles.inputFocused]}
                placeholder={t.login.storeCodePlaceholder}
                placeholderTextColor="#64748b"
                autoCapitalize="characters"
                autoCorrect={false}
                value={storeCode}
                onChangeText={(v) => setStoreCode(v.toUpperCase())}
                editable={!loading}
                returnKeyType="next"
                onFocus={() => setStoreFocused(true)}
                onBlur={() => setStoreFocused(false)}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t.login.password}</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    passwordFocused && styles.inputFocused,
                  ]}
                  placeholder={t.login.passwordPlaceholder}
                  placeholderTextColor="#64748b"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={password}
                  onChangeText={setPassword}
                  editable={!loading}
                  returnKeyType="done"
                  onSubmitEditing={() => void onSubmit()}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                />
                <Pressable
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword((v) => !v)}
                  accessibilityLabel={showPassword ? t.common.hide : t.common.show}
                >
                  <Text style={styles.eyeText}>{showPassword ? t.common.hide : t.common.show}</Text>
                </Pressable>
              </View>
            </View>

            <Pressable
              style={[styles.btn, (loading || !configured) && styles.btnDisabled]}
              onPress={() => void onSubmit()}
              disabled={loading || !configured}
            >
              <View style={styles.btnInner}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>{t.login.submit}</Text>
                )}
              </View>
            </Pressable>
          </View>

          <Pressable
            style={styles.supportLink}
            onPress={() => void Linking.openURL(INVENTORY_SUPPORT_URL)}
          >
            <Text style={styles.supportLinkText}>{t.login.partnerAccessLink}</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryLink}
            onPress={() => void Linking.openURL(INVENTORY_SUPPORT_URL)}
          >
            <Text style={styles.secondaryLinkText}>{t.login.supportLink}</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryLink}
            onPress={() => void Linking.openURL(INVENTORY_PRIVACY_URL)}
          >
            <Text style={styles.secondaryLinkText}>{t.login.privacyLink}</Text>
          </Pressable>

          <Text style={styles.footer}>{t.login.footer}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#020617',
  },
  flex: { flex: 1 },
  bgOrbTop: {
    position: 'absolute',
    top: -120,
    left: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(14, 165, 233, 0.14)',
  },
  bgOrbBottom: {
    position: 'absolute',
    bottom: -100,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
  },
  bgGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 320,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(56, 189, 248, 0.06)',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 14,
  },
  logoFrame: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  logoGlow: {
    position: 'absolute',
    top: '10%',
    left: '15%',
    right: '15%',
    height: '50%',
    borderRadius: 60,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
  },
  logo: {
    backgroundColor: 'transparent',
  },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.14)',
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  accountNote: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  warnBox: {
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.28)',
  },
  warnTitle: { color: '#fbbf24', fontSize: 13, fontWeight: '800', marginBottom: 4 },
  warnText: { color: '#fde68a', fontSize: 12, lineHeight: 18 },
  errorBox: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  errorText: { color: '#fca5a5', fontSize: 13, fontWeight: '600', lineHeight: 20 },
  field: { marginBottom: 14 },
  label: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 2,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 15 : 13,
    fontSize: 16,
    color: '#f8fafc',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
  },
  inputFocused: {
    borderColor: 'rgba(56, 189, 248, 0.55)',
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  passwordInput: { flex: 1, paddingRight: 56 },
  eyeBtn: {
    position: 'absolute',
    right: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  eyeText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '700',
  },
  btn: {
    borderRadius: 16,
    marginTop: 8,
    overflow: 'hidden',
    backgroundColor: '#0284c7',
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  btnInner: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  btnDisabled: { opacity: 0.5, shadowOpacity: 0 },
  btnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 0.4,
  },
  footer: {
    color: '#475569',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 12,
    letterSpacing: 0.2,
  },
  supportLink: {
    marginTop: 16,
    alignSelf: 'center',
    paddingVertical: 4,
  },
  supportLinkText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  secondaryLink: {
    marginTop: 8,
    alignSelf: 'center',
    paddingVertical: 2,
  },
  secondaryLinkText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
