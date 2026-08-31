import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { useTranslation, resolveAppError, getExceptionTypeLabel, fmt } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import { createInventoryException } from '../services/inventoryExceptionService';
import type { ExceptionReportTarget } from '../types/inventoryException';
import {
  EXCEPTION_PHOTO_MAX,
  INVENTORY_EXCEPTION_TYPES,
  exceptionNeedsQty,
  validateInventoryExceptionDraft,
  type InventoryExceptionType,
} from '../utils/inventoryException';
import { pickExceptionPhoto } from '../utils/exceptionPhotoPicker';
import { showTaskSuccess } from '../utils/taskSuccessAlert';

type Props = {
  visible: boolean;
  target: ExceptionReportTarget | null;
  onClose: () => void;
  onSubmitted?: () => void;
};

export default function ExceptionReportModal({ visible, target, onClose, onSubmitted }: Props) {
  const { t } = useTranslation();
  const { store, operatorName } = useAuth();
  const [type, setType] = useState<InventoryExceptionType | ''>('');
  const [note, setNote] = useState('');
  const [qtyExpected, setQtyExpected] = useState('');
  const [qtyActual, setQtyActual] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setType('');
    setNote('');
    setQtyExpected(target?.qtyExpected != null ? String(target.qtyExpected) : '');
    setQtyActual('');
    setPhotos([]);
    setError('');
    setSubmitting(false);
  }, [visible, target?.itemBarcode, target?.qtyExpected]);

  const showQty = exceptionNeedsQty(type);
  const canSubmit = useMemo(() => {
    return !validateInventoryExceptionDraft({
      type,
      note,
      photoCount: photos.length,
      qtyExpected,
      qtyActual,
    });
  }, [type, note, photos.length, qtyExpected, qtyActual]);

  const addPhoto = async (source: 'camera' | 'library') => {
    if (photos.length >= EXCEPTION_PHOTO_MAX) {
      setError(t.serviceErrors.exceptionPhotoLimit);
      return;
    }
    setError('');
    try {
      const uri = await pickExceptionPhoto(source);
      if (!uri) return;
      setPhotos((prev) => (prev.length >= EXCEPTION_PHOTO_MAX ? prev : [...prev, uri]));
    } catch (e) {
      setError(resolveAppError(t, e));
    }
  };

  const handleSubmit = async () => {
    if (!target || !store) return;
    const invalid = validateInventoryExceptionDraft({
      type,
      note,
      photoCount: photos.length,
      qtyExpected,
      qtyActual,
    });
    if (invalid) {
      setError(t.serviceErrors[invalid]);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await createInventoryException({
        store,
        operator: operatorName ?? t.common.operator,
        target,
        type: type as InventoryExceptionType,
        note,
        photoUris: photos,
        qtyExpected,
        qtyActual,
      });
      showTaskSuccess(t.exception.submitted, target.itemBarcode);
      onSubmitted?.();
      onClose();
    } catch (e) {
      setError(resolveAppError(t, e));
    } finally {
      setSubmitting(false);
    }
  };

  if (!target) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.overlay} onPress={submitting ? undefined : onClose}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <Text style={styles.title}>{t.exception.title}</Text>
            <Text style={styles.barcode} selectable>
              {target.expressBarcode || target.itemBarcode}
            </Text>
            {target.itemName ? (
              <Text style={styles.itemName} numberOfLines={1}>{target.itemName}</Text>
            ) : null}
            <Text style={styles.hint}>{t.exception.hint}</Text>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.label}>{t.exception.typeLabel}</Text>
              <View style={styles.chipRow}>
                {INVENTORY_EXCEPTION_TYPES.map((key) => {
                  const active = type === key;
                  return (
                    <Pressable
                      key={key}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setType(key)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {getExceptionTypeLabel(t, key)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {showQty ? (
                <View style={styles.qtyRow}>
                  <View style={styles.qtyField}>
                    <Text style={styles.label}>{t.exception.qtyExpected}</Text>
                    <TextInput
                      style={styles.input}
                      value={qtyExpected}
                      onChangeText={setQtyExpected}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#64748b"
                    />
                  </View>
                  <View style={styles.qtyField}>
                    <Text style={styles.label}>{t.exception.qtyActual}</Text>
                    <TextInput
                      style={styles.input}
                      value={qtyActual}
                      onChangeText={setQtyActual}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#64748b"
                    />
                  </View>
                </View>
              ) : null}

              <Text style={styles.label}>{t.exception.noteLabel}</Text>
              <TextInput
                style={[styles.input, styles.noteInput]}
                value={note}
                onChangeText={setNote}
                placeholder={t.exception.notePlaceholder}
                placeholderTextColor="#64748b"
                multiline
                maxLength={500}
              />

              <View style={styles.photoHead}>
                <Text style={styles.label}>{t.exception.photos}</Text>
                <Text style={styles.photoCount}>
                  {fmt(t.exception.photoCount, { n: photos.length })}
                </Text>
              </View>
              <View style={styles.photoGrid}>
                {photos.map((uri) => (
                  <View key={uri} style={styles.photoWrap}>
                    <Image source={{ uri }} style={styles.photo} />
                    <Pressable
                      style={styles.photoRemove}
                      onPress={() => setPhotos((prev) => prev.filter((item) => item !== uri))}
                    >
                      <Text style={styles.photoRemoveText}>{t.exception.removePhoto}</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
              {photos.length < EXCEPTION_PHOTO_MAX ? (
                <View style={styles.photoActions}>
                  <Pressable style={styles.photoBtn} onPress={() => void addPhoto('camera')}>
                    <Text style={styles.photoBtnText}>{t.exception.takePhoto}</Text>
                  </Pressable>
                  <Pressable style={styles.photoBtnGhost} onPress={() => void addPhoto('library')}>
                    <Text style={styles.photoBtnGhostText}>{t.exception.pickAlbum}</Text>
                  </Pressable>
                </View>
              ) : null}
            </ScrollView>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={[styles.submit, (!canSubmit || submitting) && styles.submitDisabled]}
              onPress={() => void handleSubmit()}
              disabled={!canSubmit || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>{t.exception.submit}</Text>
              )}
            </Pressable>
            <Pressable style={styles.cancel} onPress={onClose} disabled={submitting}>
              <Text style={styles.cancelText}>{t.common.close}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.78)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
    maxHeight: '92%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#475569',
    marginBottom: 12,
  },
  title: { color: '#f8fafc', fontSize: 18, fontWeight: '900' },
  barcode: { color: '#7dd3fc', fontSize: 13, fontWeight: '800', fontFamily: 'monospace', marginTop: 4 },
  itemName: { color: '#94a3b8', fontSize: 13, marginTop: 2 },
  hint: { color: '#cbd5e1', fontSize: 12, lineHeight: 18, marginTop: 8, marginBottom: 8 },
  scroll: { maxHeight: 420 },
  scrollContent: { paddingBottom: 8, gap: 4 },
  label: { color: '#e2e8f0', fontSize: 13, fontWeight: '800', marginTop: 10, marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#475569',
  },
  chipActive: { backgroundColor: 'rgba(245,158,11,0.2)', borderColor: '#f59e0b' },
  chipText: { color: '#cbd5e1', fontWeight: '800', fontSize: 13 },
  chipTextActive: { color: '#fcd34d' },
  qtyRow: { flexDirection: 'row', gap: 10 },
  qtyField: { flex: 1 },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#475569',
    borderRadius: 12,
    color: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '700',
  },
  noteInput: { minHeight: 80, textAlignVertical: 'top' },
  photoHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  photoCount: { color: '#94a3b8', fontSize: 12, fontWeight: '700' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoWrap: { width: 88, gap: 4 },
  photo: { width: 88, height: 88, borderRadius: 10, backgroundColor: '#0f172a' },
  photoRemove: { alignItems: 'center' },
  photoRemoveText: { color: '#f87171', fontSize: 11, fontWeight: '800' },
  photoActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  photoBtn: {
    flex: 1,
    backgroundColor: '#d97706',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  photoBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  photoBtnGhost: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  photoBtnGhostText: { color: '#e2e8f0', fontWeight: '800', fontSize: 14 },
  error: { color: '#fca5a5', fontSize: 13, fontWeight: '700', marginTop: 8 },
  submit: {
    backgroundColor: '#d97706',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 12,
  },
  submitDisabled: { opacity: 0.45 },
  submitText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  cancel: { paddingVertical: 10, alignItems: 'center' },
  cancelText: { color: '#64748b', fontWeight: '700', fontSize: 15 },
});
