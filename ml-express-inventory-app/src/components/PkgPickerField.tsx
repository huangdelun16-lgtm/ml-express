import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { fmt, useTranslation } from '../i18n';
import type { PackedShipmentDetail } from '../types/inventory';
import { packDestinationFromBarcode } from '../utils/packageNumber';

type Props = {
  label?: string;
  packs: PackedShipmentDetail[];
  selectedIds: Set<string>;
  loading?: boolean;
  onToggle: (pack: PackedShipmentDetail) => void;
  onClear: () => void;
};

export default function PkgPickerField({
  label,
  packs,
  selectedIds,
  loading = false,
  onToggle,
  onClear,
}: Props) {
  const { t, fmt } = useTranslation();
  const resolvedLabel = label ?? 'PKG';
  const [open, setOpen] = useState(false);

  const selectedPacks = useMemo(
    () => packs.filter((p) => selectedIds.has(p.id)),
    [packs, selectedIds],
  );

  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{resolvedLabel} *</Text>
        {selectedIds.size > 0 ? (
          <Pressable onPress={onClear} hitSlop={8}>
            <Text style={styles.clear}>{t.forms.clearSelection}</Text>
          </Pressable>
        ) : null}
      </View>

      <Pressable
        style={styles.trigger}
        onPress={() => !loading && setOpen((v) => !v)}
        disabled={loading}
      >
        <Text style={[styles.triggerText, selectedIds.size === 0 && styles.placeholder]} numberOfLines={1}>
          {loading
            ? t.common.loading
            : selectedIds.size > 0
              ? fmt(t.forms.selectedCount, { count: selectedIds.size })
              : t.stockOut.selectPackHint}
        </Text>
        <Text style={styles.chevron}>{open ? '▲' : '▼'}</Text>
      </Pressable>

      {selectedPacks.length > 0 ? (
        <View style={styles.chips}>
          {selectedPacks.map((pack) => (
            <Pressable
              key={pack.id}
              style={styles.chip}
              onPress={() => onToggle(pack)}
            >
              <Text style={styles.chipText} numberOfLines={1}>
                {pack.bundle_barcode} ×
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {open ? (
        <View style={styles.panel}>
          <ScrollView style={styles.panelScroll} nestedScrollEnabled>
            {packs.length === 0 ? (
              <Text style={styles.empty}>{t.forms.noPacks}</Text>
            ) : (
              packs.map((pack) => {
                const packDest = packDestinationFromBarcode(pack.bundle_barcode);
                const active = selectedIds.has(pack.id);
                return (
                  <Pressable
                    key={pack.id}
                    style={[styles.option, active && styles.optionOn]}
                    onPress={() => onToggle(pack)}
                  >
                    <View style={[styles.checkbox, active && styles.checkboxOn]}>
                      <Text style={styles.checkboxMark}>{active ? '✓' : ''}</Text>
                    </View>
                    <View style={styles.optionBody}>
                      <Text style={[styles.optionCode, active && styles.optionCodeOn]} numberOfLines={1}>
                        {pack.bundle_barcode}
                      </Text>
                      <Text style={styles.optionMeta} numberOfLines={1}>
                        {packDest ? `[${packDest}] ` : ''}
                        {pack.bundle_name}
                        {pack.weight ? ` · ${pack.weight}` : ''}
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
          <Pressable style={styles.doneBtn} onPress={() => setOpen(false)}>
            <Text style={styles.doneBtnText}>
              {t.forms.finishSelect} ({selectedIds.size})
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 12 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  label: { color: '#e2e8f0', fontWeight: '700', fontSize: 13 },
  clear: { color: '#f87171', fontWeight: '700', fontSize: 12 },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  triggerText: { color: '#0f172a', fontSize: 16, fontWeight: '600', flex: 1 },
  placeholder: { color: '#94a3b8', fontWeight: '500' },
  chevron: { color: '#64748b', fontSize: 12, marginLeft: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: {
    backgroundColor: 'rgba(124,58,237,0.2)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.35)',
    maxWidth: '100%',
  },
  chipText: { color: '#d8b4fe', fontSize: 11, fontWeight: '800', fontFamily: 'monospace' },
  panel: {
    marginTop: 8,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  panelScroll: { maxHeight: 260 },
  empty: { color: '#64748b', fontSize: 13, padding: 14, lineHeight: 20 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    gap: 10,
  },
  optionOn: { backgroundColor: 'rgba(124,58,237,0.15)' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  checkboxMark: { color: '#fff', fontWeight: '900', fontSize: 12 },
  optionBody: { flex: 1, minWidth: 0 },
  optionCode: { color: '#d8b4fe', fontSize: 14, fontWeight: '800', fontFamily: 'monospace' },
  optionCodeOn: { color: '#e9d5ff' },
  optionMeta: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  doneBtn: {
    backgroundColor: '#7c3aed',
    paddingVertical: 12,
    alignItems: 'center',
  },
  doneBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
