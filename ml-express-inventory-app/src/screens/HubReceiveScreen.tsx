import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ExceptionReportModal from '../components/ExceptionReportModal';
import ArrivalNotifySheet from '../components/ArrivalNotifySheet';
import CustomerSignFlowModal, { type CustomerSignFlowRequest } from '../components/CustomerSignFlowModal';
import ScanInputBar from '../components/ScanInputBar';
import HubReceiveOrdersModal from '../components/HubReceiveOrdersModal';
import OnlineRequiredBanner from '../components/OnlineRequiredBanner';
import { HubReceiveScanBasket } from '../components/hubReceive/HubReceiveScanBasket';
import { HubReceiveStatusPanels } from '../components/hubReceive/HubReceiveStatusPanels';
import { useHubReceiveFlow } from '../hooks/useHubReceiveFlow';
import { fmt, resolveAppError } from '../i18n';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { feedbackService } from '../services/FeedbackService';
import { listItems } from '../services/inventoryService';
import type { ExceptionReportTarget } from '../types/inventoryException';
import { resolvePackagingStockInSignIds } from '../utils/customerBatchSign';
import { exceptionTargetFromHubOrder } from '../utils/inventoryException';
import { groupHubReceiveScanLines, type HubReceiveScanGroup } from '../utils/hubReceiveScanBasket';
import { isPackageBarcode } from '../utils/packageNumber';
import { showTaskSuccess } from '../utils/taskSuccessAlert';
import { colors, space } from '../theme';

export default function HubReceiveScreen({
  route,
}: NativeStackScreenProps<RootStackParamList, 'HubReceive'>) {
  const openPackBarcode = route.params?.openPackBarcode?.trim().toUpperCase() ?? '';
  const flow = useHubReceiveFlow(openPackBarcode);
  const { t, store } = flow;
  const [exceptionTarget, setExceptionTarget] = useState<ExceptionReportTarget | null>(null);
  const [signRequest, setSignRequest] = useState<CustomerSignFlowRequest | null>(null);
  const scanGroups = useMemo(
    () => groupHubReceiveScanLines(flow.scanBasket),
    [flow.scanBasket],
  );

  const openGroupSign = (group: HubReceiveScanGroup) => {
    if (!store || group.signable.length === 0 || signRequest) return;
    const scope = flow.hubCode ? { store, hubCode: flow.hubCode } : undefined;
    void (async () => {
      try {
        const expanded = await resolvePackagingStockInSignIds(
          group.signable,
          group.signable,
          store,
          (keyword) => listItems(keyword, scope),
        );
        setSignRequest({
          itemIds: expanded.map((item) => item.id),
          operator: flow.operator,
          store,
        });
      } catch (e: unknown) {
        feedbackService.notify(t.common.signFailed, resolveAppError(t, e));
      }
    })();
  };

  if (!store) {
    return (
      <View style={styles.center}>
        <Text style={styles.hint}>{t.common.loginHubFirst}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
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
          busy={flow.loading || flow.scanBusy || signRequest != null}
          scanBtnLabel={t.scanInput.cameraContinuous}
          tone="dark"
          label=""
          hint=""
          cameraScan={{
            title: t.hubReceive.cameraTitle,
            subtitle: t.hubReceive.cameraSubtitle,
            continuous: true,
            scannedCount: flow.scanBasket.length,
            closeWhen: isPackageBarcode,
            scannedList: (
              <HubReceiveScanBasket
                t={t}
                groups={scanGroups}
                embedded
                onSignGroup={openGroupSign}
                onRemove={(line) => flow.removeScanBasketIds([line.id])}
                onClear={flow.clearScanBasket}
              />
            ),
          }}
          placeholder={t.hubReceive.scanPlaceholder}
        />
        <HubReceiveScanBasket
          t={t}
          groups={scanGroups}
          onSignGroup={openGroupSign}
          onRemove={(line) => flow.removeScanBasketIds([line.id])}
          onClear={flow.clearScanBasket}
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
        onReportException={(line) => setExceptionTarget(exceptionTargetFromHubOrder(line))}
        onNotifyCustomer={(line) => flow.queueArrivalNotify([line])}
      />
      <ArrivalNotifySheet
        visible={flow.notifyQueue.length > 0}
        targets={flow.notifyQueue}
        onClose={flow.dismissNotifyQueue}
      />
      <CustomerSignFlowModal
        request={signRequest}
        onClose={() => setSignRequest(null)}
        resolveError={(e) => resolveAppError(t, e)}
        onSuccess={(detail, signedCount) => {
          flow.removeScanBasketIds(signRequest?.itemIds ?? [detail.id]);
          showTaskSuccess(
            t.common.signSuccess,
            signedCount > 1
              ? fmt(t.sign.batchSignedCount, { count: signedCount })
              : fmt(t.common.signMarked, { name: detail.name }),
          );
        }}
        onError={(message) => feedbackService.notify(t.common.signFailed, message)}
      />
      <ExceptionReportModal
        visible={!!exceptionTarget}
        target={exceptionTarget}
        onClose={() => setExceptionTarget(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  hint: { color: colors.muted },
});
