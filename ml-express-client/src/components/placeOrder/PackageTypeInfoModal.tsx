import React from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  visible: boolean;
  styles: any;
  currentT: any;
  selectedPackageTypeInfo: string;
  onClose: () => void;
};

export default function PackageTypeInfoModal({
  visible,
  styles,
  currentT,
  selectedPackageTypeInfo,
  onClose,
}: Props) {
  const detail =
    selectedPackageTypeInfo === '标准件（45x60x15cm）和（5KG）以内' ? currentT.packageTypeDetails.standard :
    selectedPackageTypeInfo === '超重件（5KG）以上' ? currentT.packageTypeDetails.overweight :
    selectedPackageTypeInfo === '超规件（45x60x15cm）以上' ? currentT.packageTypeDetails.oversized :
    selectedPackageTypeInfo === '顺路递' ? currentT.packageTypeDetails.waySide :
    selectedPackageTypeInfo;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{currentT.packageTypeInfo.title}</Text>
          <ScrollView style={{ maxHeight: 300 }}>
            <Text style={styles.modalText}>{detail}</Text>
          </ScrollView>
          <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
            <Text style={styles.modalCloseButtonText}>{currentT.packageTypeInfo.understood}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
