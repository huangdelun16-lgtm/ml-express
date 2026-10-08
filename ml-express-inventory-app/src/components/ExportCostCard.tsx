import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Text from './AppText';
import { useTranslation } from '../i18n';
import {
  exportCostLineTotal,
  type ExportCostBoard,
  type ExportCostPackageRow,
  type ExportCostSingleRow,
} from '../utils/exportCostBoard';
import {
  exportCostKey,
  type ExportLegDestination,
  type SavedExportCost,
} from '../services/exportCostService';

type Props = {
  board: ExportCostBoard;
  loading: boolean;
  error?: string;
  saved: SavedExportCost[];
  onOpen: () => void;
  onAdd: (draft: {
    kind: 'single' | 'package';
    subjectKey: string;
    displayBarcode: string;
    customer: string;
    destination: string;
    legDestination: ExportLegDestination;
    weightKg: number;
    unitPriceCny: number;
    tripNumber: string;
  }) => Promise<void>;
};

type Line = {
  key: string;
  kind: 'single' | 'package';
  subjectKey: string;
  title: string;
  customer: string;
  destination: string;
  weightKg: number;
  tripNumber: string;
  meta: string;
};

export default function ExportCostCard({ board, loading, error, saved, onOpen, onAdd }: Props) {
  const { t, fmt } = useTranslation();
  const { height } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [leg, setLeg] = useState<ExportLegDestination | ''>('');
  const [menu, setMenu] = useState(false);
  const [price, setPrice] = useState('');
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const empty = board.singles.length === 0 && board.packages.length === 0;
  const savedByKey = new Map(saved.map((row) => [exportCostKey(row.subjectKind, row.subjectKey), row]));

  const close = () => {
    setOpen(false);
    setOpenKey(null);
    setMenu(false);
  };

  const toggleLine = (line: Line) => {
    if (savedByKey.has(line.key)) return;
    setFormError('');
    setMenu(false);
    if (openKey === line.key) {
      setOpenKey(null);
      return;
    }
    setOpenKey(line.key);
    setLeg('');
    setPrice('');
  };

  const submit = async (line: Line) => {
    const unit = Number(price);
    if (!leg || !(unit > 0) || !(line.weightKg > 0) || savingKey) return;
    setSavingKey(line.key);
    setFormError('');
    try {
      await onAdd({
        kind: line.kind,
        subjectKey: line.subjectKey,
        displayBarcode: line.title,
        customer: line.customer,
        destination: line.destination,
        legDestination: leg,
        weightKg: line.weightKg,
        unitPriceCny: unit,
        tripNumber: line.tripNumber,
      });
      setOpenKey(null);
      setMenu(false);
      setPrice('');
      setLeg('');
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setFormError(/already added/i.test(message) ? t.home.exportCostAlready : t.home.exportCostSaveFailed);
    } finally {
      setSavingKey(null);
    }
  };

  const singles = board.singles.map((row) => toSingleLine(row, t, fmt));
  const packages = board.packages.map((row) => toPackageLine(row, t, fmt));

  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={() => {
          setOpen(true);
          onOpen();
        }}
        accessibilityRole="button"
        accessibilityLabel={t.home.exportCostTitle}
      >
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>💴</Text>
        </View>
        <View style={styles.copy}>
          <Text style={styles.rowTitle}>{t.home.exportCostTitle}</Text>
          <Text style={styles.rowHint}>{t.home.exportCostHint}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={close} accessibilityLabel={t.common.close} />
          <View style={[styles.sheet, { maxHeight: height * 0.88 }]}>
            <Text style={styles.sheetTitle}>{t.home.exportCostTitle}</Text>
            <Text style={styles.sheetHint}>{t.home.exportCostBody}</Text>
            <ScrollView
              style={{ maxHeight: height * 0.64 }}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
            >
              {loading && empty ? <Text style={styles.empty}>{t.common.loading}</Text> : null}
              {!loading && error ? <Text style={styles.empty}>{error}</Text> : null}
              {!loading && !error && empty ? <Text style={styles.empty}>{t.home.exportCostEmpty}</Text> : null}
              <CostSection
                title={`${t.home.exportCostSingle} ${board.singles.length}`}
                lines={singles}
                openKey={openKey}
                savedByKey={savedByKey}
                leg={leg}
                menu={menu}
                price={price}
                savingKey={savingKey}
                formError={formError}
                onToggle={toggleLine}
                onLeg={(next) => {
                  setLeg(next);
                  setMenu(false);
                }}
                onMenu={() => setMenu((value) => !value)}
                onPrice={setPrice}
                onSubmit={(line) => void submit(line)}
              />
              <CostSection
                title={`${t.home.exportCostPackage} ${board.packages.length}`}
                lines={packages}
                openKey={openKey}
                savedByKey={savedByKey}
                leg={leg}
                menu={menu}
                price={price}
                savingKey={savingKey}
                formError={formError}
                onToggle={toggleLine}
                onLeg={(next) => {
                  setLeg(next);
                  setMenu(false);
                }}
                onMenu={() => setMenu((value) => !value)}
                onPrice={setPrice}
                onSubmit={(line) => void submit(line)}
              />
            </ScrollView>
            <Pressable style={styles.closeBtn} onPress={close} accessibilityRole="button">
              <Text style={styles.closeText}>{t.common.close}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

function toSingleLine(
  row: ExportCostSingleRow,
  t: ReturnType<typeof useTranslation>['t'],
  fmt: ReturnType<typeof useTranslation>['fmt'],
): Line {
  return {
    key: exportCostKey('single', row.id),
    kind: 'single',
    subjectKey: row.id,
    title: row.barcode,
    customer: row.customer,
    destination: row.destination,
    weightKg: row.weightKg,
    tripNumber: row.tripNumber,
    meta: [
      row.customer,
      row.destination,
      row.weightKg > 0 ? `${trimKg(row.weightKg)} Kg` : '',
      row.tripNumber ? fmt(t.home.exportCostTrip, { trip: row.tripNumber }) : t.home.exportCostTripEmpty,
    ]
      .filter(Boolean)
      .join(' · '),
  };
}

function toPackageLine(
  row: ExportCostPackageRow,
  t: ReturnType<typeof useTranslation>['t'],
  fmt: ReturnType<typeof useTranslation>['fmt'],
): Line {
  return {
    key: exportCostKey('package', row.base),
    kind: 'package',
    subjectKey: row.base,
    title: row.base,
    customer: row.customer,
    destination: row.destination,
    weightKg: row.weightKg,
    tripNumber: row.tripNumber,
    meta: [
      row.customer,
      row.destination,
      `${row.pieceCount}/${row.declaredTotal}`,
      fmt(t.home.exportCostTotalWeight, { kg: row.weightKg > 0 ? trimKg(row.weightKg) : '—' }),
      row.tripNumber ? fmt(t.home.exportCostTrip, { trip: row.tripNumber }) : t.home.exportCostTripEmpty,
    ]
      .filter(Boolean)
      .join(' · '),
  };
}

function trimKg(kg: number): string {
  return kg % 1 === 0 ? String(kg) : String(Math.round(kg * 100) / 100);
}

function CostSection({
  title,
  lines,
  openKey,
  savedByKey,
  leg,
  menu,
  price,
  savingKey,
  formError,
  onToggle,
  onLeg,
  onMenu,
  onPrice,
  onSubmit,
}: {
  title: string;
  lines: Line[];
  openKey: string | null;
  savedByKey: Map<string, SavedExportCost>;
  leg: ExportLegDestination | '';
  menu: boolean;
  price: string;
  savingKey: string | null;
  formError: string;
  onToggle: (line: Line) => void;
  onLeg: (leg: ExportLegDestination) => void;
  onMenu: () => void;
  onPrice: (value: string) => void;
  onSubmit: (line: Line) => void;
}) {
  const { t, fmt } = useTranslation();
  if (lines.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {lines.map((line, index) => {
        const saved = savedByKey.get(line.key);
        const expanded = openKey === line.key && !saved;
        const unit = Number(price);
        const total = exportCostLineTotal(unit, line.weightKg);
        const legLabel = leg === 'MSE' ? t.home.exportCostMse : leg === 'LSO' ? t.home.exportCostLso : t.home.exportCostPickDest;
        return (
          <View key={line.key} style={[styles.item, index > 0 && styles.itemBorder]}>
            <Pressable onPress={() => onToggle(line)} disabled={Boolean(saved)} accessibilityRole="button">
              <Text style={styles.itemTitle} numberOfLines={1}>
                {line.title}
              </Text>
              {line.meta ? (
                <Text style={styles.itemMeta} numberOfLines={2}>
                  {line.meta}
                </Text>
              ) : null}
              {saved ? (
                <Text style={styles.added}>
                  {t.home.exportCostAdded} · {t.home.exportCostRoute} →{' '}
                  {saved.legDestination === 'MSE' ? t.home.exportCostMse : t.home.exportCostLso} · ¥
                  {trimKg(saved.totalCny)}
                </Text>
              ) : null}
            </Pressable>
            {expanded ? (
              <View style={styles.form}>
                <View style={styles.formRow}>
                  <Text style={styles.route}>{t.home.exportCostRoute} →</Text>
                  <Pressable style={styles.select} onPress={onMenu} accessibilityRole="button">
                    <Text style={styles.selectText} numberOfLines={1}>
                      {legLabel}
                    </Text>
                  </Pressable>
                  <TextInput
                    style={styles.price}
                    value={price}
                    onChangeText={(value) => onPrice(value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1'))}
                    keyboardType="decimal-pad"
                    placeholder="¥"
                    placeholderTextColor="#64748b"
                  />
                  <Pressable
                    style={[styles.addBtn, (!(leg && unit > 0 && line.weightKg > 0) || savingKey === line.key) && styles.addBtnOff]}
                    onPress={() => onSubmit(line)}
                    disabled={!(leg && unit > 0 && line.weightKg > 0) || savingKey === line.key}
                    accessibilityRole="button"
                  >
                    {savingKey === line.key ? (
                      <ActivityIndicator color="#0f172a" size="small" />
                    ) : (
                      <Text style={styles.addText}>{t.home.exportCostAdd}</Text>
                    )}
                  </Pressable>
                </View>
                {menu ? (
                  <View style={styles.menu}>
                    <Pressable style={styles.menuItem} onPress={() => onLeg('MSE')}>
                      <Text style={styles.menuText}>{t.home.exportCostMse}</Text>
                    </Pressable>
                    <Pressable style={styles.menuItem} onPress={() => onLeg('LSO')}>
                      <Text style={styles.menuText}>{t.home.exportCostLso}</Text>
                    </Pressable>
                  </View>
                ) : null}
                {line.weightKg > 0 && unit > 0 ? (
                  <Text style={styles.calc}>
                    {fmt(t.home.exportCostLineTotal, {
                      unit: trimKg(unit),
                      kg: trimKg(line.weightKg),
                      total: trimKg(total),
                    })}
                  </Text>
                ) : (
                  <Text style={styles.calcMuted}>
                    {line.weightKg > 0 ? '' : t.home.exportCostNeedWeight}
                  </Text>
                )}
                {formError ? <Text style={styles.formError}>{formError}</Text> : null}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.32)',
  },
  rowPressed: { opacity: 0.82 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
  },
  icon: { fontSize: 22 },
  copy: { flex: 1, minWidth: 0 },
  rowTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '800' },
  rowHint: { color: '#94a3b8', fontSize: 12, fontWeight: '600', marginTop: 2, lineHeight: 16 },
  chevron: { fontSize: 28, fontWeight: '300', lineHeight: 28, color: '#fbbf24' },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(15,23,42,0.82)',
  },
  sheet: {
    width: '100%',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
    zIndex: 1,
  },
  sheetTitle: { color: '#fbbf24', fontSize: 18, fontWeight: '800' },
  sheetHint: { color: '#94a3b8', fontSize: 12, marginTop: 4, marginBottom: 8, lineHeight: 16 },
  list: { paddingBottom: 4 },
  empty: { color: '#94a3b8', fontSize: 13, paddingVertical: 16 },
  section: { marginTop: 8 },
  sectionTitle: { color: '#e2e8f0', fontSize: 13, fontWeight: '800', marginBottom: 4 },
  item: { paddingVertical: 8 },
  itemBorder: { borderTopWidth: 1, borderTopColor: 'rgba(148, 163, 184, 0.18)' },
  itemTitle: { color: '#f8fafc', fontSize: 14, fontWeight: '700' },
  itemMeta: { marginTop: 2, color: '#94a3b8', fontSize: 12, lineHeight: 16 },
  added: { marginTop: 4, color: '#4ade80', fontSize: 12, fontWeight: '800' },
  form: { marginTop: 8, gap: 6 },
  formRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  route: { color: '#fbbf24', fontSize: 13, fontWeight: '800' },
  select: {
    flex: 1,
    minWidth: 72,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.45)',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#0f172a',
  },
  selectText: { color: '#f8fafc', fontSize: 12, fontWeight: '700' },
  price: {
    width: 72,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 8,
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
    backgroundColor: '#0f172a',
  },
  addBtn: {
    borderRadius: 8,
    backgroundColor: '#fbbf24',
    paddingHorizontal: 12,
    paddingVertical: 9,
    minWidth: 56,
    alignItems: 'center',
  },
  addBtnOff: { opacity: 0.45 },
  addText: { color: '#0f172a', fontSize: 13, fontWeight: '800' },
  menu: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
    backgroundColor: '#0f172a',
    overflow: 'hidden',
  },
  menuItem: { paddingHorizontal: 10, paddingVertical: 10 },
  menuText: { color: '#f8fafc', fontSize: 13, fontWeight: '700' },
  calc: { color: '#fde68a', fontSize: 12, fontWeight: '700' },
  calcMuted: { color: '#64748b', fontSize: 12 },
  formError: { color: '#fca5a5', fontSize: 12, fontWeight: '700' },
  closeBtn: {
    marginTop: 10,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
  },
  closeText: { color: '#fbbf24', fontSize: 15, fontWeight: '800' },
});
