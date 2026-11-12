import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Text from './AppText';
import PhoneBarcodeScanModal from './PhoneBarcodeScanModal';
import { useTranslation } from '../i18n';
import {
  exportCostLineTotal,
  matchesExportCostQuery,
  settleExportCost,
  withoutSavedExportCosts,
  type ExportCostBoard,
  type ExportCostPackageRow,
  type ExportCostSingleRow,
} from '../utils/exportCostBoard';
import {
  exportCostKey,
  type ExportLegDestination,
  type SavedExportCost,
} from '../services/exportCostService';
import { normalizeScanCode } from '../utils/barcodeScan';

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
    payCurrency: 'CNY' | 'MMK';
    mmkPerCny: number | null;
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
  pieces: string;
  meta: string;
};

export default function ExportCostCard({ board, loading, error, saved, onOpen, onAdd }: Props) {
  const { t, fmt } = useTranslation();
  const { height } = useWindowDimensions();
  const listRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const focusedField = useRef<View | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [scanOpen, setScanOpen] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [leg, setLeg] = useState<ExportLegDestination | ''>('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState<'CNY' | 'MMK' | ''>('');
  const [rate, setRate] = useState('');
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const pending = withoutSavedExportCosts(board, saved);
  const empty = pending.singles.length === 0 && pending.packages.length === 0;
  const savedByKey = new Map(saved.map((row) => [exportCostKey(row.subjectKind, row.subjectKey), row]));

  const revealFocused = (kb: number) => {
    const node = focusedField.current;
    if (!node || kb <= 0) return;
    node.measureInWindow((_x, y, _w, fieldHeight) => {
      const visibleBottom = height - kb - 16;
      const overflow = y + fieldHeight - visibleBottom;
      if (overflow > 0) {
        listRef.current?.scrollTo({ y: scrollY.current + overflow + 12, animated: true });
      }
    });
  };

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (event) => {
      const next = event.endCoordinates.height;
      setKeyboardHeight(next);
      setTimeout(() => revealFocused(next), 80);
    });
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [height]);

  const close = () => {
    setOpen(false);
    setScanOpen(false);
    setOpenKey(null);
    setQuery('');
  };

  const toggleLine = (line: Line) => {
    if (savedByKey.has(line.key) || line.weightKg <= 0) return;
    setFormError('');
    if (openKey === line.key) {
      setOpenKey(null);
      return;
    }
    setOpenKey(line.key);
    setLeg('');
    setPrice('');
    setCurrency('');
    setRate('');
  };

  const submit = async (line: Line) => {
    const unit = Number(price);
    if (price.trim() === '' || !Number.isFinite(unit) || unit < 0) return;
    const totalCny = exportCostLineTotal(unit, line.weightKg);
    const mmkPerCny = Number(rate);
    const free = unit === 0;
    const settled =
      currency === 'CNY' || currency === 'MMK'
        ? settleExportCost({
            totalCny,
            currency,
            mmkPerCny: currency === 'MMK' && !free ? mmkPerCny : null,
          })
        : null;
    if (!leg || !settled || savingKey) return;
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
        payCurrency: currency === 'MMK' && !free ? 'MMK' : 'CNY',
        mmkPerCny: currency === 'MMK' && !free ? mmkPerCny : null,
        tripNumber: line.tripNumber,
      });
      setOpenKey(null);
      setPrice('');
      setLeg('');
      setCurrency('');
      setRate('');
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setFormError(/already added/i.test(message) ? t.home.exportCostAlready : t.home.exportCostSaveFailed);
    } finally {
      setSavingKey(null);
    }
  };

  const singles = useMemo(
    () =>
      pending.singles
        .filter((row) =>
          matchesExportCostQuery(query, [row.barcode, row.customer, row.destination, row.tripNumber]),
        )
        .map((row) => toSingleLine(row, t, fmt)),
    [pending.singles, query, t, fmt],
  );
  const packages = useMemo(
    () =>
      pending.packages
        .filter((row) =>
          matchesExportCostQuery(query, [row.base, row.customer, row.destination, row.tripNumber]),
        )
        .map((row) => toPackageLine(row, t, fmt)),
    [pending.packages, query, t, fmt],
  );
  const noMatch = !empty && singles.length === 0 && packages.length === 0;

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
        <View style={[styles.overlay, keyboardHeight > 0 && { justifyContent: 'flex-end', paddingBottom: 8 }]}>
          <Pressable style={styles.backdrop} onPress={close} accessibilityLabel={t.common.close} />
          <View
            style={[
              styles.sheet,
              {
                maxHeight: Math.max(280, height - keyboardHeight - (keyboardHeight > 0 ? 20 : height * 0.08)),
                marginBottom: keyboardHeight,
              },
            ]}
          >
            <Text style={styles.sheetTitle}>{t.home.exportCostTitle}</Text>
            <Text style={styles.sheetHint}>{t.home.exportCostBody}</Text>
            <View style={styles.searchRow}>
              <TextInput
                style={styles.search}
                value={query}
                onChangeText={setQuery}
                placeholder={t.home.exportCostSearch}
                placeholderTextColor="#64748b"
                autoCorrect={false}
                autoCapitalize="none"
              />
              <Pressable
                style={styles.scanBtn}
                onPress={() => {
                  Keyboard.dismiss();
                  setScanOpen(true);
                }}
                accessibilityRole="button"
                accessibilityLabel={t.scanInput.scanBtn}
              >
                <Text style={styles.scanBtnText} myanmarWeight="bold">
                  {t.scanInput.scanBtn}
                </Text>
              </Pressable>
            </View>
            <ScrollView
              ref={listRef}
              style={{
                maxHeight: Math.max(
                  160,
                  height - keyboardHeight - (keyboardHeight > 0 ? 168 : height * 0.28),
                ),
              }}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              onScroll={(event) => {
                scrollY.current = event.nativeEvent.contentOffset.y;
              }}
              scrollEventThrottle={16}
            >
              {loading && empty ? <Text style={styles.empty}>{t.common.loading}</Text> : null}
              {!loading && error ? <Text style={styles.empty}>{error}</Text> : null}
              {!loading && !error && empty ? <Text style={styles.empty}>{t.home.exportCostEmpty}</Text> : null}
              {!loading && !error && noMatch ? <Text style={styles.empty}>{t.home.exportCostNone}</Text> : null}
              <CostSection
                title={`${t.home.exportCostSingle} ${singles.length}`}
                lines={singles}
                openKey={openKey}
                savedByKey={savedByKey}
                leg={leg}
                price={price}
                currency={currency}
                rate={rate}
                savingKey={savingKey}
                formError={formError}
                onToggle={toggleLine}
                onLeg={setLeg}
                onPrice={setPrice}
                onCurrency={setCurrency}
                onRate={setRate}
                onSubmit={(line) => void submit(line)}
                onFieldFocus={(node) => {
                  focusedField.current = node;
                  setTimeout(() => revealFocused(keyboardHeight || 320), 60);
                }}
              />
              <CostSection
                title={`${t.home.exportCostPackage} ${packages.length}`}
                lines={packages}
                openKey={openKey}
                savedByKey={savedByKey}
                leg={leg}
                price={price}
                currency={currency}
                rate={rate}
                savingKey={savingKey}
                formError={formError}
                onToggle={toggleLine}
                onLeg={setLeg}
                onPrice={setPrice}
                onCurrency={setCurrency}
                onRate={setRate}
                onSubmit={(line) => void submit(line)}
                onFieldFocus={(node) => {
                  focusedField.current = node;
                  setTimeout(() => revealFocused(keyboardHeight || 320), 60);
                }}
              />
            </ScrollView>
            <Pressable style={styles.closeBtn} onPress={close} accessibilityRole="button">
              <Text style={styles.closeText}>{t.common.close}</Text>
            </Pressable>
          </View>
          {scanOpen ? (
            <View style={styles.scanCover}>
              <PhoneBarcodeScanModal
                embedded
                visible
                onClose={() => setScanOpen(false)}
                onScanned={(code) => {
                  const normalized = normalizeScanCode(code);
                  if (normalized) setQuery(normalized);
                  setScanOpen(false);
                }}
                title={t.scanInput.phoneScan}
              />
            </View>
          ) : null}
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
    pieces: '',
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
    pieces: `${row.pieceCount}/${row.declaredTotal}`,
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
  price,
  currency,
  rate,
  savingKey,
  formError,
  onToggle,
  onLeg,
  onPrice,
  onCurrency,
  onRate,
  onSubmit,
  onFieldFocus,
}: {
  title: string;
  lines: Line[];
  openKey: string | null;
  savedByKey: Map<string, SavedExportCost>;
  leg: ExportLegDestination | '';
  price: string;
  currency: 'CNY' | 'MMK' | '';
  rate: string;
  savingKey: string | null;
  formError: string;
  onToggle: (line: Line) => void;
  onLeg: (leg: ExportLegDestination) => void;
  onPrice: (value: string) => void;
  onCurrency: (currency: 'CNY' | 'MMK') => void;
  onRate: (value: string) => void;
  onSubmit: (line: Line) => void;
  onFieldFocus: (node: View | null) => void;
}) {
  const { t, fmt } = useTranslation();
  const hosts = useRef(new Map<string, View | null>());
  if (lines.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {lines.map((line) => {
        const saved = savedByKey.get(line.key);
        const expanded = openKey === line.key && !saved;
        const unit = Number(price);
        const priceFilled = price.trim() !== '' && Number.isFinite(unit) && unit >= 0;
        const total = priceFilled ? exportCostLineTotal(unit, line.weightKg) : 0;
        const mmkPerCny = Number(rate);
        const settled =
          priceFilled && (currency === 'CNY' || currency === 'MMK')
            ? settleExportCost({
                totalCny: total,
                currency,
                mmkPerCny: currency === 'MMK' ? mmkPerCny : null,
              })
            : null;
        const canAdd = Boolean(leg && settled) && savingKey !== line.key;
        return (
          <View key={line.key} style={[styles.item, line.weightKg <= 0 && styles.itemNoWeight]}>
            <Pressable onPress={() => onToggle(line)} disabled={Boolean(saved) || line.weightKg <= 0} accessibilityRole="button">
              <Text style={styles.itemTitle} numberOfLines={1}>
                {line.title}
              </Text>
              <View style={styles.chips}>
                {line.customer ? <Text style={styles.chip}>{line.customer}</Text> : null}
                {line.destination ? <Text style={styles.chip}>{line.destination}</Text> : null}
                {line.kind === 'package' && line.pieces ? <Text style={styles.chip}>{line.pieces}</Text> : null}
                {line.weightKg > 0 ? (
                  <Text style={styles.chip}>{trimKg(line.weightKg)} Kg</Text>
                ) : (
                  <Text style={styles.chipWarn}>{t.home.exportCostNoWeight}</Text>
                )}
                <Text style={styles.chip}>
                  {line.tripNumber ? fmt(t.home.exportCostTrip, { trip: line.tripNumber }) : t.home.exportCostTripEmpty}
                </Text>
              </View>
                {saved ? (
                  <Text style={styles.added}>
                    {t.home.exportCostAdded} · {t.home.exportCostRoute} →{' '}
                    {saved.legDestination === 'MSE' ? t.home.exportCostMse : t.home.exportCostLso}
                    {' · '}
                    {saved.payCurrency === 'MMK'
                      ? `${Math.round(saved.totalMmk).toLocaleString('en-US')} MMK`
                      : `¥${trimKg(saved.totalCny)}`}
                  </Text>
                ) : null}
            </Pressable>
            {expanded ? (
              <View style={styles.form}>
                <Text style={styles.formLabel}>{t.home.exportCostRoute} →</Text>
                <View style={styles.legRow}>
                  <Pressable
                    style={[styles.legChip, leg === 'MSE' && styles.legChipOn]}
                    onPress={() => onLeg('MSE')}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.legText, leg === 'MSE' && styles.legTextOn]}>{t.home.exportCostMse}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.legChip, leg === 'LSO' && styles.legChipOn]}
                    onPress={() => onLeg('LSO')}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.legText, leg === 'LSO' && styles.legTextOn]}>{t.home.exportCostLso}</Text>
                  </Pressable>
                </View>
                {line.weightKg > 0 ? (
                  <>
                    <Text style={styles.formLabel}>{t.home.exportCostCurrency}</Text>
                    <View style={styles.legRow}>
                      <Pressable
                        style={[styles.legChip, currency === 'MMK' && styles.legChipOn]}
                        onPress={() => onCurrency('MMK')}
                        accessibilityRole="button"
                      >
                        <Text style={[styles.legText, currency === 'MMK' && styles.legTextOn]}>
                          {t.home.exportCostMmk}
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[styles.legChip, currency === 'CNY' && styles.legChipOn]}
                        onPress={() => onCurrency('CNY')}
                        accessibilityRole="button"
                      >
                        <Text style={[styles.legText, currency === 'CNY' && styles.legTextOn]}>
                          {t.home.exportCostCny}
                        </Text>
                      </Pressable>
                    </View>
                    {currency === 'MMK' ? (
                      <View
                        style={styles.rateRow}
                        collapsable={false}
                        ref={(node) => {
                          hosts.current.set(`${line.key}:rate`, node);
                        }}
                      >
                        <Text style={styles.ratePrefix}>{t.home.exportCostRatePrefix}</Text>
                        <TextInput
                          style={[styles.price, styles.rateInput]}
                          value={rate}
                          onChangeText={(value) =>
                            onRate(value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1'))
                          }
                          onFocus={() => onFieldFocus(hosts.current.get(`${line.key}:rate`) ?? null)}
                          keyboardType="decimal-pad"
                          placeholder="670"
                          placeholderTextColor="#64748b"
                        />
                        <Text style={styles.ratePrefix}>{t.home.exportCostRateUnit}</Text>
                      </View>
                    ) : null}
                    <View
                      style={styles.priceRow}
                      collapsable={false}
                      ref={(node) => {
                        hosts.current.set(`${line.key}:price`, node);
                      }}
                    >
                      <Text style={styles.formLabel}>¥/Kg</Text>
                      <TextInput
                        style={[styles.price, styles.rateInput]}
                        value={price}
                        onChangeText={(value) => onPrice(value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1'))}
                        onFocus={() => onFieldFocus(hosts.current.get(`${line.key}:price`) ?? null)}
                        keyboardType="decimal-pad"
                        placeholder="¥/Kg"
                        placeholderTextColor="#64748b"
                      />
                    </View>
                    {priceFilled ? (
                      <Text style={styles.calc}>
                        {currency === 'MMK' && settled && unit > 0
                          ? fmt(t.home.exportCostMmkLine, {
                              total: trimKg(total),
                              rate: trimKg(mmkPerCny),
                              mmk: Math.round(settled.totalMmk).toLocaleString('en-US'),
                            })
                          : fmt(t.home.exportCostLineTotal, {
                              unit: trimKg(unit),
                              kg: trimKg(line.weightKg),
                              total: trimKg(total),
                            })}
                      </Text>
                    ) : null}
                  </>
                ) : (
                  <Text style={styles.weightWarn}>{t.home.exportCostNeedWeight}</Text>
                )}
                <Pressable
                  style={[styles.addBtn, !canAdd && styles.addBtnOff]}
                  onPress={() => onSubmit(line)}
                  disabled={!canAdd}
                  accessibilityRole="button"
                >
                  {savingKey === line.key ? (
                    <ActivityIndicator color="#0f172a" size="small" />
                  ) : (
                    <Text style={styles.addText}>{t.home.exportCostAdd}</Text>
                  )}
                </Pressable>
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
  scanCover: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 30,
    elevation: 30,
    backgroundColor: '#0f172a',
  },
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
  sheetHint: { color: '#94a3b8', fontSize: 12, marginTop: 4, lineHeight: 16 },
  searchRow: {
    marginTop: 10,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  search: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
    color: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  scanBtn: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.55)',
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBtnText: { color: '#fbbf24', fontSize: 14, fontWeight: '800' },
  list: { paddingBottom: 28 },
  empty: { color: '#94a3b8', fontSize: 13, paddingVertical: 16 },
  section: { marginTop: 14 },
  sectionTitle: {
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },
  item: {
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.28)',
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
  },
  itemNoWeight: { borderColor: 'rgba(248, 113, 113, 0.7)', backgroundColor: 'rgba(127, 29, 29, 0.28)' },
  itemTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: 'rgba(148, 163, 184, 0.16)',
    borderRadius: 8,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipWarn: {
    color: '#fecaca',
    fontSize: 12,
    fontWeight: '800',
    backgroundColor: 'rgba(248, 113, 113, 0.22)',
    borderRadius: 8,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  weightWarn: { color: '#fecaca', fontSize: 13, fontWeight: '800' },
  added: { marginTop: 4, color: '#4ade80', fontSize: 12, fontWeight: '800' },
  form: { marginTop: 6, gap: 4 },
  formLabel: { color: '#fbbf24', fontSize: 12, fontWeight: '800' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legRow: { flexDirection: 'row', gap: 8 },
  legChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
    backgroundColor: '#0f172a',
    paddingVertical: 6,
    minHeight: 32,
  },
  legChipOn: { backgroundColor: '#fbbf24', borderColor: '#fbbf24' },
  legText: { color: '#f8fafc', fontSize: 12, fontWeight: '800' },
  legTextOn: { color: '#0f172a' },
  price: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    height: 36,
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
    backgroundColor: '#0f172a',
  },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rateInput: { flex: 1 },
  ratePrefix: { color: '#fde68a', fontSize: 13, fontWeight: '700' },
  addBtn: {
    borderRadius: 8,
    backgroundColor: '#fbbf24',
    paddingVertical: 7,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnOff: { opacity: 0.45 },
  addText: { color: '#0f172a', fontSize: 13, fontWeight: '800' },
  calc: { color: '#fde68a', fontSize: 12, fontWeight: '700', marginTop: 2 },
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
