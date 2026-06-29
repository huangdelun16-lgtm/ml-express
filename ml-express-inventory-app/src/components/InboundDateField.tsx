import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from '../i18n';
import {
  formatInboundDateLabel,
  formatInboundDateYmd,
  todayInMyanmar,
} from '../utils/stockInDate';

type Props = {
  label?: string;
  value: Date;
  onChange: (date: Date) => void;
  maximumDate?: Date;
};

function offsetMyanmarDate(base: Date, days: number): Date {
  const ymd = formatInboundDateYmd(base);
  const d = new Date(`${ymd}T12:00:00+06:30`);
  d.setDate(d.getDate() + days);
  return d;
}

function isSameMyanmarDay(a: Date, b: Date): boolean {
  return formatInboundDateYmd(a) === formatInboundDateYmd(b);
}

export default function InboundDateField({
  label,
  value,
  onChange,
  maximumDate = todayInMyanmar(),
}: Props) {
  const { t } = useTranslation();
  const resolvedLabel = label ?? t.forms.inboundDate;
  const quickOptions = [
    { key: 'yesterday', label: t.forms.yesterday, offset: -1 },
    { key: 'today', label: t.forms.today, offset: 0 },
  ] as const;
  const [showPicker, setShowPicker] = useState(false);
  const [draftDate, setDraftDate] = useState<Date>(value);

  const today = useMemo(() => todayInMyanmar(), []);
  const isToday = isSameMyanmarDay(value, today);
  const ymd = formatInboundDateYmd(value);

  const openPicker = () => {
    setDraftDate(value);
    setShowPicker(true);
  };

  const applyDate = (date: Date) => {
    if (date.getTime() > maximumDate.getTime()) {
      onChange(maximumDate);
      return;
    }
    onChange(date);
  };

  const onPickerChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (event.type === 'set' && date) applyDate(date);
      return;
    }
    if (date) setDraftDate(date);
  };

  const confirmIos = () => {
    applyDate(draftDate);
    setShowPicker(false);
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{resolvedLabel} *</Text>

      <View style={styles.quickRow}>
        {quickOptions.map((opt) => {
          const candidate = offsetMyanmarDate(today, opt.offset);
          const disabled = candidate.getTime() > maximumDate.getTime();
          const active = isSameMyanmarDay(value, candidate);
          return (
            <Pressable
              key={opt.key}
              style={[styles.quickBtn, active && styles.quickBtnOn, disabled && styles.quickBtnDisabled]}
              onPress={() => !disabled && onChange(candidate)}
              disabled={disabled}
            >
              <Text style={[styles.quickText, active && styles.quickTextOn, disabled && styles.quickTextDisabled]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable style={styles.trigger} onPress={openPicker}>
        <View style={styles.triggerMain}>
          <View style={styles.iconWrap}>
            <Text style={styles.triggerIcon}>📅</Text>
          </View>
          <View style={styles.triggerTextCol}>
            <Text style={styles.triggerDate}>{formatInboundDateLabel(value)}</Text>
            <Text style={styles.triggerYmd}>{ymd}</Text>
          </View>
        </View>
        {isToday ? (
          <View style={styles.todayBadge}>
            <Text style={styles.todayBadgeText}>{t.forms.today}</Text>
          </View>
        ) : null}
      </Pressable>

      {Platform.OS === 'ios' ? (
        <Modal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
          <Pressable style={styles.overlay} onPress={() => setShowPicker(false)}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.sheetTitle}>{t.forms.inboundDate}</Text>
              <DateTimePicker
                value={draftDate}
                mode="date"
                display="spinner"
                locale="zh-CN"
                maximumDate={maximumDate}
                onChange={onPickerChange}
                style={styles.picker}
              />
              <View style={styles.sheetActions}>
                <Pressable style={styles.sheetGhost} onPress={() => setShowPicker(false)}>
                  <Text style={styles.sheetGhostText}>{t.common.cancel}</Text>
                </Pressable>
                <Pressable style={styles.sheetPrimary} onPress={confirmIos}>
                  <Text style={styles.sheetPrimaryText}>{t.common.confirm}</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}

      {Platform.OS === 'android' && showPicker ? (
        <DateTimePicker
          value={draftDate}
          mode="date"
          display="default"
          maximumDate={maximumDate}
          onChange={onPickerChange}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 4 },
  label: { color: '#e2e8f0', fontWeight: '700', marginBottom: 8, fontSize: 13 },
  quickRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  quickBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
  },
  quickBtnOn: {
    backgroundColor: 'rgba(5,150,105,0.18)',
    borderColor: 'rgba(52,211,153,0.5)',
  },
  quickBtnDisabled: { opacity: 0.35 },
  quickText: { color: '#94a3b8', fontWeight: '700', fontSize: 14 },
  quickTextOn: { color: '#6ee7b7', fontWeight: '800' },
  quickTextDisabled: { color: '#64748b' },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  triggerMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerIcon: { fontSize: 20 },
  triggerTextCol: { flex: 1 },
  triggerDate: { color: '#0f172a', fontSize: 16, fontWeight: '800', lineHeight: 22 },
  triggerYmd: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 2,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  todayBadge: {
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  todayBadgeText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  sheetTitle: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  picker: { alignSelf: 'center' },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  sheetGhost: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  sheetGhostText: { color: '#cbd5e1', fontWeight: '700' },
  sheetPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#059669',
  },
  sheetPrimaryText: { color: '#fff', fontWeight: '800' },
});
