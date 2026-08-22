import React, { useRef } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as MediaLibrary from 'expo-media-library';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { common } from '../../i18n';
import LoggerService from '../../services/LoggerService';
import { ensureSaveToLibraryPermission } from '../../utils/mediaAccess';

const TEAL = '#2C98A6';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export type PlaceOrderMallSummary = {
  productAmount: number;
  deliveryFee: number;
  coupon: number;
  paidAmount: number;
  remarks: string;
};

type Props = {
  visible: boolean;
  styles: any;
  currentT: any;
  language: string;
  orderId: string;
  orderPrice: string;
  mallSummary: PlaceOrderMallSummary | null;
  showLoading: (msg: string, kind?: any) => void;
  hideLoading: () => void;
  onClose: () => void;
  onViewOrders: () => void;
};

export default function OrderQrModal({
  visible,
  styles,
  currentT,
  language,
  orderId,
  orderPrice,
  mallSummary,
  showLoading,
  hideLoading,
  onClose,
  onViewOrders,
}: Props) {
  const viewShotRef = useRef<any>(null);
  const c = common(language);

  const handleSaveQRCode = async () => {
    try {
      showLoading(c.saving, 'package');
      const granted = await ensureSaveToLibraryPermission();
      if (!granted) {
        hideLoading();
        Alert.alert(c.permissionTitle, c.galleryPermissionQr);
        return;
      }
      const uri = await captureRef(viewShotRef, {
        format: 'png',
        quality: 1.0,
      });
      await MediaLibrary.saveToLibraryAsync(uri);
      hideLoading();
      Alert.alert(c.saved, c.qrSaved);
    } catch (error) {
      hideLoading();
      LoggerService.error('保存二维码失败:', error);
      Alert.alert(c.saveFailed, c.cannotSaveImageRetry);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.qrModalOverlay}>
        <View style={styles.qrModalContent}>
          <View style={styles.qrModalHeader}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.qrModalClose}
              accessibilityRole="button"
              accessibilityLabel={currentT.qrClose}
            >
              <Ionicons name="chevron-back" size={20} color="#1A2B48" />
            </TouchableOpacity>
            <Text style={styles.qrModalTitle}>{currentT.qrTitle}</Text>
            <View style={styles.qrModalHeaderSpacer} />
          </View>

          <ScrollView
            style={{ maxHeight: SCREEN_HEIGHT * (mallSummary ? 0.68 : 0.62) }}
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1.0 }} style={styles.qrShot}>
              <View style={styles.qrModalBody}>
                <View style={styles.qrCard}>
                  <View style={styles.qrSuccessBadge}>
                    <Ionicons name="checkmark" size={22} color="#ffffff" />
                  </View>
                  <Text style={styles.qrSuccessText}>{currentT.orderSuccess}</Text>

                  <View style={styles.qrCodeContainer}>
                    <View style={styles.qrCodeWrapper}>
                      <QRCode value={orderId} size={188} color={TEAL} backgroundColor="white" />
                    </View>
                  </View>

                  <View style={styles.qrTicketRow}>
                    {Array.from({ length: 20 }).map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.qrTicketDashSeg,
                          { backgroundColor: i % 2 === 0 ? '#E85D4C' : '#4A7BD4' },
                        ]}
                      />
                    ))}
                  </View>

                  <Text style={styles.qrInfoText}>{currentT.orderNumber}</Text>
                  <Text style={styles.qrOrderId}>{orderId}</Text>
                  <Text style={styles.qrHint}>{currentT.qrHint}</Text>

                  {!mallSummary ? (
                    <View style={styles.qrPaidRow}>
                      <Text style={styles.qrPaidLabel}>{currentT.paidAmount}</Text>
                      <Text style={styles.qrOrderPrice}>{orderPrice} MMK</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </ViewShot>

            {mallSummary ? (
              <View style={[styles.qrModalBody, { paddingTop: 0 }]}>
                <View style={styles.qrBreakdownCard}>
                  <View style={styles.qrBreakdownRow}>
                    <Text style={styles.qrBreakdownLabel}>{currentT.productAmount}</Text>
                    <Text style={styles.qrBreakdownValue}>
                      {mallSummary.productAmount.toLocaleString()} MMK
                    </Text>
                  </View>
                  <View style={styles.qrBreakdownRow}>
                    <Text style={styles.qrBreakdownLabel}>{currentT.deliveryFee}</Text>
                    <Text style={styles.qrBreakdownValue}>
                      {mallSummary.deliveryFee.toLocaleString()} MMK
                    </Text>
                  </View>
                  <View style={styles.qrBreakdownRow}>
                    <Text style={styles.qrBreakdownLabel}>{currentT.coupon}</Text>
                    <Text
                      style={[
                        styles.qrBreakdownValue,
                        mallSummary.coupon > 0 ? styles.qrBreakdownCoupon : null,
                      ]}
                    >
                      {mallSummary.coupon > 0
                        ? `-${mallSummary.coupon.toLocaleString()} MMK`
                        : `0 MMK`}
                    </Text>
                  </View>
                  <View style={styles.qrBreakdownDivider} />
                  <View style={styles.qrBreakdownRow}>
                    <Text style={styles.qrBreakdownTotalLabel}>{currentT.paidAmount}</Text>
                    <Text style={styles.qrBreakdownTotalValue}>
                      {mallSummary.paidAmount.toLocaleString()} MMK
                    </Text>
                  </View>
                </View>

                <View style={styles.qrRemarkCard}>
                  <Text style={styles.qrRemarkTitle}>{currentT.remarksOptional}</Text>
                  <Text style={styles.qrRemarkText}>
                    {mallSummary.remarks.trim() ? mallSummary.remarks : currentT.noRemarks}
                  </Text>
                </View>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.qrModalFooter}>
            <TouchableOpacity
              style={styles.qrSecondaryBtn}
              onPress={handleSaveQRCode}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={currentT.saveQR}
            >
              <Ionicons name="download-outline" size={18} color={TEAL} />
              <Text style={styles.qrSecondaryBtnText}>{currentT.saveQR}</Text>
            </TouchableOpacity>

            <View style={styles.qrActionBar}>
              <View style={styles.qrActionBarSide}>
                <Text style={styles.qrPayableLabel}>{currentT.payableAmount}</Text>
                <Text style={styles.qrPayableValue}>
                  {mallSummary
                    ? `${mallSummary.paidAmount.toLocaleString()} MMK`
                    : `${orderPrice} MMK`}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.qrPrimaryBtn}
                onPress={onViewOrders}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={currentT.viewOrders}
              >
                <Text style={styles.qrPrimaryBtnText}>{currentT.viewOrders}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
