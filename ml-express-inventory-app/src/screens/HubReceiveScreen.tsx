import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ScanInputBar from '../components/ScanInputBar';
import HubReceiveOrdersModal from '../components/HubReceiveOrdersModal';
import OnlineRequiredBanner from '../components/OnlineRequiredBanner';
import { HubReceiveStatusPanels } from '../components/hubReceive/HubReceiveStatusPanels';
import { useHubReceiveFlow } from '../hooks/useHubReceiveFlow';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { colors, space } from '../theme';

export default function HubReceiveScreen({
  route,
}: NativeStackScreenProps<RootStackParamList, 'HubReceive'>) {
  const openPackBarcode = route.params?.openPackBarcode?.trim().toUpperCase() ?? '';
  const flow = useHubReceiveFlow(openPackBarcode);
  const { t, store } = flow;

  if (!store) {
    return (
      <View style={styles.center}>
        <Text style={styles.hint}>{t.common.loginHubFirst}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <OnlineRequiredBanner />
      <HubReceiveStatusPanels
        t={t}
        fmt={flow.fmt}
        hubCode={flow.hubCode}
        store={store}
        cloudConnected={flow.cloudConnected}
        loading={flow.loading}
        ordersModalVisible={flow.ordersModalVisible}
        error={flow.error}
        message={flow.message}
        activePack={flow.activePack}
        onReopen={(pack) => void flow.openPackOrdersModal(pack)}
      >
        <ScanInputBar
          value={flow.scan}
          onChangeText={flow.setScan}
          onSubmit={flow.onSubmit}
          busy={flow.loading}
          cameraScan={{
            title: t.hubReceive.cameraTitle,
            subtitle: t.hubReceive.cameraSubtitle,
          }}
          placeholder={t.hubReceive.scanPlaceholder}
          label={t.hubReceive.scanLabel}
        />
      </HubReceiveStatusPanels>

      <HubReceiveOrdersModal
        visible={flow.ordersModalVisible}
        pack={flow.activePack}
        hubCode={flow.hubCode}
        store={store}
        loading={flow.loading}
        confirmingOrderId={flow.confirmingOrderId}
        confirmingHubReceive={flow.confirmingHubReceive}
        batchInbounding={flow.batchInbounding}
        payingTransportFee={flow.payingTransportFee}
        transportFeePaid={flow.transportFeePaid}
        tripPackCount={flow.tripPackCount}
        tripFeeAnchorPack={flow.tripFeeAnchorPack}
        releasingTransit={flow.releasingTransit}
        errorText={flow.ordersModalVisible ? flow.error : undefined}
        successText={flow.modalSuccess || undefined}
        onClose={flow.closeOrdersModal}
        onConfirmPack={() => void flow.handleConfirmPack()}
        onConfirmOrder={(orderId) => void flow.handleConfirmOrder(orderId)}
        onBatchInbound={() => void flow.handleBatchInbound()}
        onPayTransportFee={flow.handlePayTransportFee}
        onReleaseTransit={() => void flow.handleReleaseTransit()}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  hint: { color: colors.muted },
});
