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
import {
  formatDisplayDate,
  isValidIsoDate,
  offsetFromTodayIsoDate,
  parseIsoDate,
  todayIsoDate,
  toIsoDateString,
} from '../utils/dateFormat';

type Props = {
  label?: string;
  value: string;
  onChange: (isoDate: string) => void;
};

const QUICK_OPTIONS = [
  { key: 'yesterday', label: '昨天', offset: -1 },
  { key: 'today', label: '今天', offset: 0 },
  { key: 'tomorrow', label: '明天', offset: 1 },
] as const;

export default function OutboundDateField({ label = '出库日期', value, onChange }: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const [draftDate, setDraftDate] = useState<Date>(() => parseIsoDate(value) ?? new Date());

  const displayText = useMemo(() => formatDisplayDate(value), [value]);
  const isToday = value === todayIsoDate();

  const openPicker = () => {
    setDraftDate(parseIsoDate(value) ?? new Date());
    setShowPicker(true);
  };

  const applyDate = (date: Date) => {
    onChange(toIsoDateString(date));
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
      <Text style={styles.label}>{label} *</Text>

      <View style={styles.quickRow}>
        {QUICK_OPTIONS.map((opt) => {
          const iso = offsetFromTodayIsoDate(opt.offset);
          const active = value === iso;
          return (
            <Pressable
              key={opt.key}
              style={[styles.quickBtn, active && styles.quickBtnOn]}
              onPress={() => onChange(iso)}
            >
              <Text style={[styles.quickText, active && styles.quickTextOn]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable style={styles.trigger} onPress={openPicker}>
        <View style={styles.triggerMain}>
          <Text style={styles.triggerIcon}>📅</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.triggerDate}>{displayText}</Text>
            <Text style={styles.triggerHint}>
              {isValidIsoDate(value) ? '点击打开日历选择' : '请选择有效日期'}
            </Text>
          </View>
        </View>
        {isToday ? (
          <View style={styles.todayBadge}>
            <Text style={styles.todayBadgeText}>今</Text>
          </View>
        ) : null}
      </Pressable>

      {Platform.OS === 'ios' ? (
        <Modal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
          <Pressable style={styles.overlay} onPress={() => setShowPicker(false)}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.sheetTitle}>选择出库日期</Text>
              <DateTimePicker
                value={draftDate}
                mode="date"
                display="spinner"
                locale="zh-CN"
                onChange={onPickerChange}
                style={styles.picker}
              />
              <View style={styles.sheetActions}>
                <Pressable style={styles.sheetGhost} onPress={() => setShowPicker(false)}>
                  <Text style={styles.sheetGhostText}>取消</Text>
                </Pressable>
                <Pressable style={styles.sheetPrimary} onPress={confirmIos}>
                  <Text style={styles.sheetPrimaryText}>确定</Text>
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
          onChange={onPickerChange}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 14 },
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
    backgroundColor: 'rgba(220,38,38,0.15)',
    borderColor: 'rgba(248,113,113,0.45)',
  },
  quickText: { color: '#94a3b8', fontWeight: '700', fontSize: 14 },
  quickTextOn: { color: '#fca5a5', fontWeight: '800' },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  triggerMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  triggerIcon: { fontSize: 22 },
  triggerDate: { color: '#0f172a', fontSize: 17, fontWeight: '800' },
  triggerHint: { color: '#64748b', fontSize: 12, marginTop: 2 },
  todayBadge: {
    backgroundColor: '#dc2626',
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
  sheetTitle: { color: '#f8fafc', fontSize: 17, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
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
    backgroundColor: '#dc2626',
  },
  sheetPrimaryText: { color: '#fff', fontWeight: '800' },
});
