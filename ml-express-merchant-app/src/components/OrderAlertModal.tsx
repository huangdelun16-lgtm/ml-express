import React, { useRef, useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  Dimensions, 
  Animated, 
  PanResponder,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
  Platform,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { supabase, merchantService } from '../services/supabase';
import { printerService } from '../services/PrinterService';
import { theme } from '../config/theme';
import { computeReceiptTotals } from '../utils/merchantReceiptTemplate';
import {
  orderToMerchantReceipt,
  type OrderPrintSource,
} from '../utils/orderToMerchantReceipt';
import { buildReceiptItemDisplays } from '../utils/receiptItemFormat';
import { feedbackService } from '../services/FeedbackService';

const { width } = Dimensions.get('window');
const FOOTER_SPACE = 120;

// 🚀 双向滑动确认组件 (右滑接单/左滑取消)
const SwipeAcceptDecline = ({ onAccept, onDecline, language, disabled }: any) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const actionLockRef = useRef(false);
  const buttonWidth = width - 80;
  const handleWidth = 100;
  const swipeRange = (buttonWidth - handleWidth) / 2;
  const swipeThreshold = swipeRange * 0.7;

  const resetHandle = () => {
    pan.stopAnimation();
    pan.setValue({ x: 0, y: 0 });
  };

  const runAction = (action: 'accept' | 'decline') => {
    if (disabled || actionLockRef.current) {
      resetHandle();
      return;
    }
    actionLockRef.current = true;
    const targetX = action === 'accept' ? swipeRange * 2 : -swipeRange * 2;
    Animated.spring(pan, { toValue: { x: targetX, y: 0 }, useNativeDriver: false }).start(() => {
      resetHandle();
      if (action === 'accept') onAccept();
      else onDecline();
      setTimeout(() => {
        actionLockRef.current = false;
      }, 800);
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        !disabled && (Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4),
      onPanResponderGrant: () => {
        pan.stopAnimation();
        pan.setOffset({ x: (pan.x as any)._value ?? 0, y: 0 });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x }], { useNativeDriver: false }),
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        if (gestureState.dx > swipeThreshold) {
          runAction('accept');
        } else if (gestureState.dx < -swipeThreshold) {
          runAction('decline');
        } else {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
        }
      },
      onPanResponderTerminate: () => {
        pan.flattenOffset();
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      },
    }),
  ).current;

  useEffect(() => {
    if (!disabled) return;
    resetHandle();
    actionLockRef.current = false;
  }, [disabled]);

  const translateX = pan.x.interpolate({
    inputRange: [-buttonWidth, buttonWidth],
    outputRange: [-buttonWidth, buttonWidth],
    extrapolate: 'clamp',
  });

  return (
    <View style={swipeStyles.container}>
      <View style={swipeStyles.track}>
        <View style={swipeStyles.declineZone}>
          <Ionicons name="close-circle" size={24} color="white" />
          <Text style={swipeStyles.zoneText}>{language === 'zh' ? '左滑取消' : 'Slide Left'}</Text>
        </View>
        <View style={swipeStyles.acceptZone}>
          <Text style={swipeStyles.zoneText}>{language === 'zh' ? '右滑接单' : 'Slide Right'}</Text>
          <Ionicons name="checkmark-circle" size={24} color="white" />
        </View>
      </View>

      <Animated.View
        style={[swipeStyles.handle, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <LinearGradient
          colors={['#3b82f6', '#2563eb']}
          style={swipeStyles.handleGradient}
        >
          <Ionicons name="swap-horizontal" size={28} color="white" />
        </LinearGradient>
      </Animated.View>
    </View>
  );
};

export const OrderAlertModal = ({ 
  visible, 
  orders = [], // 🚀 改为数组
  onClose, 
  language, 
  onStatusUpdate, 
  onAccepted,
  onDeclineSuccess 
}: any) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [productPriceMap, setProductPriceMap] = useState<Record<string, number>>({});
  const processingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearProcessingTimer = () => {
    if (processingTimerRef.current) {
      clearTimeout(processingTimerRef.current);
      processingTimerRef.current = null;
    }
  };

  const beginProcessing = () => {
    clearProcessingTimer();
    setIsProcessing(true);
    processingTimerRef.current = setTimeout(() => {
      setIsProcessing(false);
    }, 45000);
  };

  const endProcessing = () => {
    clearProcessingTimer();
    setIsProcessing(false);
  };

  useEffect(() => {
    if (visible) return;
    endProcessing();
    setSelectedIndex(0);
  }, [visible]);

  useEffect(() => {
    return () => {
      clearProcessingTimer();
    };
  }, []);

  // 🚀 当订单数组变化时，确保索引合法
  useEffect(() => {
    if (selectedIndex >= orders.length) {
      setSelectedIndex(Math.max(0, orders.length - 1));
    }
  }, [orders.length, selectedIndex]);

  const orderData = orders[selectedIndex]; // 🚀 当前选中的订单数据

  const resolveProductPriceMap = async (): Promise<Record<string, number>> => {
    if (Object.keys(productPriceMap).length > 0) return productPriceMap;
    if (!orderData?.delivery_store_id) return {};
    const products = await merchantService.getStoreProducts(orderData.delivery_store_id);
    return products.reduce<Record<string, number>>((acc, product) => {
      acc[product.name] = product.price;
      return acc;
    }, {});
  };

  const receiptSummary = useMemo(() => {
    if (!orderData) return null;
    const receipt = orderToMerchantReceipt(orderData as OrderPrintSource, productPriceMap);
    const totals = computeReceiptTotals(receipt);
    const displays = buildReceiptItemDisplays(receipt.items);
    return { receipt, totals, displays };
  }, [orderData, productPriceMap]);

  useEffect(() => {
    let isActive = true;
    const loadProducts = async () => {
      if (!orderData?.delivery_store_id) {
        setProductPriceMap({});
        return;
      }
      const products = await merchantService.getStoreProducts(orderData.delivery_store_id);
      if (!isActive) return;
      const priceMap = products.reduce<Record<string, number>>((acc, product) => {
        acc[product.name] = product.price;
        return acc;
      }, {});
      setProductPriceMap(priceMap);
    };
    loadProducts();
    return () => {
      isActive = false;
    };
  }, [orderData?.delivery_store_id]);

  const handlePrintOrder = async (): Promise<boolean> => {
    if (!orderData) return false;

    const settings = await printerService.getSettings();
    if (!settings.enabled) {
      return false;
    }

    const priceMap = await resolveProductPriceMap();
    return printerService.printReceipt(orderData, { productPriceMap: priceMap });
  };

  const handleAccept = async () => {
    if (!orderData || isProcessing) return;
    beginProcessing();
    try {
      const newStatus = '打包中';
      const { error } = await supabase
        .from('packages')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderData.id);

      if (error) throw error;
      onStatusUpdate?.();
      onAccepted?.(orderData);
      endProcessing();

      const settings = await printerService.getSettings();
      if (settings.autoPrint) {
        void (async () => {
          try {
            const printed = await handlePrintOrder();
            if (!printed) {
              feedbackService.notify(
                language === 'zh' ? '小票未打印' : 'Receipt not printed',
                language === 'zh'
                  ? '订单已接单，但打印机未连接或未就绪。请到「小票机」连接后在订单详情「重新打印小票」。'
                  : 'Order accepted, but printer is not connected. Reprint from order details.',
              );
            }
          } catch (printError) {
            console.error('打印失败:', printError);
            feedbackService.notify(
              language === 'zh' ? '小票打印失败' : 'Print failed',
              language === 'zh'
                ? '订单已接单，但自动打印失败。请到订单详情点击「重新打印小票」。'
                : 'Order accepted, but auto-print failed. Reprint from order details.',
            );
          }
        })();
      }
    } catch (error) {
      console.error('接单失败:', error);
      endProcessing();
      feedbackService.notify('错误', '接单失败，请检查网络');
    }
  };

  const handleDecline = async () => {
    if (!orderData || isProcessing) return;
    
    // 🚀 计算退款金额 (仅限会员订单，商家订单不涉及余额支付)
    const isMemberOrder = orderData.description?.includes('[下单身份: 会员]') || 
                         orderData.description?.includes('[下单身份: VIP]') ||
                         orderData.description?.includes('[Orderer: VIP]') ||
                         orderData.description?.includes('[အော်ဒါတင်သူ: VIP]') ||
                         orderData.description?.includes('[Orderer: Member]') ||
                         orderData.description?.includes('[အော်ဒါတင်သူ: Member]');
    let refundAmount = 0;
    
    if (isMemberOrder) {
      // 1. 解析商品余额支付金额 (支持中英缅三语标签)
      const itemPayMatch = orderData.description?.match(/\[(?:商品费用 \(仅余额支付\)|Item Cost \(Balance Only\)|ကုန်ပစ္စည်းဖိုး \(လက်ကျန်ငွေဖြင့်သာ\)|余额支付|Balance Payment|လက်ကျန်ငွေဖြင့် ပေးချေခြင်း): (.*?) MMK\]/);
      if (itemPayMatch && itemPayMatch[1]) {
        refundAmount += parseFloat(itemPayMatch[1].replace(/,/g, ''));
      }
      
      // 2. 检查跑腿费是否也是余额支付
      if (orderData.payment_method === 'balance') {
        refundAmount += parseFloat(orderData.price?.replace(/[^0-9.]/g, '') || '0');
      }
    }

    const confirmTitle = language === 'zh' ? '确认拒绝' : 'Confirm Decline';
    const confirmMsg = language === 'zh' 
      ? `确定要拒绝该订单吗？${refundAmount > 0 ? `\n\n💰 将退还余额: ${refundAmount.toLocaleString()} MMK` : ''}` 
      : `Decline this order?${refundAmount > 0 ? `\n\n💰 Refund: ${refundAmount.toLocaleString()} MMK` : ''}`;

    Alert.alert(
      confirmTitle,
      confirmMsg,
      [
        { text: language === 'zh' ? '取消' : 'Cancel', style: 'cancel' },
        { 
          text: language === 'zh' ? '确定拒绝' : 'Decline', 
          style: 'destructive',
          onPress: async () => {
            beginProcessing();
            try {
              // 1. 更新订单状态为已取消
              const { error: orderError } = await supabase
                .from('packages')
                .update({ 
                  status: '已取消',
                  updated_at: new Date().toISOString() 
                })
                .eq('id', orderData.id);

              if (orderError) throw orderError;

              // 2. 执行退款逻辑 (如果涉及余额支付)
              if (refundAmount > 0 && orderData.customer_id) {
                console.log(`💰 正在为用户 ${orderData.customer_id} 退款: ${refundAmount}`);
                
                // 获取当前余额
                const { data: userData } = await supabase
                  .from('users')
                  .select('balance')
                  .eq('id', orderData.customer_id)
                  .single();
                
                if (userData) {
                  // 增加余额
                  await supabase
                    .from('users')
                    .update({ 
                      balance: (userData.balance || 0) + refundAmount,
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', orderData.customer_id);
                  
                  console.log('✅ 余额已退还');
                }
              }

              onStatusUpdate?.();
              onDeclineSuccess?.(orderData.id);
            } catch (err) {
              console.error('拒绝接单失败:', err);
              feedbackService.notify('错误', '操作失败，请重试');
            } finally {
              endProcessing();
            }
          }
        }
      ]
    );
  };

  // 🚀 商品列表（与小票打印格式一致：序号 + 单价）
  const renderItems = () => {
    if (!receiptSummary?.displays.length) return null;
    const { receipt, totals, displays } = receiptSummary;
    const deliveryLabel =
      language === 'zh' ? '跑腿费' : language === 'my' ? 'ပို့ဆောင်ခ' : 'Delivery Fee';
    const totalLabel =
      language === 'zh' ? '合计' : language === 'my' ? 'စုစုပေါင်း' : 'Total';

    return (
      <View style={styles.infoSection}>
        <View style={styles.sectionHeader}>
          <Ionicons name="basket" size={18} color="#3b82f6" />
          <Text style={styles.sectionTitle}>{language === 'zh' ? '商品信息' : 'Items'}</Text>
        </View>
        <View style={styles.itemBox}>
          {displays.map((display, index) => (
            <View
              key={`${display.lineText}-${index}`}
              style={styles.itemRow}
            >
              <Text style={styles.itemText}>{display.lineText}</Text>
              <Text style={[styles.value, display.isSummary && styles.summaryValue]}>
                {display.amountText === '-' ? '—' : display.amountText}
              </Text>
            </View>
          ))}
          <View style={styles.itemDivider} />
          <View style={styles.itemRow}>
            <Text style={styles.cardLabel}>{deliveryLabel}</Text>
            <Text style={styles.value}>{receipt.deliveryFee.toLocaleString()} MMK</Text>
          </View>
          <View style={styles.itemRow}>
            <Text style={[styles.cardLabel, styles.totalLabel]}>{totalLabel}</Text>
            <Text style={[styles.value, styles.totalValue]}>
              {totals.totalFee.toLocaleString()} MMK
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderBuyerItemNotes = () => {
    const desc = orderData?.description;
    if (!desc) return null;
    const m = desc.match(/\[(?:买家商品备注|Buyer item notes|ဝယ်ယူသူမှတ်ချက်): (.*?)\]/);
    const text = m?.[1]?.trim();
    if (!text) return null;
    return (
      <View style={styles.infoSection}>
        <View style={styles.sectionHeader}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color="#d97706" />
          <Text style={styles.sectionTitle}>
            {language === 'zh' ? '买家商品备注' : language === 'my' ? 'ဝယ်ယူသူမှတ်ချက်' : 'Buyer item notes'}
          </Text>
        </View>
        <View style={[styles.notesCard, { borderLeftWidth: 4, borderLeftColor: '#f59e0b' }]}>
          <Text style={styles.notesText}>{text}</Text>
        </View>
      </View>
    );
  };

  // 🚀 渲染订单选择列表
  const renderOrderSelector = () => {
    if (orders.length <= 1) return null;

    return (
      <View style={styles.orderSelectorContainer}>
        <Text style={styles.selectorHint}>
          {language === 'zh' ? `共有 ${orders.length} 个待处理订单 (点击选择)` : `Total ${orders.length} orders pending`}
        </Text>
        <FlatList
          horizontal
          data={orders}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 10 }}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              onPress={() => setSelectedIndex(index)}
              style={[
                styles.orderTab,
                selectedIndex === index && styles.orderTabActive
              ]}
            >
              <View style={styles.tabContent}>
                <Text style={[styles.tabId, selectedIndex === index && styles.tabIdActive]}>
                  #{item.id.slice(-5)}
                </Text>
                <Text style={[styles.tabTime, selectedIndex === index && styles.tabTimeActive]}>
                  {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              {selectedIndex === index && (
                <View style={styles.activeIndicator} />
              )}
            </TouchableOpacity>
          )}
        />
      </View>
    );
  };

  if (!visible) return null;

  if (!orderData) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { padding: 0, overflow: 'hidden', height: '90%', position: 'relative' }]}>
          <LinearGradient colors={['#1e3a8a', '#2563eb']} style={styles.header}>
            <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
              <View style={styles.headerIconContainer}>
                <Ionicons name="notifications" size={24} color="#fbbf24" />
              </View>
              <View style={{ width: 40 }} />
            </View>
            
            <Text style={styles.modalTitle}>
              {language === 'zh' ? '新订单提醒' : 'New Order Alert'}
            </Text>

            {renderOrderSelector()}
          </LinearGradient>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: FOOTER_SPACE }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ padding: 20 }}>
              {/* 二维码寄件码 */}
              <View style={styles.qrSection}>
                <Text style={styles.qrLabel}>{language === 'zh' ? '订单寄件码' : 'Pickup Code'}</Text>
                <View style={styles.qrContainer}>
                  {orderData?.id && (
                    <QRCode 
                      value={orderData.id} 
                      size={120}
                      color="#1e293b"
                      backgroundColor="white"
                    />
                  )}
                </View>
                <Text style={styles.qrHint}>{language === 'zh' ? '由骑手扫描此码取件' : 'Scan for pickup'}</Text>
                <View style={styles.idBadgeLarge}>
                  <Text style={styles.idBadgeText}>#{orderData?.id}</Text>
                </View>
              </View>

              {/* 商家信息 (寄件人) */}
              <View style={styles.infoSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="business" size={18} color="#3b82f6" />
                  <Text style={styles.sectionTitle}>{language === 'zh' ? '商家信息' : 'Merchant'}</Text>
                </View>
                <View style={styles.infoCard}>
                  <Text style={styles.cardValue}>{orderData?.sender_name}</Text>
                  <Text style={styles.cardSubValue}>{orderData?.sender_phone}</Text>
                  <Text style={styles.cardSubValue}>{orderData?.sender_address}</Text>
                </View>
              </View>

              {/* 商品信息 */}
              {renderItems()}
              {renderBuyerItemNotes()}

              {/* 客户信息 (收件人) */}
              <View style={styles.infoSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="person" size={18} color="#3b82f6" />
                  <Text style={styles.sectionTitle}>{language === 'zh' ? '客户信息' : 'Customer'}</Text>
                </View>
                <View style={styles.infoCard}>
                  <Text style={styles.cardValue}>{orderData?.receiver_name}</Text>
                  <Text style={styles.cardSubValue}>{orderData?.receiver_phone}</Text>
                  <Text style={styles.cardSubValue}>{orderData?.receiver_address}</Text>
                </View>
              </View>

              {/* 支付状态 */}
              <View style={styles.infoSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="card" size={18} color="#3b82f6" />
                  <Text style={styles.sectionTitle}>{language === 'zh' ? '支付状态' : 'Payment'}</Text>
                </View>
                <View style={[styles.infoCard, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                  <Text style={styles.cardLabel}>{language === 'zh' ? '配送费' : 'Delivery Fee'}</Text>
                  <View style={[styles.paymentBadge, { backgroundColor: orderData?.payment_method === 'cash' ? '#f59e0b' : '#10b981' }]}>
                    <Text style={styles.paymentText}>
                      {orderData?.payment_method === 'cash' ? (language === 'zh' ? '现金支付' : 'Cash') : (language === 'zh' ? '余额支付' : 'Balance')}
                    </Text>
                  </View>
                </View>
                {/* 如果包含商品金额解析 */}
                {(() => {
                  const itemPayMatch = orderData?.description?.match(/\[(?:商品费用 \(仅余额支付\)|Item Cost \(Balance Only\)|ကုန်ပစ္စည်းဖိုး \(လက်ကျန်ငွေဖြင့်သာ\)|余额支付|Balance Payment|လက်ကျန်ငွေဖြင့် ပေးချေခြင်း|平台支付|Platform Payment|ပလက်ဖောင်းမှ ပေးချေခြင်း): (.*?) MMK\]/);
                  if (itemPayMatch) {
                    return (
                      <View style={[styles.infoCard, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }]}>
                        <Text style={styles.cardLabel}>{language === 'zh' ? '商品货款' : 'Item Price'}</Text>
                        <View style={[styles.paymentBadge, { backgroundColor: '#3b82f6' }]}>
                          <Text style={styles.paymentText}>{language === 'zh' ? '已支付 (余额)' : 'Paid (Balance)'}</Text>
                        </View>
                      </View>
                    );
                  }
                  return null;
                })()}
              </View>

              {/* 顾客备注 */}
              {orderData?.notes ? (
                <View style={styles.infoSection}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="chatbox-ellipses" size={18} color="#3b82f6" />
                    <Text style={styles.sectionTitle}>{language === 'zh' ? '顾客备注' : 'Notes'}</Text>
                  </View>
                  <View style={styles.notesCard}>
                    <Text style={styles.notesText}>{orderData.notes}</Text>
                  </View>
                </View>
              ) : null}

              <View style={{ height: 20 }} />
            </View>
          </ScrollView>

          <View style={[styles.footer, styles.footerFixed]}>
            <SwipeAcceptDecline 
              language={language}
              disabled={isProcessing}
              onAccept={handleAccept}
              onDecline={handleDecline}
            />
          </View>

          {isProcessing && (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 100 }]}>
              <ActivityIndicator size="large" color="#3b82f6" />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const swipeStyles = StyleSheet.create({
  container: { height: 64, width: width - 60, borderRadius: 32, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', alignSelf: 'center' },
  track: { flexDirection: 'row', width: '100%', height: '100%', position: 'absolute' },
  declineZone: { flex: 1, backgroundColor: '#ef4444', flexDirection: 'row', alignItems: 'center', paddingLeft: 20, gap: 8 },
  acceptZone: { flex: 1, backgroundColor: '#10b981', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 20, gap: 8 },
  zoneText: { color: 'white', fontSize: 14, fontWeight: '900' },
  handle: { width: 110, height: 54, borderRadius: 27, backgroundColor: 'white', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, zIndex: 10 },
  handleGradient: { width: '100%', height: '100%', borderRadius: 27, justifyContent: 'center', alignItems: 'center' }
});

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#f8fafc', borderRadius: 32, width: '94%', ...theme.shadows.large },
  header: { paddingVertical: 16, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  closeButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  headerIconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#fbbf24' },
  modalTitle: { fontSize: 18, fontWeight: '900', color: 'white', textAlign: 'center', marginTop: 8 },
  
  orderSelectorContainer: { marginTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  selectorHint: { color: 'rgba(255,255,255,0.7)', fontSize: 12, textAlign: 'center', marginTop: 8, fontWeight: '600' },
  orderTab: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, marginRight: 10, minWidth: 100, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  orderTabActive: { backgroundColor: 'white', borderColor: '#fbbf24' },
  tabContent: { alignItems: 'center' },
  tabId: { color: 'white', fontSize: 14, fontWeight: '900' },
  tabIdActive: { color: '#1e3a8a' },
  tabTime: { color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 2 },
  tabTimeActive: { color: '#64748b' },
  activeIndicator: { position: 'absolute', bottom: -12, width: 6, height: 6, borderRadius: 3, backgroundColor: '#fbbf24' },

  qrSection: { alignItems: 'center', marginBottom: 20, backgroundColor: 'white', padding: 16, borderRadius: 24, borderWidth: 1, borderColor: '#e2e8f0' },
  qrLabel: { fontSize: 15, fontWeight: '900', color: '#1e293b', marginBottom: 10 },
  qrContainer: { padding: 8, backgroundColor: 'white', borderRadius: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  qrHint: { marginTop: 10, fontSize: 11, color: '#64748b', fontWeight: '600' },
  idBadgeLarge: { marginTop: 12, backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  idBadgeText: { fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', color: '#475569', fontWeight: '700' },

  infoSection: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: '#1e3a8a', textTransform: 'uppercase' },
  infoCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  cardValue: { fontSize: 16, fontWeight: '900', color: '#1e293b', marginBottom: 4 },
  cardSubValue: { fontSize: 13, color: '#64748b', marginTop: 2, lineHeight: 18 },
  cardLabel: { fontSize: 14, color: '#64748b', fontWeight: '600' },

  itemBox: { backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 },
  itemText: { fontSize: 14, color: '#1e293b', fontWeight: '600', flex: 1 },
  itemDivider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 8 },
  summaryValue: { fontWeight: '900' },
  totalLabel: { fontWeight: '900', color: '#1e293b' },
  totalValue: { fontSize: 16, fontWeight: '900', color: '#2563eb' },

  paymentBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  paymentText: { color: 'white', fontSize: 12, fontWeight: '900' },

  notesCard: { backgroundColor: '#fff7ed', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#ffedd5' },
  notesText: { fontSize: 14, color: '#9a3412', fontWeight: '600', lineHeight: 20 },

  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#e2e8f0', backgroundColor: 'white' },
  footerFixed: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  label: { fontSize: 14, color: '#64748b' },
  value: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
});
