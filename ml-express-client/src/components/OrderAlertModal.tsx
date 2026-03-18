import React, { useRef, useState, useEffect } from 'react';
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
import { theme } from '../config/theme';
import * as Print from 'expo-print';
import QRCodeGenerator from 'qrcode';

const { width } = Dimensions.get('window');
const FOOTER_SPACE = 120;

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

export const OrderAlertModal = ({ 
  visible, 
  orders = [], // 🚀 改为数组
  onClose, 
  language, 
  onStatusUpdate, 
  onAccepted,
  onDeclineSuccess 
}: any) => {
  const [selectedIndex, setSelectedIndex] = useState(0); // 🚀 当前选择的订单索引
  const [isProcessing, setIsProcessing] = useState(false);
  const [productPriceMap, setProductPriceMap] = useState<Record<string, number>>({});

  // 🚀 当订单数组变化时，确保索引合法
  useEffect(() => {
    if (selectedIndex >= orders.length) {
      setSelectedIndex(Math.max(0, orders.length - 1));
    }
  }, [orders.length]);

  const orderData = orders[selectedIndex]; // 🚀 当前选中的订单数据

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

  const getPrintableItems = () => {
    if (!orderData?.description) return [];
    const itemsMatch = orderData.description.match(/\[(?:已选商品|Selected|Selected Products|ရွေးချယ်ထားသောပစ္စည်းများ|ကုန်ပစ္စည်းများ): (.*?)\]/);
    if (!itemsMatch || !itemsMatch[1]) return [];
    const items = itemsMatch[1].split(', ');
    return items.map((item: string) => {
      const match = item.match(/^(.+?)\s*x(\d+)$/i);
      if (!match) {
        return { label: item, qty: 1, price: undefined };
      }
      const name = match[1].trim();
      const qty = Number(match[2]) || 1;
      const unitPrice = productPriceMap[name];
      return { label: name, qty, price: unitPrice ? unitPrice * qty : undefined };
    });
  };

  const handlePrintOrder = async () => {
    const qrDataUrl = orderData?.id
      ? await QRCodeGenerator.toDataURL(orderData.id, { margin: 1, width: 180 })
      : '';
    const items = getPrintableItems();
    const itemPayMatch = orderData?.description?.match(/\[(?:商品费用 \(仅余额支付\)|Item Cost \(Balance Only\)|ကုန်ပစ္စည်းဖိုး \(လက်ကျန်ငွေဖြင့်သာ\)|余额支付|Balance Payment|လက်ကျန်ငွေဖြင့် ပေးချေခြင်း|平台支付|Platform Payment|ပလက်ဖောင်းမှ ပေးချေခြင်း): (.*?) MMK\]/);
    const itemCost = itemPayMatch?.[1] ? parseFloat(itemPayMatch[1].replace(/,/g, '')) : 0;
    const deliveryFee = parseFloat(orderData?.price?.replace(/[^0-9.]/g, '') || '0');
    const computedItemTotal = items.reduce((sum, item) => sum + (item.price || 0), 0);
    const finalItemTotal = itemCost > 0 ? itemCost : computedItemTotal;
    const totalFee = deliveryFee + finalItemTotal;
    const paymentText = orderData?.payment_method === 'cash' ? '现金支付' : '余额支付';
    const orderIdShort = orderData?.id ? `#${orderData.id.slice(-5)}` : '';
    const html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; padding: 0; font-family: Arial, sans-serif; color: #111827; }
            .ticket { width: 100%; max-width: 420px; margin: 0 auto; padding: 16px; }
            .title { text-align: center; font-size: 18px; font-weight: 700; margin-bottom: 8px; }
            .subtitle { text-align: center; font-size: 12px; color: #6b7280; margin-bottom: 12px; }
            .section { margin-top: 12px; padding-top: 8px; border-top: 1px dashed #e5e7eb; }
            .row { display: flex; justify-content: space-between; align-items: flex-start; font-size: 12px; margin: 4px 0; }
            .label { color: #6b7280; }
            .value { font-weight: 600; text-align: right; }
            .items { margin-top: 6px; }
            .item { display: flex; justify-content: space-between; font-size: 12px; margin: 4px 0; }
            .total { font-size: 14px; font-weight: 700; }
            .note { font-size: 11px; color: #6b7280; margin-top: 8px; text-align: center; }
            .qr { display: flex; flex-direction: column; align-items: center; margin-top: 8px; }
            .qr img { width: 160px; height: 160px; }
            .qr-code { font-size: 12px; font-weight: 700; margin-top: 6px; }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="title">MARKET LINK EXPRESS</div>
            <div class="subtitle">订单号 ${orderIdShort}</div>

            ${qrDataUrl ? `
              <div class="qr">
                <img src="${qrDataUrl}" />
                <div class="qr-code">取件码: ${orderData?.id || '-'}</div>
              </div>
            ` : ''}

            <div class="section">
              <div class="row"><div class="label">商家</div><div class="value">${orderData?.sender_name || '-'}</div></div>
              <div class="row"><div class="label">电话</div><div class="value">${orderData?.sender_phone || '-'}</div></div>
              <div class="row"><div class="label">地址</div><div class="value">${orderData?.sender_address || '-'}</div></div>
            </div>

            <div class="section">
              <div class="row"><div class="label">客户</div><div class="value">${orderData?.receiver_name || '-'}</div></div>
              <div class="row"><div class="label">电话</div><div class="value">${orderData?.receiver_phone || '-'}</div></div>
              <div class="row"><div class="label">地址</div><div class="value">${orderData?.receiver_address || '-'}</div></div>
            </div>

            <div class="section">
              <div class="row"><div class="label">支付方式</div><div class="value">${paymentText}</div></div>
              <div class="items">
                ${(items.length === 0)
                  ? '<div class="item"><div class="label">商品</div><div class="value">-</div></div>'
                  : items.map(item => `
                      <div class="item">
                        <div>${item.label} x${item.qty}</div>
                        <div class="value">${item.price ? `${item.price.toLocaleString()} MMK` : '-'}</div>
                      </div>
                    `).join('')}
              </div>
              <div class="row"><div class="label">跑腿费</div><div class="value">${deliveryFee.toLocaleString()} MMK</div></div>
              <div class="row total"><div class="label">合计</div><div class="value">${totalFee.toLocaleString()} MMK</div></div>
            </div>

            <div class="note">请保留此票据用于对账</div>
          </div>
        </body>
      </html>
    `;
    await Print.printAsync({ html });
  };

  const handleAccept = async () => {
    if (!orderData || isProcessing) return;
    setIsProcessing(true);
    try {
      const newStatus = '打包中'; // 🚀 改为“打包中”
      const { error } = await supabase
        .from('packages')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderData.id);

      if (error) throw error;
      onStatusUpdate?.();
      try {
        await handlePrintOrder();
      } catch (printError) {
        console.error('打印失败:', printError);
        Alert.alert('错误', '打印失败，请检查打印机连接');
      }
      onAccepted?.(orderData);
      // 注意：App.tsx 中 onAccepted 会调用 removePendingOrder，所以这里不需要手动处理索引
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
            setIsProcessing(true);
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
    const itemPayMatch = orderData.description.match(/\[(?:商品费用 \(仅余额支付\)|Item Cost \(Balance Only\)|ကုန်ပစ္စည်းဖိုး \(လက်ကျန်ငွေဖြင့်သာ\)|余额支付|Balance Payment|လက်ကျန်ငွေဖြင့် ပေးချေခြင်း|平台支付|Platform Payment|ပလက်ဖောင်းမှ ပေးချေခြင်း): (.*?) MMK\]/);
    const itemCost = itemPayMatch?.[1] ? parseFloat(itemPayMatch[1].replace(/,/g, '')) : 0;
    const deliveryFee = parseFloat(orderData?.price?.replace(/[^0-9.]/g, '') || '0');
    const parsedItems = items.map((item: string) => {
      const match = item.match(/^(.+?)\s*x(\d+)$/i);
      if (!match) {
        return { label: item, qty: 1, price: undefined };
      }
      const name = match[1].trim();
      const qty = Number(match[2]) || 1;
      const unitPrice = productPriceMap[name];
      return { label: name, qty, price: unitPrice ? unitPrice * qty : undefined };
    });
    const computedItemTotal = parsedItems.reduce((sum, item) => sum + (item.price || 0), 0);
    const finalItemTotal = itemCost > 0 ? itemCost : computedItemTotal;
    const totalFee = deliveryFee + finalItemTotal;
    
    return (
      <View style={styles.infoSection}>
        <View style={styles.sectionHeader}>
          <Ionicons name="basket" size={18} color="#3b82f6" />
          <Text style={styles.sectionTitle}>{language === 'zh' ? '商品信息' : 'Items'}</Text>
        </View>
        <View style={styles.itemBox}>
          {parsedItems.map((item, index) => (
            <View
              key={`${item.label}-${index}`}
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}
            >
              <Text style={styles.itemText}>• {item.label} x{item.qty}</Text>
              <Text style={styles.value}>
                {item.price ? `${item.price.toLocaleString()} MMK` : '-'}
              </Text>
            </View>
          ))}
          <View style={{ height: 8 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.cardLabel}>{language === 'zh' ? '跑腿费' : language === 'my' ? 'ပို့ဆောင်ခ' : 'Delivery Fee'}</Text>
            <Text style={styles.value}>{deliveryFee.toLocaleString()} MMK</Text>
          </View>
          <View style={{ height: 8 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.cardLabel}>{language === 'zh' ? '统计' : language === 'my' ? 'စုစုပေါင်း' : 'Total'}</Text>
            <Text style={styles.value}>{totalFee.toLocaleString()} MMK</Text>
          </View>
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

  if (!orderData && visible) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <ActivityIndicator size="large" color="white" />
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
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
  itemText: { fontSize: 14, color: '#1e293b', fontWeight: '600', marginBottom: 6 },

  paymentBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  paymentText: { color: 'white', fontSize: 12, fontWeight: '900' },

  notesCard: { backgroundColor: '#fff7ed', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#ffedd5' },
  notesText: { fontSize: 14, color: '#9a3412', fontWeight: '600', lineHeight: 20 },

  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#e2e8f0', backgroundColor: 'white' },
  footerFixed: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  label: { fontSize: 14, color: '#64748b' },
  value: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
});
