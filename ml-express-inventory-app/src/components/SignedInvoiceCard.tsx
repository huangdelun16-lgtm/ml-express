import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import Text from './AppText';
import { resolveAppError, useTranslation } from '../i18n';
import { feedbackService } from '../services/FeedbackService';
import { SIGNED_INVOICE_PAGE, listSignedInvoices } from '../services/signedInvoiceArchive';
import { persistInvoicePng } from '../utils/saveInvoiceImage';
import {
  signedInvoiceAmountLabel,
  signedInvoiceMatches,
  signedInvoiceStation,
  splitSignedInvoiceTotals,
  type SignedInvoiceListItem,
} from '../utils/signedInvoiceArchiveList';

const PAPER_WIDTH = 640;
const WATERMARK_TOPS = [48, 228, 408, 588, 768];
const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

export default function SignedInvoiceCard() {
  const { t } = useTranslation();
  const { height } = useWindowDimensions();
  const paperRef = useRef<View>(null);
  const paperHeightRef = useRef(0);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<SignedInvoiceListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<SignedInvoiceListItem | null>(null);
  const [saving, setSaving] = useState(false);

  const visible = useMemo(
    () => rows.filter((row) => signedInvoiceMatches(row, query)),
    [query, rows],
  );

  const close = () => {
    setOpen(false);
    setSelected(null);
    setQuery('');
  };

  const load = async (offset = 0) => {
    if (offset === 0) setLoading(true);
    else setLoadingMore(true);
    setError('');
    try {
      const next = await listSignedInvoices(offset);
      setRows((current) => {
        const merged = offset === 0 ? next : [...current, ...next];
        const seen = new Set<string>();
        return merged.filter((row) => {
          if (seen.has(row.id)) return false;
          seen.add(row.id);
          return true;
        });
      });
      setHasMore(next.length === SIGNED_INVOICE_PAGE);
    } catch (err) {
      if (offset === 0) setRows([]);
      setError(resolveAppError(t, err) || t.home.signedInvoiceLoadFailed);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const save = async () => {
    if (!paperRef.current || saving) return;
    setSaving(true);
    try {
      const uri = await captureRef(paperRef.current, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        useRenderInContext: true,
      });
      await persistInvoicePng(uri);
      feedbackService.notify(t.invoice.batchSaved);
    } catch (err) {
      feedbackService.notify(
        t.invoice.batchSaveFailed,
        err instanceof Error && err.message === 'permission' ? t.invoice.batchSaveNeedPermission : undefined,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={() => {
          setOpen(true);
          void load();
        }}
        accessibilityRole="button"
        accessibilityLabel={t.home.signedInvoiceTitle}
      >
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>🧾</Text>
        </View>
        <View style={styles.copy}>
          <Text style={styles.rowTitle}>{t.home.signedInvoiceTitle}</Text>
          <Text style={styles.rowHint}>{t.home.signedInvoiceHint}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <ModalShell visible={open} onClose={close} maxHeight={height * 0.88}>
        {selected ? (
          <InvoicePaper
            row={selected}
            paperRef={paperRef}
            paperHeightRef={paperHeightRef}
            saving={saving}
            maxHeight={height * 0.68}
            onSave={() => void save()}
            onClose={() => setSelected(null)}
          />
        ) : (
          <>
            <Text style={styles.sheetTitle}>{t.home.signedInvoiceTitle}</Text>
            <Text style={styles.sheetHint}>{t.home.signedInvoiceHint}</Text>
            <TextInput
              style={styles.search}
              value={query}
              onChangeText={setQuery}
              placeholder={t.home.signedInvoiceSearch}
              placeholderTextColor="#64748b"
              autoCorrect={false}
              autoCapitalize="none"
            />
            <ScrollView style={{ maxHeight: height * 0.58 }} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
              {loading ? <Text style={styles.empty}>{t.common.loading}</Text> : null}
              {!loading && error ? <Text style={styles.empty}>{error}</Text> : null}
              {!loading && !error && visible.length === 0 ? (
                <Text style={styles.empty}>{query.trim() ? t.home.signedInvoiceNone : t.home.signedInvoiceEmpty}</Text>
              ) : null}
              {visible.map((row, index) => (
                <Pressable
                  key={row.id}
                  style={[styles.item, index > 0 && styles.itemBorder]}
                  onPress={() => setSelected(row)}
                  accessibilityRole="button"
                >
                  <View style={styles.itemTop}>
                    <Text style={styles.itemNo}>{row.invoiceNo}</Text>
                    <Text style={styles.itemAmount}>{signedInvoiceAmountLabel(row)}</Text>
                  </View>
                  <Text style={styles.itemMeta} numberOfLines={1}>
                    {row.customerName || '—'}
                  </Text>
                  <Text style={styles.itemMeta} numberOfLines={1}>
                    {[row.tripLabel || '—', row.issuedOn || '—'].join(' · ')}
                  </Text>
                  <Text style={styles.itemMeta} numberOfLines={1}>
                    {[
                      signedInvoiceStation(row),
                      row.pieceCount > 0 ? `${row.pieceCount} ${t.common.pieces}` : '',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </Pressable>
              ))}
              {hasMore ? (
                <Pressable
                  style={styles.moreBtn}
                  onPress={() => void load(rows.length)}
                  disabled={loadingMore}
                  accessibilityRole="button"
                >
                  {loadingMore ? (
                    <ActivityIndicator color="#5eead4" size="small" />
                  ) : (
                    <Text style={styles.moreText}>{t.home.signedInvoiceMore}</Text>
                  )}
                </Pressable>
              ) : null}
            </ScrollView>
            <Pressable style={styles.closeBtn} onPress={close} accessibilityRole="button">
              <Text style={styles.closeText}>{t.common.close}</Text>
            </Pressable>
          </>
        )}
      </ModalShell>
    </>
  );
}

function ModalShell({
  visible,
  onClose,
  maxHeight,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  maxHeight: number;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t.common.close} />
        <View style={[styles.sheet, { maxHeight }]}>{children}</View>
      </View>
    </Modal>
  );
}

function InvoicePaper({
  row,
  paperRef,
  paperHeightRef,
  saving,
  maxHeight,
  onSave,
  onClose,
}: {
  row: SignedInvoiceListItem;
  paperRef: React.RefObject<View | null>;
  paperHeightRef: { current: number };
  saving: boolean;
  maxHeight: number;
  onSave: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();
  const [paperHeight, setPaperHeight] = useState(1100);
  const frameWidth = Math.max(280, windowWidth - 60);
  const scale = frameWidth / PAPER_WIDTH;
  return (
    <>
      <ScrollView style={{ maxHeight }} contentContainerStyle={styles.paperScroll}>
        <View style={[styles.paperFrame, { width: frameWidth, height: paperHeight * scale }]}>
          <View style={[styles.paperScale, { transform: [{ scale }] }]}>
            <InvoiceSheet row={row} />
          </View>
        </View>
      </ScrollView>
      <View style={styles.captureHost} pointerEvents="none">
        <View
          ref={paperRef}
          collapsable={false}
          onLayout={(event) => {
            const next = event.nativeEvent.layout.height;
            if (next > 0) {
              paperHeightRef.current = next;
              if (Math.abs(next - paperHeight) > 1) setPaperHeight(next);
            }
          }}
        >
          <InvoiceSheet row={row} />
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable style={styles.saveBtn} onPress={onSave} disabled={saving} accessibilityRole="button">
          {saving ? <ActivityIndicator color="#e2e8f0" size="small" /> : <Text style={styles.saveText}>{t.common.save}</Text>}
        </Pressable>
        <Pressable style={styles.closeBtn} onPress={onClose} accessibilityRole="button">
          <Text style={styles.closeText}>{t.common.close}</Text>
        </Pressable>
      </View>
    </>
  );
}

function InvoiceSheet({ row }: { row: SignedInvoiceListItem }) {
  const doc = row.document;
  const totals = splitSignedInvoiceTotals(doc.totals);
  return (
    <View style={styles.paper}>
      <View pointerEvents="none" style={styles.watermarkWrap}>
        {WATERMARK_TOPS.map((top) => (
          <Text key={top} style={[styles.watermark, { top }]}>
            MARKET LINK
          </Text>
        ))}
      </View>
      <View style={styles.frame}>
        <View style={styles.paperBody}>
          <View style={styles.brandRow}>
            <View style={styles.wordmark}>
              <Text style={styles.brand}>MARKET LINK</Text>
              <Text style={styles.brandSub}>EXPRESS</Text>
            </View>
            <View style={styles.docPlain}>
              <Text style={styles.docWord} numberOfLines={1}>
                invoice no
              </Text>
              <Text style={styles.docNo} numberOfLines={1}>
                {doc.invoiceNo || row.invoiceNo}
              </Text>
            </View>
          </View>
          <View style={styles.rule} />
          <View style={styles.ruleThin} />
          <View style={styles.meta}>
            {doc.meta.map((item) => (
              <View key={`${item.label}-${item.value}`} style={styles.metaRow}>
                <Text style={styles.metaLabel}>{item.label}</Text>
                <Text style={styles.metaValue}>{item.value || '—'}</Text>
              </View>
            ))}
          </View>
          {doc.lines.map((line, index) => (
            <View key={`${line.title}-${index}`} style={styles.orders}>
              <Text style={styles.orderTitle}>{line.title}</Text>
              {(line.expressNos.length ? line.expressNos : ['—']).map((no, noIndex) => (
                <View key={`${no}-${noIndex}`} style={styles.orderRow}>
                  <Text style={styles.orderIndex}>{String(noIndex + 1).padStart(2, '0')}</Text>
                  <Text style={styles.orderNo}>{no || '—'}</Text>
                </View>
              ))}
              {line.measure ? <Text style={styles.measure}>{line.measure}</Text> : null}
            </View>
          ))}
          <View style={styles.totals}>
            {totals.map((item, index) =>
              item.kind === 'fee' ? (
                <View key={`${item.kind}-${index}`} style={styles.feeRow}>
                  <Text style={styles.feeLabel}>{item.label}</Text>
                  <Text style={styles.feeValue}>{item.value}</Text>
                </View>
              ) : (
                <View key={`${item.kind}-${index}`} style={styles.totalRow}>
                  <Text style={styles.totalLabel}>{item.label}</Text>
                  <Text style={styles.totalValue}>{item.value}</Text>
                </View>
              ),
            )}
          </View>
          {doc.payNote ? (
            <View style={styles.closeout}>
              <Text style={styles.payNote}>{doc.payNote}</Text>
              <View style={styles.contact}>
                {doc.contactLabel ? <Text style={styles.contactLabel}>{doc.contactLabel}</Text> : null}
                {doc.contactPhones ? (
                  <Text style={styles.contactLine}>
                    <Text style={styles.contactLineLabel}>{doc.contactPhoneLabel}</Text>
                    {doc.contactPhones}
                  </Text>
                ) : null}
                {doc.contactKpay ? (
                  <Text style={styles.contactLine} numberOfLines={1}>
                    <Text style={styles.contactLineLabel}>Kpay：</Text>
                    {doc.contactKpay}
                  </Text>
                ) : null}
                {doc.contactSite ? (
                  <Text style={styles.contactSite} numberOfLines={1}>
                    {doc.contactSite}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.footerBrand}>MARKET LINK EXPRESS</Text>
            </View>
          ) : null}
        </View>
      </View>
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
    borderColor: 'rgba(45, 212, 191, 0.32)',
  },
  rowPressed: { opacity: 0.82 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 184, 166, 0.14)',
  },
  icon: { fontSize: 22 },
  copy: { flex: 1, minWidth: 0 },
  rowTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '800' },
  rowHint: { color: '#94a3b8', fontSize: 12, fontWeight: '600', marginTop: 2, lineHeight: 16 },
  chevron: { fontSize: 28, fontWeight: '300', lineHeight: 28, color: '#5eead4' },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(15,23,42,0.82)' },
  sheet: {
    width: '100%',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.35)',
    zIndex: 1,
  },
  sheetTitle: { color: '#5eead4', fontSize: 18, fontWeight: '800' },
  sheetHint: { color: '#94a3b8', fontSize: 12, marginTop: 4, lineHeight: 16 },
  search: {
    marginTop: 10,
    marginBottom: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
    color: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  list: { paddingBottom: 4 },
  empty: { color: '#94a3b8', fontSize: 13, paddingVertical: 16 },
  moreBtn: { alignItems: 'center', paddingVertical: 12 },
  moreText: { color: '#5eead4', fontSize: 13, fontWeight: '800' },
  item: { paddingVertical: 10 },
  itemBorder: { borderTopWidth: 1, borderTopColor: 'rgba(148, 163, 184, 0.18)' },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  itemNo: { color: '#f8fafc', fontSize: 15, fontWeight: '800' },
  itemAmount: { color: '#5eead4', fontSize: 13, fontWeight: '800' },
  itemMeta: { marginTop: 2, color: '#94a3b8', fontSize: 12 },
  closeBtn: {
    marginTop: 10,
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
  },
  closeText: { color: '#e2e8f0', fontWeight: '700' },
  paperScroll: { paddingBottom: 4, alignItems: 'center' },
  paperFrame: { overflow: 'hidden' },
  paperScale: { width: PAPER_WIDTH, transformOrigin: 'left top' },
  captureHost: { position: 'absolute', width: PAPER_WIDTH, left: -4000, top: 0 },
  paper: {
    width: PAPER_WIDTH,
    backgroundColor: '#f7f3ea',
    borderWidth: 1,
    borderColor: '#1c1917',
    padding: 5,
    overflow: 'hidden',
  },
  frame: { borderWidth: 1, borderColor: 'rgba(28, 25, 23, 0.28)' },
  watermarkWrap: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 0 },
  watermark: {
    position: 'absolute',
    left: -40,
    right: -40,
    color: 'rgba(28, 25, 23, 0.045)',
    fontFamily: SERIF,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 8,
    textAlign: 'center',
    transform: [{ rotate: '-16deg' }],
  },
  paperBody: { position: 'relative', paddingHorizontal: 28, paddingTop: 28, paddingBottom: 22 },
  brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 },
  wordmark: { flexShrink: 1 },
  brand: { color: '#1c1917', fontFamily: SERIF, fontSize: 28, fontWeight: '700', letterSpacing: 1.1, lineHeight: 28 },
  brandSub: { marginTop: 4, color: '#1c1917', fontSize: 11, fontWeight: '700', letterSpacing: 4.6 },
  docPlain: { width: 168, flexShrink: 0, alignItems: 'flex-end' },
  docWord: { width: '100%', color: '#1c1917', fontSize: 11, fontWeight: '800', letterSpacing: 0.4, textAlign: 'right' },
  docNo: { width: '100%', marginTop: 2, color: '#1c1917', fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), fontSize: 13, fontWeight: '800', letterSpacing: 0.2, textAlign: 'right' },
  rule: { marginTop: 12, height: 2, backgroundColor: '#1c1917' },
  ruleThin: { marginTop: 3, height: 1, backgroundColor: '#1c1917' },
  meta: { marginTop: 16 },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(28, 25, 23, 0.1)',
  },
  metaLabel: { color: '#78716c', fontSize: 12, fontWeight: '600' },
  metaValue: { flex: 1, color: '#1c1917', fontSize: 14, fontWeight: '700', textAlign: 'right' },
  orders: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#1c1917' },
  orderTitle: { paddingTop: 12, paddingBottom: 4, color: '#78716c', fontSize: 11, fontWeight: '700', letterSpacing: 1.6 },
  orderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#a8a29e' },
  orderIndex: { width: 28, paddingTop: 2, color: '#a8a29e', fontSize: 12, fontWeight: '700' },
  orderNo: { flex: 1, color: '#1c1917', fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), fontSize: 13, fontWeight: '600', lineHeight: 18 },
  measure: { marginTop: 8, marginBottom: 2, paddingVertical: 8, paddingHorizontal: 10, backgroundColor: 'rgba(28, 25, 23, 0.05)', color: '#1c1917', fontSize: 13, fontWeight: '700', textAlign: 'right' },
  totals: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#1c1917' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 10, gap: 12 },
  totalLabel: { color: '#44403c', fontSize: 13, fontWeight: '600' },
  totalValue: { flexShrink: 1, color: '#1c1917', fontSize: 14, fontWeight: '700', textAlign: 'right' },
  feeRow: { marginTop: 10, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#1c1917', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  feeLabel: { color: '#f6f3ec', fontSize: 13, fontWeight: '600' },
  feeValue: { flexShrink: 1, color: '#f6f3ec', fontSize: 18, fontWeight: '800', textAlign: 'right' },
  closeout: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#1c1917' },
  payNote: { textAlign: 'center', color: '#1c1917', fontSize: 13, fontWeight: '800', letterSpacing: 1.8 },
  contact: { marginTop: 10, alignSelf: 'center', width: 460, maxWidth: '100%', paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(28, 25, 23, 0.16)', backgroundColor: 'rgba(28, 25, 23, 0.035)', alignItems: 'center' },
  contactLabel: { color: '#57534e', fontSize: 11, fontWeight: '800', letterSpacing: 2.4 },
  contactLine: { marginTop: 7, color: '#1c1917', fontSize: 13, fontWeight: '800', textAlign: 'center', lineHeight: 18 },
  contactLineLabel: { color: '#57534e', fontSize: 13, fontWeight: '700' },
  contactSite: { marginTop: 7, color: '#1c1917', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  footerBrand: { marginTop: 10, textAlign: 'center', color: '#78716c', fontSize: 11, fontWeight: '700', letterSpacing: 2.4 },
  actions: { marginTop: 10, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  saveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 72,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
    backgroundColor: 'transparent',
  },
  saveText: { color: '#e2e8f0', fontWeight: '700' },
});
