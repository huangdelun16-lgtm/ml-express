import React, { useRef, useState } from 'react';
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
  Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { supabase } from '../services/supabase';
import { theme } from '../config/theme';

const { width } = Dimensions.get('window');

// 🚀 双向滑动确认组件 (右滑接单/左滑取消)
const SwipeAcceptDecline = ({ onAccept, onDecline, language }: any) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const buttonWidth = width - 80;
  const handleWidth = 100;
  const swipeRange = (buttonWidth - handleWidth) / 2;
  const swipeThreshold = swipeRange * 0.7;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({ x: (pan.x as any)._value, y: 0 });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x }], { useNativeDriver: false }),
      onPanResponderRelease: (e, gestureState) => {
        pan.flattenOffset();
        
        if (gestureState.dx > swipeThreshold) {
          // 右滑接单
          console.log('✅ 触发右滑接单');
          Animated.spring(pan, { toValue: { x: swipeRange * 2, y: 0 }, useNativeDriver: false }).start(() => {
            onAccept();
            pan.setValue({ x: 0, y: 0 });
          });
        } else if (gestureState.dx < -swipeThreshold) {
          // 左滑取消
          console.log('❌ 触发左滑取消');
          Animated.spring(pan, { toValue: { x: -swipeRange * 2, y: 0 }, useNativeDriver: false }).start(() => {
            onDecline();
            pan.setValue({ x: 0, y: 0 });
          });
        } else {
          // 回弹
          console.log('↩️ 滑动距离不足，回弹');
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
        }
      },
    })
  ).current;

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

export const OrderAlertModal = ({ visible, orderData, onClose, language, onStatusUpdate }: any) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAccept = async () => {
    if (!orderData || isProcessing) return;
    setIsProcessing(true);
    try {
      const newStatus = orderData.payment_method === 'cash' ? '待收款' : '待取件';
      const { error } = await supabase
        .from('packages')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderData.id);

      if (error) throw error;
      onStatusUpdate?.();
      onClose();
    } catch (error) {
      console.error('接单失败:', error);
      Alert.alert('错误', '接单失败，请检查网络');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!orderData || isProcessing) return;
    
    // 🚀 计算退款金额 (仅限会员订单，商家订单不涉及余额支付)
    const isMemberOrder = orderData.description?.includes('[下单身份: 会员]') || orderData.description?.includes('[下单身份: VIP]');
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
            setIsProcessing(true);
            try {
              // 1. 更新订单状态为已取消
              const { error: orderError } = await supabase
                .from('packages')
                .update({ 
                  status: '已取消', 
                  notes: (orderData.notes || '') + ' [商家拒绝接单]',
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
              onClose();
            } catch (err) {
              console.error('拒绝接单失败:', err);
              Alert.alert('错误', '操作失败，请重试');
            } finally {
              setIsProcessing(false);
            }
          }
        }
      ]
    );
  };

  // 🚀 解析商品列表显示
  const renderItems = () => {
    if (!orderData?.description) return null;
    
    const itemsMatch = orderData.description.match(/\[(?:已选商品|Selected|Selected Products|ရွေးချယ်ထားသောပစ္စည်းများ|ကုန်ပစ္စည်းများ): (.*?)\]/);
    if (!itemsMatch || !itemsMatch[1]) return null;
    
    const items = itemsMatch[1].split(', ');
    
    return (
      <View style={styles.infoSection}>
        <View style={styles.sectionHeader}>
          <Ionicons name="basket" size={18} color="#3b82f6" />
          <Text style={styles.sectionTitle}>{language === 'zh' ? '商品信息' : 'Items'}</Text>
        </View>
        <View style={styles.itemBox}>
          {items.map((item: string, index: number) => (
            <Text key={index} style={styles.itemText}>• {item}</Text>
          ))}
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { padding: 0, overflow: 'hidden', height: '85%' }]}>
          <LinearGradient colors={['#1e3a8a', '#2563eb']} style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="notifications" size={32} color="#fbbf24" />
            </View>
            <Text style={styles.modalTitle}>{language === 'zh' ? '您有新的订单！' : 'New Order!'}</Text>
            <View style={styles.badgeContainer}>
              <Text style={styles.orderIdBadge}>
                {language === 'zh' ? '订单编号：' : 'Order No: '}
                <Text style={{ fontWeight: '900', fontSize: 18 }}>#{orderData?.id?.slice(-5)}</Text>
              </Text>
            </View>
          </LinearGradient>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <View style={{ padding: 20 }}>
              {/* 二维码寄件码 */}
              <View style={styles.qrSection}>
                <Text style={styles.qrLabel}>{language === 'zh' ? '订单寄件码' : 'Pickup Code'}</Text>
                <View style={styles.qrContainer}>
                  {orderData?.id && (
                    <QRCode 
                      value={orderData.id} 
                      size={140}
                      color="#1e293b"
                      backgroundColor="white"
                    />
                  )}
                </View>
                <Text style={styles.qrHint}>{language === 'zh' ? '由骑手扫描此码取件' : 'Scan for pickup'}</Text>
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

          <View style={styles.footer}>
            <SwipeAcceptDecline 
              language={language}
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
  modalContent: { backgroundColor: '#f8fafc', borderRadius: 32, width: '92%', ...theme.shadows.large },
  header: { padding: 24, alignItems: 'center', borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  iconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 2, borderColor: '#fbbf24' },
  modalTitle: { fontSize: 20, fontWeight: '900', color: 'white', textAlign: 'center' },
  badgeContainer: { marginTop: 12, backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  orderIdBadge: { color: 'rgba(255,255,255,0.9)', fontSize: 14 },
  
  qrSection: { alignItems: 'center', marginBottom: 20, backgroundColor: 'white', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#e2e8f0' },
  qrLabel: { fontSize: 16, fontWeight: '900', color: '#1e293b', marginBottom: 12 },
  qrContainer: { padding: 10, backgroundColor: 'white', borderRadius: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  qrHint: { marginTop: 12, fontSize: 12, color: '#64748b', fontWeight: '600' },

  infoSection: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '900', color: '#1e3a8a', textTransform: 'uppercase' },
  infoCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  cardValue: { fontSize: 16, fontWeight: '900', color: '#1e293b', marginBottom: 4 },
  cardSubValue: { fontSize: 13, color: '#64748b', marginTop: 2, lineHeight: 18 },
  cardLabel: { fontSize: 14, color: '#64748b', fontWeight: '600' },

  itemBox: { backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  itemText: { fontSize: 14, color: '#1e293b', fontWeight: '600', marginBottom: 6 },

  paymentBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  paymentText: { color: 'white', fontSize: 12, fontWeight: '900' },

  notesCard: { backgroundColor: '#fff7ed', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#ffedd5' },
  notesText: { fontSize: 14, color: '#9a3412', fontWeight: '600', lineHeight: 20 },

  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#e2e8f0', backgroundColor: 'white' },
  label: { fontSize: 14, color: '#64748b' },
  value: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
});
