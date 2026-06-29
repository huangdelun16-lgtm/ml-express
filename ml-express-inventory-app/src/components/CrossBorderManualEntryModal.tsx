import React, { useEffect, useState } from 'react';
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
import { resolveAppError, useTranslation } from '../i18n';
import { createCrossBorderManualEntry } from '../services/crossBorderManualEntryService';
import type { CrossBorderManualEntryKind } from '../services/crossBorderManualEntryService';

type Props = {
  visible: boolean;
  storeCode: string;
  operatorName: string;
  onClose: () => void;
  onSaved: () => void;
};

function todayIsoDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function CrossBorderManualEntryModal({
  visible,
  storeCode,
  operatorName,
  onClose,
  onSaved,
}: Props) {
  const { t } = useTranslation();
  const [kind, setKind] = useState<CrossBorderManualEntryKind>('expense');
  const [entryDate, setEntryDate] = useState(todayIsoDate());
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setKind('expense');
    setEntryDate(todayIsoDate());
    setAmount('');
    setCategory('');
    setNote('');
    setError('');
    setSubmitting(false);
  };

  useEffect(() => {
    if (!visible) reset();
  }, [visible]);

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    const numeric = Number(amount.replace(/[^\d.]/g, ''));
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setError(t.manualEntry.amountInvalid);
      return;
    }
    if (!entryDate.trim()) {
      setError(t.manualEntry.dateRequired);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const createdBy = `${storeCode} · ${operatorName || t.common.operator}`.trim();
      await createCrossBorderManualEntry({
        entry_date: entryDate.trim(),
        kind,
        amount: Math.round(numeric),
        category: category.trim(),
        note: note.trim(),
        createdBy,
      });
      onSaved();
      handleClose();
    } catch (e: unknown) {
      setError(resolveAppError(t, e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>{t.manualEntry.title}</Text>
          <Text style={styles.subtitle}>{t.manualEntry.subtitle}</Text>

          <View style={styles.kindRow}>
            <Pressable
              style={[styles.kindBtn, kind === 'expense' && styles.kindBtnExpenseOn]}
              onPress={() => setKind('expense')}
              disabled={submitting}
            >
              <Text style={[styles.kindBtnText, kind === 'expense' && styles.kindBtnTextOn]}>
                {t.manualEntry.expense}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.kindBtn, kind === 'income' && styles.kindBtnIncomeOn]}
              onPress={() => setKind('income')}
              disabled={submitting}
            >
              <Text style={[styles.kindBtnText, kind === 'income' && styles.kindBtnTextOnIncome]}>
                {t.manualEntry.income}
              </Text>
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>{t.manualEntry.date}</Text>
            <TextInput
              style={styles.input}
              value={entryDate}
              onChangeText={setEntryDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#64748b"
              editable={!submitting}
            />

            <Text style={styles.label}>{t.manualEntry.amount}</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor="#64748b"
              keyboardType="decimal-pad"
              editable={!submitting}
            />

            <Text style={styles.label}>{t.manualEntry.category}</Text>
            <TextInput
              style={styles.input}
              value={category}
              onChangeText={setCategory}
              placeholder={t.manualEntry.categoryPlaceholder}
              placeholderTextColor="#64748b"
              editable={!submitting}
            />

            <Text style={styles.label}>{t.manualEntry.note}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={note}
              onChangeText={setNote}
              placeholder={t.manualEntry.notePlaceholder}
              placeholderTextColor="#64748b"
              multiline
              editable={!submitting}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={handleClose} disabled={submitting}>
              <Text style={styles.cancelText}>{t.common.cancel}</Text>
            </Pressable>
            <Pressable
              style={[styles.saveBtn, submitting && styles.saveBtnDisabled]}
              onPress={() => void handleSubmit()}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveText}>{t.common.save}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.65)',
  },
  sheet: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
    maxHeight: '88%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#475569',
    marginBottom: 12,
  },
  title: { color: '#f8fafc', fontSize: 20, fontWeight: '900' },
  subtitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  kindRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  kindBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0f172a',
  },
  kindBtnExpenseOn: {
    borderColor: '#f87171',
    backgroundColor: 'rgba(248,113,113,0.12)',
  },
  kindBtnIncomeOn: {
    borderColor: '#34d399',
    backgroundColor: 'rgba(52,211,153,0.12)',
  },
  kindBtnText: { color: '#94a3b8', fontSize: 15, fontWeight: '800' },
  kindBtnTextOn: { color: '#f87171' },
  kindBtnTextOnIncome: { color: '#34d399' },
  label: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textArea: { minHeight: 88, textAlignVertical: 'top' },
  error: {
    color: '#f87171',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  cancelText: { color: '#cbd5e1', fontSize: 15, fontWeight: '800' },
  saveBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#7c3aed',
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '900' },
});
