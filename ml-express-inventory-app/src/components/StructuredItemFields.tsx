import React, { type Ref } from 'react';
import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import { sanitizeNumberInput } from '../utils/itemFieldFormat';

type DimInputProps = {
  inputRef?: Ref<TextInput>;
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
  blurOnSubmit?: boolean;
};

type DimProps = {
  l: string;
  w: string;
  h: string;
  onChange: (next: { l: string; w: string; h: string }) => void;
  editable?: boolean;
  lInput?: DimInputProps;
  wInput?: DimInputProps;
  hInput?: DimInputProps;
};

export function DimensionSpecField({
  l,
  w,
  h,
  onChange,
  editable = true,
  lInput,
  wInput,
  hInput,
}: DimProps) {
  const set = (key: 'l' | 'w' | 'h', v: string) => {
    onChange({ l, w, h, [key]: sanitizeNumberInput(v) });
  };

  return (
    <View style={styles.block}>
      <View style={styles.specHead}>
        <Text style={styles.label}>规格</Text>
        <Text style={styles.specUnit}>cm</Text>
      </View>
      <View style={styles.specCard}>
        <View style={styles.specRow}>
          <DimCell label="长" value={l} onChange={(v) => set('l', v)} editable={editable} input={lInput} />
          <Text style={styles.times}>×</Text>
          <DimCell label="宽" value={w} onChange={(v) => set('w', v)} editable={editable} input={wInput} />
          <Text style={styles.times}>×</Text>
          <DimCell label="高" value={h} onChange={(v) => set('h', v)} editable={editable} input={hInput} />
        </View>
      </View>
    </View>
  );
}

type SuffixProps = {
  label: string;
  value: string;
  suffix: string;
  onChange: (v: string) => void;
  placeholder?: string;
  editable?: boolean;
  hint?: string;
  inputRef?: Ref<TextInput>;
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
  blurOnSubmit?: boolean;
};

export function LockedSuffixField({
  label,
  value,
  suffix,
  onChange,
  placeholder,
  editable = true,
  hint,
  inputRef,
  returnKeyType,
  onSubmitEditing,
  blurOnSubmit,
}: SuffixProps) {
  return (
    <View style={styles.block}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.suffixRow}>
        <TextInput
          ref={inputRef}
          style={[styles.numInput, styles.numInputFlex, !editable && styles.numInputReadonly]}
          value={value}
          onChangeText={(t) => onChange(sanitizeNumberInput(t))}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          editable={editable}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={blurOnSubmit}
          submitBehavior="submit"
        />
        <View style={styles.suffixChip}>
          <Text style={styles.suffixText}>{suffix}</Text>
        </View>
      </View>
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

function DimCell({
  label,
  value,
  onChange,
  editable = true,
  input,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  editable?: boolean;
  input?: DimInputProps;
}) {
  return (
    <View style={styles.dimCell}>
      <Text style={styles.dimLabel}>{label}</Text>
      <TextInput
        ref={input?.inputRef}
        style={[styles.dimInput, !editable && styles.dimInputReadonly]}
        value={value}
        onChangeText={(t) => onChange(sanitizeNumberInput(t))}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor="#94a3b8"
        editable={editable}
        returnKeyType={input?.returnKeyType}
        onSubmitEditing={input?.onSubmitEditing}
        blurOnSubmit={input?.blurOnSubmit}
        submitBehavior="submit"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: 14 },
  label: { color: '#cbd5e1', fontWeight: '700', fontSize: 13, marginBottom: 8 },
  specHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  specUnit: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '800',
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  specCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dimCell: { flex: 1, minWidth: 0 },
  dimLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  dimInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 11,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    color: '#0f172a',
  },
  dimInputReadonly: {
    backgroundColor: '#e2e8f0',
    color: '#475569',
  },
  times: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '800',
    paddingHorizontal: 2,
    marginTop: 14,
  },
  suffixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locked: {
    color: '#64748b',
    fontSize: 18,
    fontWeight: '800',
    paddingHorizontal: 2,
  },
  suffixLocked: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 4,
  },
  numInput: {
    minWidth: 56,
    flexGrow: 1,
    maxWidth: 88,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    color: '#0f172a',
  },
  numInputFlex: {
    flex: 1,
    maxWidth: undefined,
    textAlign: 'left',
  },
  numInputReadonly: {
    backgroundColor: '#e2e8f0',
    color: '#475569',
  },
  fieldHint: { color: '#64748b', fontSize: 12, marginTop: 6 },
  suffixChip: {
    backgroundColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 64,
    alignItems: 'center',
  },
  suffixText: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '800',
  },
});
