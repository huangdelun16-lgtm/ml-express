import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import BarcodeScannerView from './BarcodeScannerView';

type Props = {
  visible: boolean;
  onClose: () => void;
  onScanned: (code: string) => void;
  title?: string;
  subtitle?: string;
};

export default function PhoneBarcodeScanModal({
  visible,
  onClose,
  onScanned,
  title = '手机扫码',
  subtitle,
}: Props) {
  const handleScanned = (code: string) => {
    onScanned(code);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={styles.close}>关闭</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={{ width: 48 }} />
        </View>
        <BarcodeScannerView
          active={visible}
          onScan={handleScanned}
          title="将条码放入框内"
          subtitle={subtitle ?? '识别后自动填入并关闭'}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  close: { color: '#60a5fa', fontWeight: '700', fontSize: 16, width: 48 },
  headerTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '800' },
});
