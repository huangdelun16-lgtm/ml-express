import React, { type Ref } from 'react';
import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import { colors, radius } from '../theme';

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
  inputRef,
  returnKeyType,
  onSubmitEditing,
  blurOnSubmit,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  keyboard?: 'default' | 'phone-pad' | 'decimal-pad';
  multiline?: boolean;
  editable?: boolean;
  mono?: boolean;
  inputRef?: Ref<TextInput>;
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
  blurOnSubmit?: boolean;
  autoCapitalize?: TextInputProps['autoCapitalize'];
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={inputRef}
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
        placeholderTextColor={colors.muted}
        keyboardType={keyboard}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        blurOnSubmit={blurOnSubmit}
        submitBehavior={multiline ? 'newline' : 'submit'}
      />
    </View>
  );
}

export const inboundFormStyles = StyleSheet.create({
  section: { marginBottom: 16 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { color: colors.muted2, fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
  sectionBody: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderLeftWidth: 3,
  },
  field: { marginBottom: 12 },
  label: { color: colors.textSecondary, fontWeight: '700', marginBottom: 6, fontSize: 13 },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.inputText,
  },
  inputMulti: { minHeight: 80, textAlignVertical: 'top' },
  inputReadonly: { backgroundColor: colors.textSecondary, color: colors.muted2 },
  mono: { fontFamily: 'monospace' },
  preview: {
    marginBottom: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewTitle: { color: colors.muted2, fontSize: 11, fontWeight: '800', marginBottom: 4 },
  previewLine: { color: colors.slateSoft, fontSize: 13, fontFamily: 'monospace' },
  barcodeBox: {
    marginTop: 4,
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  barcodeLabel: { color: colors.muted2, fontSize: 11, fontWeight: '800', marginBottom: 4 },
  barcodeValue: { color: colors.warning, fontSize: 14, fontFamily: 'monospace', fontWeight: '700' },
  dateBtn: {
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dateBtnText: { color: colors.inputText, fontSize: 16, fontWeight: '800' },
  dateBtnHint: { color: colors.muted2, fontSize: 12, marginTop: 4, fontFamily: 'monospace' },
});

const styles = inboundFormStyles;
