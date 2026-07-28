import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import {
  InboundInvoiceContent,
  InboundInvoiceFooter,
  inboundInvoiceStyles,
  type InboundInvoiceData,
} from './InboundInvoiceView';

export type StockInInvoiceData = InboundInvoiceData;

type Props = {
  visible: boolean;
  data: StockInInvoiceData | null;
  onClose: () => void;
};

export default function StockInInvoiceModal({ visible, data, onClose }: Props) {
  if (!data) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={inboundInvoiceStyles.overlay}>
        <View style={inboundInvoiceStyles.sheet}>
          <ScrollView
            contentContainerStyle={inboundInvoiceStyles.scroll}
            showsVerticalScrollIndicator={false}
          >
            <InboundInvoiceContent data={data} />
          </ScrollView>

          <InboundInvoiceFooter
            recipientPhone={data.recipientPhone}
            onClose={onClose}
          />
        </View>
      </View>
    </Modal>
  );
}
