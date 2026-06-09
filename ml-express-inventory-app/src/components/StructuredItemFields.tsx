import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { sanitizeNumberInput } from '../utils/itemFieldFormat';

type DimProps = {
  l: string;
  w: string;
  h: string;
  onChange: (next: { l: string; w: string; h: string }) => void;
};

export function DimensionSpecField({ l, w, h, onChange }: DimProps) {
  const set = (key: 'l' | 'w' | 'h', v: string) => {
    onChange({ l, w, h, [key]: sanitizeNumberInput(v) });
  };

  return (
    <View style={styles.block}>
      <Text style={styles.label}>规格（cm）</Text>
      <View style={styles.formulaRow}>
        <Text style={styles.locked}>(</Text>
        <NumBox value={l} onChange={(v) => set('l', v)} placeholder="长" />
        <Text style={styles.locked}>x</Text>
        <NumBox value={w} onChange={(v) => set('w', v)} placeholder="宽" />
        <Text style={styles.locked}>x</Text>
        <NumBox value={h} onChange={(v) => set('h', v)} placeholder="高" />
        <Text style={styles.locked}>)</Text>
        <Text style={styles.suffixLocked}>cm</Text>
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
};

export function LockedSuffixField({
  label,
  value,
  suffix,
  onChange,
  placeholder,
  editable = true,
  hint,
}: SuffixProps) {
  return (
    <View style={styles.block}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.suffixRow}>
        <TextInput
          style={[styles.numInput, styles.numInputFlex, !editable && styles.numInputReadonly]}
          value={value}
          onChangeText={(t) => onChange(sanitizeNumberInput(t))}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          editable={editable}
        />
        <View style={styles.suffixChip}>
          <Text style={styles.suffixText}>{suffix}</Text>
        </View>
      </View>
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

function NumBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <TextInput
      style={styles.numInput}
      value={value}
      onChangeText={(t) => onChange(sanitizeNumberInput(t))}
      keyboardType="decimal-pad"
      placeholder={placeholder}
      placeholderTextColor="#94a3b8"
    />
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: 14 },
  label: { color: '#cbd5e1', fontWeight: '700', fontSize: 13, marginBottom: 8 },
  formulaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
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
