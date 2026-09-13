import React from 'react';
import {
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type HotlineNumber = {
  display: string;
  tel: string;
};

type Props = {
  visible: boolean;
  title: string;
  numbers: HotlineNumber[];
  cancelLabel: string;
  exitLabel: string;
  onClose: () => void;
};

export default function HotlinePickerModal({
  visible,
  title,
  numbers,
  cancelLabel,
  exitLabel,
  onClose,
}: Props) {
  const call = (tel: string) => {
    onClose();
    void Linking.openURL(`tel:${tel}`);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {numbers.map((item) => (
            <TouchableOpacity
              key={item.tel}
              style={styles.numberRow}
              onPress={() => call(item.tel)}
              activeOpacity={0.75}
            >
              <Text style={styles.numberText}>{item.display}</Text>
            </TouchableOpacity>
          ))}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.footerBtn} onPress={onClose} activeOpacity={0.75}>
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <View style={styles.footerDivider} />
            <TouchableOpacity style={styles.footerBtn} onPress={onClose} activeOpacity={0.75}>
              <Text style={styles.exitText}>{exitLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingTop: 22,
    overflow: 'hidden',
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 22,
    marginBottom: 10,
  },
  numberRow: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  numberText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#2563EB',
    fontWeight: '500',
  },
  footer: {
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  footerBtn: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  exitText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
});
