import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import PhoneBarcodeScanModal from './PhoneBarcodeScanModal';
import { normalizeScanCode, vibrateScanSuccess } from '../utils/barcodeScan';

type CameraScanOptions = {
  title?: string;
  subtitle?: string;
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
};

export default function ScanInputBar({
  value,
  onChangeText,
  onSubmit,
  placeholder = '扫描或输入条码后按回车',
  autoFocus = true,
  label = '📱 扫码 / 手动输入',
  hint,
  busy = false,
  cameraScan,
  onScanPress,
}: Props) {
  const inputRef = useRef<TextInput>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const cameraOpts = typeof cameraScan === 'object' ? cameraScan : {};
  const showCamera = Boolean(cameraScan);

  useEffect(() => {
    if (autoFocus && !busy) {
      const t = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(t);
    }
  }, [autoFocus, busy]);

  const submitCode = (raw: string) => {
    const code = normalizeScanCode(raw);
    if (!code || busy) return;
    vibrateScanSuccess();
    onChangeText(code);
    onSubmit(code);
  };

  const openScan = () => {
    if (busy) return;
    if (onScanPress) {
      onScanPress();
      return;
    }
    if (showCamera) setModalVisible(true);
  };

  const defaultHint = showCamera || onScanPress
    ? '扫码枪保持聚焦自动回车；或点右侧「扫码」打开手机相机'
    : 'USB/WiFi/蓝牙扫码枪请保持此框聚焦，扫完会自动回车';

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <View style={styles.inputShell}>
          <TextInput
            ref={inputRef}
            style={[styles.input, (showCamera || onScanPress) && styles.inputWithScan]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
            returnKeyType="done"
            blurOnSubmit={false}
            onSubmitEditing={() => submitCode(value)}
          />
          {value ? (
            <Pressable
              style={styles.clearBtn}
              onPress={() => onChangeText('')}
              hitSlop={8}
              accessibilityLabel="清空"
            >
              <Text style={styles.clearText}>×</Text>
            </Pressable>
          ) : null}
        </View>
        {showCamera || onScanPress ? (
          <Pressable
            style={({ pressed }) => [
              styles.scanBtn,
              pressed && styles.scanBtnPressed,
              busy && styles.scanBtnDisabled,
            ]}
            onPress={openScan}
            disabled={busy}
            accessibilityLabel="扫码"
          >
            <Text style={styles.scanIcon}>📷</Text>
            <Text style={styles.scanText}>扫码</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.hint}>{hint ?? defaultHint}</Text>

      {showCamera ? (
        <PhoneBarcodeScanModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onScanned={submitCode}
          title={cameraOpts.title ?? '手机扫码'}
          subtitle={cameraOpts.subtitle}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { color: '#e2e8f0', fontWeight: '700', marginBottom: 8, fontSize: 14 },
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
  scanBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 56,
    borderWidth: 2,
    borderColor: '#1d4ed8',
  },
  scanBtnPressed: { backgroundColor: '#1d4ed8' },
  scanBtnDisabled: { opacity: 0.5 },
  scanIcon: { fontSize: 18, lineHeight: 20 },
  scanText: { color: '#fff', fontSize: 11, fontWeight: '900', marginTop: 2 },
  hint: { color: '#94a3b8', fontSize: 12, marginTop: 6, lineHeight: 18 },
});
