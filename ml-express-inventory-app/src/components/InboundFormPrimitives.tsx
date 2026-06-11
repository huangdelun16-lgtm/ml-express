import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

export function InboundFormSection({
  title,
  accent,
  children,
}: {
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={[styles.sectionDot, { backgroundColor: accent }]} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={[styles.sectionBody, { borderLeftColor: accent }]}>{children}</View>
    </View>
  );
}

export function InboundFormField({
  label,
  value,
  onChange,
  placeholder,
  keyboard,
  multiline,
  editable = true,
  mono,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  keyboard?: 'default' | 'phone-pad' | 'decimal-pad';
  multiline?: boolean;
  editable?: boolean;
  mono?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          multiline && styles.inputMulti,
          !editable && styles.inputReadonly,
          mono && styles.mono,
        ]}
        value={value}
        onChangeText={onChange}
        editable={editable}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        keyboardType={keyboard}
        multiline={multiline}
      />
    </View>
  );
}

export const inboundFormStyles = StyleSheet.create({
  section: { marginBottom: 16 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { color: '#64748b', fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
  sectionBody: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderLeftWidth: 3,
  },
  field: { marginBottom: 12 },
  label: { color: '#e2e8f0', fontWeight: '700', marginBottom: 6, fontSize: 13 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0f172a',
  },
  inputMulti: { minHeight: 80, textAlignVertical: 'top' },
  inputReadonly: { backgroundColor: '#e2e8f0', color: '#64748b' },
  mono: { fontFamily: 'monospace' },
  preview: {
    marginBottom: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
  },
  previewTitle: { color: '#64748b', fontSize: 11, fontWeight: '800', marginBottom: 4 },
  previewLine: { color: '#cbd5e1', fontSize: 13, fontFamily: 'monospace' },
  barcodeBox: {
    marginTop: 4,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
  },
  barcodeLabel: { color: '#64748b', fontSize: 11, fontWeight: '800', marginBottom: 4 },
  barcodeValue: { color: '#fbbf24', fontSize: 14, fontFamily: 'monospace', fontWeight: '700' },
  dateBtn: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dateBtnText: { color: '#0f172a', fontSize: 16, fontWeight: '800' },
  dateBtnHint: { color: '#64748b', fontSize: 12, marginTop: 4, fontFamily: 'monospace' },
});

const styles = inboundFormStyles;
