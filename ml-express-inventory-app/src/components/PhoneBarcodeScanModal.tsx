import React, { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from '../i18n';
import BarcodeScannerView from './BarcodeScannerView';
import { colors, radius } from '../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onScanned: (code: string) => void;
  title?: string;
  subtitle?: string;
  /** 连扫：扫到后不关相机 */
  continuous?: boolean;
  busy?: boolean;
  scannedCount?: number;
  scannedList?: ReactNode;
};

export default function PhoneBarcodeScanModal({
  visible,
  onClose,
  onScanned,
  title,
  subtitle,
  continuous = false,
  busy = false,
  scannedCount = 0,
  scannedList,
}: Props) {
  const { t, fmt } = useTranslation();
  const [listVisible, setListVisible] = useState(false);

  useEffect(() => {
    if (!visible) setListVisible(false);
  }, [visible]);

  const handleScanned = (code: string) => {
    if (busy || listVisible) return;
    onScanned(code);
    if (!continuous) onClose();
  };

  const countLabel = fmt(t.hubReceive.cameraScannedCount, { count: scannedCount });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button">
            <Text style={styles.close}>{continuous ? t.hubReceive.cameraDone : t.common.close}</Text>
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title ?? t.scanInput.phoneScan}
          </Text>
          {continuous ? (
            <Pressable
              style={[styles.countBtn, scannedCount > 0 && styles.countBtnActive]}
              onPress={() => setListVisible((open) => !open)}
              accessibilityRole="button"
              accessibilityLabel={t.hubReceive.cameraViewScanned}
            >
              <Text style={[styles.count, scannedCount > 0 && styles.countActive]}>{countLabel}</Text>
              <Text style={[styles.countChevron, scannedCount > 0 && styles.countActive]}>
                {listVisible ? '▴' : '▾'}
              </Text>
            </Pressable>
          ) : (
            <View style={{ width: 48 }} />
          )}
        </View>
        <View style={styles.body}>
          <BarcodeScannerView
            active={visible && !busy && !listVisible}
            onScan={handleScanned}
            title={t.forms.scanAim}
            subtitle={subtitle ?? t.forms.scanAutoFill}
          />
          {listVisible ? (
            <View style={styles.sheetWrap} pointerEvents="box-none">
              <Pressable
                style={styles.sheetDim}
                onPress={() => setListVisible(false)}
                accessibilityLabel={t.hubReceive.cameraContinueScan}
              />
              <View style={styles.sheet}>
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetTitle}>{t.hubReceive.scanBasketTitle}</Text>
                <ScrollView
                  style={styles.sheetScroll}
                  contentContainerStyle={styles.sheetScrollContent}
                  keyboardShouldPersistTaps="handled"
                >
                  {scannedCount > 0 && scannedList ? (
                    scannedList
                  ) : (
                    <Text style={styles.empty}>{t.hubReceive.cameraScannedEmpty}</Text>
                  )}
                </ScrollView>
                <Pressable
                  style={styles.continueBtn}
                  onPress={() => setListVisible(false)}
                  accessibilityRole="button"
                >
                  <Text style={styles.continueBtnText}>{t.hubReceive.cameraContinueScan}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  close: { color: '#60a5fa', fontWeight: '700', fontSize: 16, minWidth: 48 },
  headerTitle: { color: colors.text, fontSize: 17, fontWeight: '800', flex: 1, textAlign: 'center' },
  countBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 72,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  countBtnActive: {
    backgroundColor: '#064e3b',
    borderColor: colors.successBorder,
  },
  count: { color: colors.muted, fontWeight: '800', fontSize: 13 },
  countActive: { color: colors.successSoft },
  countChevron: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  body: { flex: 1 },
  sheetWrap: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'flex-end',
  },
  sheetDim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(2, 6, 23, 0.55)',
  },
  sheet: {
    maxHeight: '72%',
    backgroundColor: colors.bg,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingBottom: 16,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderMuted,
    marginTop: 8,
    marginBottom: 10,
  },
  sheetTitle: { color: colors.successSoft, fontSize: 16, fontWeight: '900', marginBottom: 8 },
  sheetScroll: { maxHeight: 420 },
  sheetScrollContent: { paddingBottom: 8 },
  empty: { color: colors.muted, fontSize: 14, lineHeight: 20, paddingVertical: 20, textAlign: 'center' },
  continueBtn: {
    marginTop: 8,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  continueBtnText: { color: colors.white, fontWeight: '800', fontSize: 15 },
});
