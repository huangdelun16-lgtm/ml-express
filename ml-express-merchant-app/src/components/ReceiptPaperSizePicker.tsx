import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getReceiptPaperLabel,
  RECEIPT_PAPER_WIDTH_OPTIONS,
  type ReceiptPaperWidthMm,
} from '../constants/receiptPaper';

type Props = {
  language: string;
  value: ReceiptPaperWidthMm;
  onChange: (width: ReceiptPaperWidthMm) => void;
  sectionLabel: string;
  hint?: string;
  compact?: boolean;
};

export default function ReceiptPaperSizePicker({
  language,
  value,
  onChange,
  sectionLabel,
  hint,
  compact = false,
}: Props) {
  const [open, setOpen] = useState(false);

  const handleSelect = (width: ReceiptPaperWidthMm) => {
    onChange(width);
    setOpen(false);
  };

  return (
    <View style={[styles.section, compact && styles.sectionCompact]}>
      <Text style={styles.label}>{sectionLabel}</Text>
      <Pressable
        style={[styles.select, compact && styles.selectCompact]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
      >
        <Text style={styles.selectText}>{getReceiptPaperLabel(value, language)}</Text>
        <Ionicons name="chevron-down" size={18} color="#94a3b8" />
      </Pressable>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>{sectionLabel}</Text>
            <ScrollView style={styles.optionList} bounces={false}>
              {RECEIPT_PAPER_WIDTH_OPTIONS.map((width) => {
                const active = value === width;
                return (
                  <Pressable
                    key={width}
                    style={[styles.option, active && styles.optionActive]}
                    onPress={() => handleSelect(width)}
                  >
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>
                      {getReceiptPaperLabel(width, language)}
                    </Text>
                    {active ? <Ionicons name="checkmark" size={18} color="#38bdf8" /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable style={styles.cancelBtn} onPress={() => setOpen(false)}>
              <Text style={styles.cancelText}>
                {language === 'zh' ? '取消' : 'Cancel'}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 12,
    gap: 8,
  },
  sectionCompact: {
    marginBottom: 10,
  },
  label: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#475569',
    backgroundColor: '#0f172a',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  selectCompact: {
    paddingVertical: 10,
  },
  selectText: {
    color: '#e2e8f0',
    fontWeight: '700',
    fontSize: 14,
    flex: 1,
  },
  hint: {
    color: '#64748b',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.72)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
    maxHeight: '70%',
  },
  sheetTitle: {
    color: '#7dd3fc',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 12,
  },
  optionList: {
    maxHeight: 280,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
  },
  optionActive: {
    borderColor: '#0284c7',
    backgroundColor: '#0c4a6e',
  },
  optionText: {
    color: '#cbd5e1',
    fontWeight: '700',
    fontSize: 14,
  },
  optionTextActive: {
    color: '#e0f2fe',
  },
  cancelBtn: {
    marginTop: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#475569',
  },
  cancelText: {
    color: '#94a3b8',
    fontWeight: '800',
    fontSize: 14,
  },
});
