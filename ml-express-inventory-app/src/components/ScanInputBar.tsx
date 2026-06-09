import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

/** USB / WiFi / 蓝牙 HID 扫码枪：模拟键盘输入 + 回车结束 */
type Props = {
  value: string;
  onChangeText: (v: string) => void;
  onSubmit: (code: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
};

export default function ScanInputBar({
  value,
  onChangeText,
  onSubmit,
  placeholder = '扫描或输入条码后按回车',
  autoFocus = true,
}: Props) {
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(t);
    }
  }, [autoFocus]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>📟 扫码枪 / 手动输入</Text>
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        blurOnSubmit={false}
        onSubmitEditing={() => {
          const code = value.trim();
          if (code) onSubmit(code);
        }}
      />
      <Text style={styles.hint}>USB/WiFi/蓝牙扫码枪请保持此框聚焦，扫完会自动回车</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { color: '#e2e8f0', fontWeight: '700', marginBottom: 8, fontSize: 14 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 18,
    fontFamily: 'monospace',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  hint: { color: '#94a3b8', fontSize: 12, marginTop: 6 },
});
