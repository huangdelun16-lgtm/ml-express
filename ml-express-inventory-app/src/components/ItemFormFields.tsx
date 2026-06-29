import React, { type Ref } from 'react';
import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import { useFormFieldChain } from '../hooks/useFormFieldChain';
import { DimensionSpecField, LockedSuffixField } from './StructuredItemFields';
import { useTranslation } from '../i18n';
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
  specLocked?: boolean;
  weightLocked?: boolean;
  specHint?: string;
  weightHint?: string;
};

export default function ItemFormFields({
  form,
  barcodeLabel,
  barcodeEditable = true,
  barcodeHint,
  showPreview = true,
  unitLocked = false,
  unitHint,
  specLocked = false,
  weightLocked = false,
  specHint,
  weightHint,
}: Props) {
  const { t, fmt } = useTranslation();
  const resolvedBarcodeLabel = barcodeLabel ?? `${t.trackExpress.inboundBarcode} *`;
  const barcodeFieldHint =
    barcodeHint ?? (!barcodeEditable ? t.itemForm.alertBarcode : undefined);
  const fieldChain = useFormFieldChain([
    'barcode',
    'name',
    'specL',
    'specW',
    'specH',
    'unit',
    'weight',
    'note',
  ]);

  return (
    <>
      <Section title={t.itemForm.basicInfo}>
        <Field
          label={resolvedBarcodeLabel}
          value={form.barcode}
          onChange={form.setBarcode}
          editable={barcodeEditable}
          mono
          hint={barcodeFieldHint}
          fieldProps={barcodeEditable ? fieldChain.propsFor('barcode') : undefined}
        />
        <Field
          label={t.stockIn.itemNameRequired}
          value={form.name}
          onChange={form.setName}
          placeholder={t.stockIn.itemNameRequired.replace(' *', '')}
          fieldProps={fieldChain.propsFor('name')}
        />
      </Section>

      <Section title={t.itemForm.specSection}>
        <DimensionSpecField
          l={form.specL}
          w={form.specW}
          h={form.specH}
          editable={!specLocked}
          onChange={({ l, w, h }) => {
            form.setSpecL(l);
            form.setSpecW(w);
            form.setSpecH(h);
          }}
          lInput={fieldChain.propsFor('specL')}
          wInput={fieldChain.propsFor('specW')}
          hInput={fieldChain.propsFor('specH')}
        />
        {specHint ? <Text style={styles.hint}>{specHint}</Text> : null}
        <LockedSuffixField
          label={t.trackExpress.unit}
          value={form.unitN}
          suffix="Pcs"
          onChange={form.setUnitN}
          placeholder={t.stockIn.qtyRequired.replace(' *', '')}
          editable={!unitLocked}
          hint={unitHint}
          inputRef={fieldChain.propsFor('unit').inputRef}
          returnKeyType={fieldChain.propsFor('unit').returnKeyType}
          onSubmitEditing={fieldChain.propsFor('unit').onSubmitEditing}
          blurOnSubmit={fieldChain.propsFor('unit').blurOnSubmit}
        />
        <LockedSuffixField
          label={t.trackExpress.weight}
          value={form.weightN}
          suffix="Kg"
          onChange={form.setWeightN}
          placeholder={t.trackExpress.weight}
          editable={!weightLocked}
          hint={weightHint}
          inputRef={fieldChain.propsFor('weight').inputRef}
          returnKeyType={fieldChain.propsFor('weight').returnKeyType}
          onSubmitEditing={fieldChain.propsFor('weight').onSubmitEditing}
          blurOnSubmit={fieldChain.propsFor('weight').blurOnSubmit}
        />
        {showPreview && (form.specStr || form.weightStr || form.unitStr) ? (
          <View style={styles.preview}>
            <Text style={styles.previewTitle}>{t.itemForm.specSection}</Text>
            {form.specStr ? (
              <Text style={styles.previewLine}>
                {t.trackExpress.spec} {form.specStr}
              </Text>
            ) : null}
            <Text style={styles.previewLine}>
              {t.trackExpress.unit} {form.unitStr}
            </Text>
            {form.weightStr ? (
              <Text style={styles.previewLine}>
                {t.trackExpress.weight} {form.weightStr}
              </Text>
            ) : null}
          </View>
        ) : null}
      </Section>

      <Section title={t.itemForm.note}>
        <Field
          label={t.itemForm.note}
          value={form.note}
          onChange={form.setNote}
          placeholder={t.manualEntry.notePlaceholder}
          multiline
          fieldProps={fieldChain.propsFor('note', { multiline: true })}
        />
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
  fieldProps,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  editable?: boolean;
  mono?: boolean;
  placeholder?: string;
  hint?: string;
  multiline?: boolean;
  fieldProps?: {
    inputRef: Ref<TextInput>;
    returnKeyType?: TextInputProps['returnKeyType'];
    onSubmitEditing?: TextInputProps['onSubmitEditing'];
    blurOnSubmit?: boolean;
  };
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        ref={fieldProps?.inputRef}
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
        returnKeyType={fieldProps?.returnKeyType}
        onSubmitEditing={fieldProps?.onSubmitEditing}
        blurOnSubmit={fieldProps?.blurOnSubmit}
        submitBehavior={multiline ? 'newline' : 'submit'}
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
