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
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
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
    
    // 🚀 计算退款金额 (仅限会员订单，合伙人订单不涉及余额支付)
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
      <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Ionicons name="cart-outline" size={16} color="#1e3a8a" />
          <Text style={[styles.label, { marginLeft: 4, color: '#1e3a8a', fontWeight: 'bold' }]}>
            {language === 'zh' ? '商品清单' : 'Item List'}:
          </Text>
        </View>
        <View style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)', borderRadius: 10, padding: 10 }}>
          {items.map((item: string, index: number) => (
            <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={[styles.value, { flex: 1, fontSize: 13 }]}>• {item}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { padding: 0, overflow: 'hidden', maxWidth: 360 }]}>
          <LinearGradient colors={['#1e3a8a', '#2563eb']} style={{ padding: 24, alignItems: 'center' }}>
            <View style={styles.iconContainer}>
              <Ionicons name="notifications" size={40} color="#fbbf24" />
            </View>
            <Text style={styles.modalTitle}>{language === 'zh' ? '您有新的订单！' : 'New Order!'}</Text>
            <Text style={styles.orderId}>{orderData?.id}</Text>
          </LinearGradient>

          <View style={{ padding: 24 }}>
            <View style={styles.detailContainer}>
              <View style={styles.detailRow}>
                <Text style={styles.label}>{language === 'zh' ? '寄件人' : 'Sender'}:</Text>
                <Text style={styles.value}>{orderData?.sender_name}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.label}>{language === 'zh' ? '总计金额' : 'Total'}:</Text>
                <Text style={[styles.value, { color: '#ef4444', fontSize: 18 }]}>{orderData?.price} MMK</Text>
              </View>
              <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.label}>{language === 'zh' ? '支付方式' : 'Payment'}:</Text>
                <Text style={[styles.value, { color: orderData?.payment_method === 'cash' ? '#f59e0b' : '#10b981' }]}>
                  {orderData?.payment_method === 'cash' ? (language === 'zh' ? '现金支付' : 'Cash') : (language === 'zh' ? '余额支付' : 'Balance')}
                </Text>
              </View>
              
              {/* 🚀 显示具体商品 */}
              {renderItems()}
            </View>

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
  container: { height: 60, width: width - 80, borderRadius: 30, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginVertical: 10 },
  track: { flexDirection: 'row', width: '100%', height: '100%', position: 'absolute' },
  declineZone: { flex: 1, backgroundColor: '#ef4444', flexDirection: 'row', alignItems: 'center', paddingLeft: 15, gap: 8 },
  acceptZone: { flex: 1, backgroundColor: '#10b981', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 15, gap: 8 },
  zoneText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  handle: { width: 100, height: 50, borderRadius: 25, backgroundColor: 'white', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, zIndex: 10 },
  handleGradient: { width: '100%', height: '100%', borderRadius: 25, justifyContent: 'center', alignItems: 'center' }
});

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', borderRadius: 24, width: '90%', ...theme.shadows.large },
  iconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 2, borderColor: '#fbbf24' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: 'white', textAlign: 'center' },
  orderId: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 8 },
  detailContainer: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  label: { fontSize: 14, color: '#64748b' },
  value: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
});
