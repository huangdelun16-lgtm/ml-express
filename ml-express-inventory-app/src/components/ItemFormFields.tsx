import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { DimensionSpecField, LockedSuffixField } from './StructuredItemFields';
import type { useItemFormState } from '../hooks/useItemFormState';

type FormState = ReturnType<typeof useItemFormState>;

type Props = {
  form: FormState;
  barcodeLabel?: string;
  barcodeEditable?: boolean;
  barcodeHint?: string;
  showPreview?: boolean;
  unitLocked?: boolean;
  unitHint?: string;
};

export default function ItemFormFields({
  form,
  barcodeLabel = '条码 *',
  barcodeEditable = true,
  barcodeHint,
  showPreview = true,
  unitLocked = false,
  unitHint,
}: Props) {
  const barcodeFieldHint =
    barcodeHint ?? (!barcodeEditable ? '条码创建后不可修改' : undefined);

  return (
    <>
      <Section title="基本信息">
        <Field
          label={barcodeLabel}
          value={form.barcode}
          onChange={form.setBarcode}
          editable={barcodeEditable}
          mono
          hint={barcodeFieldHint}
        />
        <Field label="商品名称 *" value={form.name} onChange={form.setName} placeholder="输入商品名称" />
      </Section>

      <Section title="规格参数">
        <DimensionSpecField
          l={form.specL}
          w={form.specW}
          h={form.specH}
          onChange={({ l, w, h }) => {
            form.setSpecL(l);
            form.setSpecW(w);
            form.setSpecH(h);
          }}
        />
        <LockedSuffixField
          label="单位"
          value={form.unitN}
          suffix="Pcs"
          onChange={form.setUnitN}
          placeholder="数量"
          editable={!unitLocked}
          hint={unitHint}
        />
        <LockedSuffixField
          label="重量"
          value={form.weightN}
          suffix="Kg"
          onChange={form.setWeightN}
          placeholder="重量"
        />
        {showPreview && (form.specStr || form.weightStr || form.unitStr) ? (
          <View style={styles.preview}>
            <Text style={styles.previewTitle}>预览</Text>
            {form.specStr ? <Text style={styles.previewLine}>规格 {form.specStr}</Text> : null}
            <Text style={styles.previewLine}>单位 {form.unitStr}</Text>
            {form.weightStr ? <Text style={styles.previewLine}>重量 {form.weightStr}</Text> : null}
          </View>
        ) : null}
      </Section>

      <Section title="其它">
        <Field label="备注" value={form.note} onChange={form.setNote} placeholder="选填" multiline />
      </Section>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  editable = true,
  mono,
  placeholder,
  hint,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  editable?: boolean;
  mono?: boolean;
  placeholder?: string;
  hint?: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[
          styles.fieldInput,
          mono && styles.mono,
          !editable && styles.readonly,
          multiline && styles.multiline,
        ]}
        value={value}
        onChangeText={onChange}
        editable={editable}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        multiline={multiline}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 16 },
  sectionTitle: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  sectionBody: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  field: { marginBottom: 12 },
  fieldLabel: { color: '#e2e8f0', fontWeight: '700', marginBottom: 6, fontSize: 13 },
  fieldInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0f172a',
  },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
  mono: { fontFamily: 'monospace' },
  readonly: { backgroundColor: '#e2e8f0', color: '#64748b' },
  hint: { color: '#64748b', fontSize: 12, marginTop: 6 },
  preview: {
    marginTop: 4,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
  },
  previewTitle: { color: '#64748b', fontSize: 11, fontWeight: '800', marginBottom: 6 },
  previewLine: { color: '#cbd5e1', fontSize: 14, marginTop: 2, fontFamily: 'monospace' },
});
