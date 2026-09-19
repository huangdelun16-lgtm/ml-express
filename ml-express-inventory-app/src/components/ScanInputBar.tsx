import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { Keyboard, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from '../i18n';
import Text from './AppText';
import PhoneBarcodeScanModal from './PhoneBarcodeScanModal';
import { MYANMAR_FONT_REGULAR } from '../utils/myanmarText';
import { normalizeScanCode, vibrateScanSuccess } from '../utils/barcodeScan';

type CameraScanOptions = {
  title?: string;
  subtitle?: string;
  /** 连扫订单条码时不关相机；PKG 仍由 closeWhen 关闭 */
  continuous?: boolean;
  scannedCount?: number;
  closeWhen?: (code: string) => boolean;
  /** 点「已扫」时展示的已扫订单列表 */
  scannedList?: ReactNode;
};

type Props = {
  value: string;
  onChangeText: (v: string) => void;
  onSubmit: (code: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  label?: string;
  hint?: string;
  busy?: boolean;
  /** 内置相机扫码弹窗 */
  cameraScan?: boolean | CameraScanOptions;
  /** 自定义扫码（与 cameraScan 二选一） */
  onScanPress?: () => void;
  /** 手动输入时保留大小写（关键词搜索）；扫码仍会规范化为大写 */
  preserveCase?: boolean;
  /** 为 false 时点输入框不弹系统键盘（扫码枪仍可写入）。默认弹出键盘以便手动填写。 */
  softInputOnFocus?: boolean;
  /** 右侧扫码按钮文案，默认「扫码」 */
  scanBtnLabel?: string;
  /** dark：库存深色页（到站签收） */
  tone?: 'light' | 'dark';
};

export default function ScanInputBar({
  value,
  onChangeText,
  onSubmit,
  placeholder,
  autoFocus = false,
  label,
  hint,
  busy = false,
  cameraScan,
  onScanPress,
  preserveCase = false,
  softInputOnFocus = true,
  scanBtnLabel,
  tone = 'light',
}: Props) {
  const { t, language } = useTranslation();
  const inputRef = useRef<TextInput>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const resolvedLabel = label ?? t.scanInput.defaultLabel;
  const resolvedPlaceholder = placeholder ?? t.scanInput.defaultPlaceholder;

  const cameraOpts = typeof cameraScan === 'object' ? cameraScan : {};
  const showCamera = Boolean(cameraScan);
  const resolvedScanLabel = scanBtnLabel ?? t.scanInput.scanBtn;

  useEffect(() => {
    if (autoFocus && !busy) {
      const timer = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(timer);
    }
  }, [autoFocus, busy]);

  const submitCode = (raw: string, fromScan = false) => {
    const code = !fromScan && preserveCase
      ? raw.replace(/[\x00-\x1F\x7F]/g, '').trim()
      : normalizeScanCode(raw);
    if (!code || busy) return;
    vibrateScanSuccess();
    onChangeText(code);
    onSubmit(code);
  };

  const openScan = () => {
    if (busy) return;
    Keyboard.dismiss();
    inputRef.current?.blur();
    if (onScanPress) {
      onScanPress();
      return;
    }
    if (showCamera) setModalVisible(true);
  };

  const defaultHint = showCamera || onScanPress
    ? t.scanInput.hintWithCamera
    : t.scanInput.hintGunOnly;

  const dark = tone === 'dark';

  const scanButton = (
    <Pressable
      style={({ pressed }) => [
        styles.scanBtn,
        dark && styles.scanBtnDark,
        language === 'my' && styles.scanBtnMyanmar,
        pressed && (dark ? styles.scanBtnDarkPressed : styles.scanBtnPressed),
        busy && styles.scanBtnDisabled,
      ]}
      onPress={openScan}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={resolvedScanLabel}
    >
      <Text style={styles.scanIcon}>📷</Text>
      <Text style={[styles.scanText, dark && styles.scanTextDark]} myanmarWeight="bold" numberOfLines={2}>
        {resolvedScanLabel}
      </Text>
    </Pressable>
  );

  const inputField = (
    <View style={styles.inputShell}>
      <TextInput
        ref={inputRef}
        style={[
          styles.input,
          dark && styles.inputDark,
          (showCamera || onScanPress) && styles.inputWithScan,
          language === 'my' && styles.inputMyanmar,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={resolvedPlaceholder}
        placeholderTextColor={dark ? '#64748b' : '#94a3b8'}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        autoComplete="off"
        textContentType="none"
        importantForAutofill="no"
        editable={!busy}
        showSoftInputOnFocus={softInputOnFocus}
        returnKeyType="done"
        blurOnSubmit={false}
        onSubmitEditing={() => submitCode(value)}
      />
      {value ? (
        <Pressable
          style={styles.clearBtn}
          onPress={() => onChangeText('')}
          hitSlop={8}
          accessibilityLabel={t.scanInput.clear}
        >
          <Text style={[styles.clearText, dark && styles.clearTextDark]}>×</Text>
        </Pressable>
      ) : null}
    </View>
  );

  const resolvedHint = hint === undefined ? defaultHint : hint;

  return (
    <View style={[styles.wrap, dark && styles.wrapDark]}>
      {resolvedLabel ? (
        <Text style={[styles.label, dark && styles.labelDark]} myanmarWeight="semibold">
          {resolvedLabel}
        </Text>
      ) : null}
      <View style={styles.inputRow}>
        {inputField}
        {showCamera || onScanPress ? scanButton : null}
      </View>
      {resolvedHint ? (
        <Text style={[styles.hint, dark && styles.hintDark]} myanmarWeight="regular">
          {resolvedHint}
        </Text>
      ) : null}

      {showCamera ? (
        <PhoneBarcodeScanModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onScanned={(code) => {
            const normalized = normalizeScanCode(code);
            submitCode(code, true);
            if (!cameraOpts.continuous || cameraOpts.closeWhen?.(normalized)) {
              setModalVisible(false);
            }
          }}
          title={cameraOpts.title ?? t.scanInput.phoneScan}
          subtitle={cameraOpts.subtitle}
          continuous={cameraOpts.continuous}
          busy={busy}
          scannedCount={cameraOpts.scannedCount}
          scannedList={cameraOpts.scannedList}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  wrapDark: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 10,
  },
  label: { color: '#e2e8f0', fontWeight: '700', marginBottom: 8, fontSize: 14 },
  labelDark: { color: '#94a3b8', fontWeight: '700', fontSize: 12, letterSpacing: 0.3, marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  inputShell: { flex: 1, position: 'relative', minWidth: 0 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    paddingRight: 36,
    fontSize: 18,
    fontFamily: 'monospace',
    borderWidth: 2,
    borderColor: '#3b82f6',
    color: '#0f172a',
  },
  inputMyanmar: {
    fontFamily: MYANMAR_FONT_REGULAR,
    fontSize: 16,
    lineHeight: 28,
    paddingVertical: 12,
  },
  inputDark: {
    backgroundColor: '#0f172a',
    borderColor: '#475569',
    borderWidth: 1,
    color: '#f8fafc',
    fontSize: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  inputWithScan: { minWidth: 0 },
  clearBtn: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    width: 28,
  },
  clearText: { color: '#94a3b8', fontSize: 22, fontWeight: '700', textAlign: 'center' },
  clearTextDark: { color: '#64748b' },
  scanBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
    maxWidth: 88,
    borderWidth: 2,
    borderColor: '#1d4ed8',
  },
  scanBtnMyanmar: { maxWidth: 108, minWidth: 80, paddingHorizontal: 8 },
  scanBtnDark: {
    borderWidth: 0,
    minWidth: 78,
    maxWidth: 92,
    paddingHorizontal: 8,
    backgroundColor: '#2563eb',
  },
  scanBtnPressed: { backgroundColor: '#1d4ed8' },
  scanBtnDarkPressed: { backgroundColor: '#1e40af' },
  scanBtnDisabled: { opacity: 0.5 },
  scanIcon: { fontSize: 18, lineHeight: 20 },
  scanText: { color: '#fff', fontSize: 11, fontWeight: '900', marginTop: 2, textAlign: 'center' },
  scanTextDark: { fontSize: 10, letterSpacing: 0.2 },
  hint: { color: '#94a3b8', fontSize: 12, marginTop: 6, lineHeight: 18 },
  hintDark: { color: '#64748b', fontSize: 11, marginTop: 8, lineHeight: 16 },
});
