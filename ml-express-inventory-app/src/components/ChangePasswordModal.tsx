import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { changeInventoryPassword } from '../services/authService';
import {
  evaluatePasswordStrength,
  generateSecurePassword,
} from '../utils/passwordUi';

type Props = {
  visible: boolean;
  storeCode: string | null;
  onClose: () => void;
  onSuccess?: () => void;
};

function RequirementRow({ ok, text }: { ok: boolean; text: string }) {
  return (
    <View style={styles.reqRow}>
      <View style={[styles.reqDot, ok && styles.reqDotOk]}>
        <Text style={styles.reqDotText}>{ok ? '✓' : '·'}</Text>
      </View>
      <Text style={[styles.reqText, ok && styles.reqTextOk]}>{text}</Text>
    </View>
  );
}

export default function ChangePasswordModal({ visible, storeCode, onClose, onSuccess }: Props) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const strength = useMemo(() => evaluatePasswordStrength(newPassword), [newPassword]);

  const requirements = useMemo(
    () => ({
      minLength: newPassword.length >= 6,
      matches: newPassword.length > 0 && newPassword === confirmPassword,
      different: newPassword.length > 0 && currentPassword.length > 0 && newPassword !== currentPassword,
    }),
    [currentPassword, newPassword, confirmPassword],
  );

  const canSubmit =
    !loading &&
    currentPassword.trim().length > 0 &&
    requirements.minLength &&
    requirements.matches &&
    requirements.different;

  const reset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswords(false);
    setError('');
    setLoading(false);
  };

  useEffect(() => {
    if (!visible) reset();
  }, [visible]);

  const handleClose = () => {
    if (loading) return;
    reset();
    onClose();
  };

  const handleGenerate = () => {
    const generated = generateSecurePassword(10);
    setNewPassword(generated);
    setConfirmPassword(generated);
    setShowPasswords(true);
    setError('');
  };

  const handleSubmit = async () => {
    setError('');
    if (!requirements.minLength) {
      setError('新密码至少 6 位');
      return;
    }
    if (!requirements.matches) {
      setError('两次输入的新密码不一致');
      return;
    }
    if (!requirements.different) {
      setError('新密码不能与当前密码相同');
      return;
    }

    setLoading(true);
    try {
      await changeInventoryPassword(currentPassword, newPassword);
      reset();
      onSuccess?.();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '修改失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.overlay} onPress={handleClose}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />

            <View style={styles.header}>
              <View style={styles.headerIcon}>
                <Text style={styles.headerIconText}>🔐</Text>
              </View>
              <View style={styles.headerText}>
                <Text style={styles.title}>修改登录密码</Text>
                <Text style={styles.sub}>同步更新店铺密码与云端登录凭证</Text>
              </View>
              <Pressable
                style={styles.closeBtn}
                onPress={handleClose}
                disabled={loading}
                hitSlop={12}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.storeChip}>
              <Text style={styles.storeChipLabel}>店铺代码</Text>
              <Text style={styles.storeChipValue}>{storeCode ?? '—'}</Text>
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠ {error}</Text>
                </View>
              ) : null}

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>当前密码</Text>
                <View style={styles.inputShell}>
                  <Text style={styles.inputIcon}>🔑</Text>
                  <TextInput
                    style={styles.input}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    secureTextEntry={!showPasswords}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="输入当前密码"
                    placeholderTextColor="#94a3b8"
                    editable={!loading}
                  />
                </View>
              </View>

              <View style={styles.fieldBlock}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>新密码</Text>
                  <Pressable style={styles.genBtn} onPress={handleGenerate} disabled={loading}>
                    <Text style={styles.genBtnText}>随机生成</Text>
                  </Pressable>
                </View>
                <View style={styles.inputShell}>
                  <Text style={styles.inputIcon}>✨</Text>
                  <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showPasswords}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="至少 6 位"
                    placeholderTextColor="#94a3b8"
                    editable={!loading}
                  />
                </View>
                <View style={styles.strengthRow}>
                  {[1, 2, 3, 4].map((level) => (
                    <View
                      key={level}
                      style={[
                        styles.strengthBar,
                        strength.score >= level && { backgroundColor: strength.barColor },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.strengthLabel, { color: strength.color }]}>
                  {strength.label}
                </Text>
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>确认新密码</Text>
                <View style={styles.inputShell}>
                  <Text style={styles.inputIcon}>✓</Text>
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPasswords}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="再次输入新密码"
                    placeholderTextColor="#94a3b8"
                    editable={!loading}
                  />
                </View>
              </View>

              <Pressable
                style={styles.showToggle}
                onPress={() => setShowPasswords((v) => !v)}
                disabled={loading}
              >
                <Text style={styles.showToggleText}>
                  {showPasswords ? '🙈 隐藏密码' : '👁 显示密码'}
                </Text>
              </Pressable>

              <View style={styles.reqCard}>
                <Text style={styles.reqTitle}>密码要求</Text>
                <RequirementRow ok={requirements.minLength} text="至少 6 个字符" />
                <RequirementRow ok={requirements.matches} text="两次新密码输入一致" />
                <RequirementRow ok={requirements.different} text="新密码不同于当前密码" />
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <Pressable style={styles.ghostBtn} onPress={handleClose} disabled={loading}>
                <Text style={styles.ghostBtnText}>取消</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryBtn, !canSubmit && styles.primaryBtnDisabled]}
                onPress={() => void handleSubmit()}
                disabled={!canSubmit}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>确认修改</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.78)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#334155',
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 8 : 0,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#475569',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#1e3a8a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  headerIconText: { fontSize: 22 },
  headerText: { flex: 1, minWidth: 0 },
  title: { color: '#f8fafc', fontSize: 20, fontWeight: '900' },
  sub: { color: '#94a3b8', fontSize: 12, marginTop: 4, lineHeight: 17 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  closeBtnText: { color: '#94a3b8', fontSize: 16, fontWeight: '700' },
  storeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  storeChipLabel: { color: '#64748b', fontSize: 12, fontWeight: '700' },
  storeChipValue: {
    color: '#38bdf8',
    fontSize: 15,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  scroll: { maxHeight: 420 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 8 },
  fieldBlock: { marginBottom: 14 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: { color: '#cbd5e1', fontWeight: '700', fontSize: 13, marginBottom: 6 },
  genBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#475569',
  },
  genBtnText: { color: '#7dd3fc', fontSize: 11, fontWeight: '800' },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
  },
  inputIcon: { fontSize: 16, marginRight: 8, opacity: 0.85 },
  input: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  strengthRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#334155',
  },
  strengthLabel: { marginTop: 6, fontSize: 12, fontWeight: '700' },
  showToggle: {
    alignSelf: 'flex-start',
    marginBottom: 12,
    paddingVertical: 6,
  },
  showToggleText: { color: '#94a3b8', fontSize: 13, fontWeight: '700' },
  reqCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 4,
  },
  reqTitle: { color: '#e2e8f0', fontWeight: '800', fontSize: 13, marginBottom: 10 },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  reqDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reqDotOk: { backgroundColor: '#065f46' },
  reqDotText: { color: '#94a3b8', fontSize: 11, fontWeight: '900' },
  reqText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  reqTextOk: { color: '#6ee7b7' },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  errorText: { color: '#fca5a5', fontSize: 13, fontWeight: '700' },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    backgroundColor: '#0f172a',
  },
  ghostBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
    backgroundColor: '#1e293b',
  },
  ghostBtnText: { color: '#cbd5e1', fontWeight: '800', fontSize: 15 },
  primaryBtn: {
    flex: 1.2,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnDisabled: { opacity: 0.45, shadowOpacity: 0 },
  primaryBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },
});
