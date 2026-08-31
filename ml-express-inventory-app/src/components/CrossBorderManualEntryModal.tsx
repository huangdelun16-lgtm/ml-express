import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { resolveAppError, useTranslation } from '../i18n';
import { createCrossBorderManualEntry } from '../services/crossBorderManualEntryService';
import type { CrossBorderManualEntryKind } from '../services/crossBorderManualEntryService';
import type { InventoryStoreSession } from '../services/authService';
import { colors } from '../theme';
import AppText from './AppText';

type Props = {
  visible: boolean;
  store: InventoryStoreSession;
  hubCode: string;
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
  store,
  hubCode,
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
      const createdBy = `${store.storeCode} · ${operatorName || t.common.operator}`.trim();
      await createCrossBorderManualEntry(
        store,
        hubCode,
        {
          entry_date: entryDate.trim(),
          kind,
          amount: Math.round(numeric),
          category: category.trim(),
          note: note.trim(),
          createdBy,
        },
      );
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
          <AppText style={styles.title} myanmarWeight="bold">
            {t.manualEntry.title}
          </AppText>
          <AppText style={styles.subtitle} myanmarWeight="regular">
            {t.manualEntry.subtitle}
          </AppText>

          <View style={styles.kindRow}>
            <Pressable
              style={({ pressed }) => [
                styles.kindBtn,
                kind === 'expense' && styles.kindBtnExpenseOn,
                pressed && styles.pressed,
              ]}
              onPress={() => setKind('expense')}
              disabled={submitting}
            >
              <AppText
                style={[styles.kindBtnText, kind === 'expense' && styles.kindBtnTextOn]}
                myanmarWeight="bold"
              >
                {t.manualEntry.expense}
              </AppText>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.kindBtn,
                kind === 'income' && styles.kindBtnIncomeOn,
                pressed && styles.pressed,
              ]}
              onPress={() => setKind('income')}
              disabled={submitting}
            >
              <AppText
                style={[styles.kindBtnText, kind === 'income' && styles.kindBtnTextOnIncome]}
                myanmarWeight="bold"
              >
                {t.manualEntry.income}
              </AppText>
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <AppText style={styles.label} myanmarWeight="semibold">
              {t.manualEntry.date}
            </AppText>
            <TextInput
              style={styles.input}
              value={entryDate}
              onChangeText={setEntryDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.muted2}
              editable={!submitting}
            />

            <AppText style={styles.label} myanmarWeight="semibold">
              {t.manualEntry.amount}
            </AppText>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor={colors.muted2}
              keyboardType="decimal-pad"
              editable={!submitting}
            />

            <AppText style={styles.label} myanmarWeight="semibold">
              {t.manualEntry.category}
            </AppText>
            <TextInput
              style={styles.input}
              value={category}
              onChangeText={setCategory}
              placeholder={t.manualEntry.categoryPlaceholder}
              placeholderTextColor={colors.muted2}
              editable={!submitting}
            />

            <AppText style={styles.label} myanmarWeight="semibold">
              {t.manualEntry.note}
            </AppText>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={note}
              onChangeText={setNote}
              placeholder={t.manualEntry.notePlaceholder}
              placeholderTextColor={colors.muted2}
              multiline
              editable={!submitting}
            />

            {error ? (
              <AppText style={styles.error} myanmarWeight="semibold">
                {error}
              </AppText>
            ) : null}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
              onPress={handleClose}
              disabled={submitting}
            >
              <AppText style={styles.cancelText} myanmarWeight="bold">
                {t.common.cancel}
              </AppText>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.saveBtn,
                submitting && styles.saveBtnDisabled,
                pressed && !submitting && styles.pressed,
              ]}
              onPress={() => void handleSubmit()}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <AppText style={styles.saveText} myanmarWeight="bold">
                  {t.common.save}
                </AppText>
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
    backgroundColor: 'rgba(2,6,23,0.72)',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
    maxHeight: '88%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderMuted,
    marginBottom: 14,
  },
  title: { color: colors.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.2 },
  subtitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  kindRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  pressed: { opacity: 0.84 },
  kindBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  kindBtnExpenseOn: {
    borderColor: colors.danger,
    backgroundColor: 'rgba(248,113,113,0.12)',
  },
  kindBtnIncomeOn: {
    borderColor: colors.financeGreen,
    backgroundColor: 'rgba(52,211,153,0.12)',
  },
  kindBtnText: { color: colors.muted, fontSize: 15, fontWeight: '800' },
  kindBtnTextOn: { color: colors.danger },
  kindBtnTextOnIncome: { color: colors.financeGreen },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textArea: { minHeight: 88, textAlignVertical: 'top' },
  error: {
    color: colors.danger,
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
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderMuted,
  },
  cancelText: { color: colors.slateSoft, fontSize: 15, fontWeight: '800' },
  saveBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.purple,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveText: { color: colors.white, fontSize: 15, fontWeight: '800' },
});
