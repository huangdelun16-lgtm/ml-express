import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MoneyIcon } from '../Icon';
import { ScaleInView } from '../Animations';

interface DeliverySpeed {
  value: string;
  label: string;
  extra: number;
}

interface PricingSettings {
  base_fee: number;
  free_km_threshold: number;
  per_km_fee: number;
  weight_surcharge: number;
  oversize_surcharge: number;
  fragile_surcharge: number;
  food_beverage_surcharge: number;
  urgent_surcharge: number;
  scheduled_surcharge: number;
}

interface PriceCalculationProps {
  language: 'zh' | 'en' | 'my';
  styles: any;
  currentT: any;
  isCalculated: boolean;
  calculatedDistance: number;
  calculatedPrice: string;
  packageType: string;
  weight: string;
  deliverySpeed: string;
  deliverySpeeds: DeliverySpeed[];
  pricingSettings: PricingSettings;
  onCalculate: () => void;
  paymentMethod: 'balance' | 'cash';
  onPaymentMethodChange: (method: 'balance' | 'cash') => void;
  accountBalance: number;
  cartTotal?: number;
}

const PriceCalculation = memo<PriceCalculationProps>(({
  language,
  styles,
  currentT,
  isCalculated,
  calculatedDistance,
  calculatedPrice,
  packageType,
  weight,
  deliverySpeed,
  deliverySpeeds,
  pricingSettings,
  onCalculate,
  paymentMethod,
  onPaymentMethodChange,
  accountBalance,
  cartTotal = 0,
}) => {
  // 🚀 按照要求：给客户计费的距离向上取整（例如 6.1km = 7km）
  const billingDistance = useMemo(() => Math.max(1, Math.ceil(calculatedDistance)), [calculatedDistance]);

  const speedExtra = useMemo(() => {
    return deliverySpeeds.find(s => s.value === deliverySpeed)?.extra || 0;
  }, [deliverySpeed, deliverySpeeds]);

  const overweightFee = useMemo(() => {
    if (packageType === '超重件（5KG）以上' && parseFloat(weight || '0') > 5) {
      return Math.round(Math.max(0, parseFloat(weight) - 5) * pricingSettings.weight_surcharge);
    }
    return 0;
  }, [packageType, weight, pricingSettings.weight_surcharge]);

  const oversizeFee = useMemo(() => {
    if (packageType === '超规件（45x60x15cm）以上') {
      return Math.round(billingDistance * pricingSettings.oversize_surcharge);
    }
    return 0;
  }, [packageType, billingDistance, pricingSettings.oversize_surcharge]);

  const fragileFee = useMemo(() => {
    if (packageType === '易碎品') {
      return Math.round(billingDistance * pricingSettings.fragile_surcharge);
    }
    return 0;
  }, [packageType, billingDistance, pricingSettings.fragile_surcharge]);

  const foodFee = useMemo(() => {
    if (packageType === '食品和饮料') {
      return Math.round(billingDistance * pricingSettings.food_beverage_surcharge);
    }
    return 0;
  }, [packageType, billingDistance, pricingSettings.food_beverage_surcharge]);

  const distanceFee = useMemo(() => {
    return Math.round(Math.max(0, billingDistance - pricingSettings.free_km_threshold) * pricingSettings.per_km_fee);
  }, [billingDistance, pricingSettings.free_km_threshold, pricingSettings.per_km_fee]);

  return (
    <ScaleInView delay={400}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <MoneyIcon size={18} color="#1e293b" />
            <Text style={styles.sectionTitle}> {currentT.priceEstimate}</Text>
          </View>
          <TouchableOpacity
            style={styles.calculateButton}
            onPress={onCalculate}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#10b981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.calculateButtonGradient}
            >
              <Text style={styles.calculateButtonText}>🧮 {currentT.calculateButton}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.priceCard}>
          {!isCalculated ? (
            <View style={styles.pricePlaceholder}>
              <Text style={styles.pricePlaceholderText}>
                📊 点击"计算"按钮获取精准费用
              </Text>
              <Text style={styles.pricePlaceholderSubtext}>
                需要先选择寄件和收件地址的精确位置
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>{currentT.distance}:</Text>
                <Text style={styles.priceValue}>{billingDistance} {currentT.kmUnit}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>{currentT.basePrice}:</Text>
                <Text style={styles.priceValue}>{pricingSettings.base_fee} MMK</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>{currentT.distancePrice}:</Text>
                <Text style={styles.priceValue}>{distanceFee} MMK</Text>
              </View>
              {overweightFee > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>超重附加费:</Text>
                  <Text style={styles.priceValue}>{overweightFee} MMK</Text>
                </View>
              )}
              {deliverySpeed !== '准时达' && speedExtra > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>{currentT.speedPrice}:</Text>
                  <Text style={styles.priceValue}>{speedExtra} MMK</Text>
                </View>
              )}
              {oversizeFee > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>超规附加费:</Text>
                  <Text style={styles.priceValue}>{oversizeFee} MMK</Text>
                </View>
              )}
              {fragileFee > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>易碎品附加费:</Text>
                  <Text style={styles.priceValue}>{fragileFee} MMK</Text>
                </View>
              )}
              {foodFee > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>食品附加费:</Text>
                  <Text style={styles.priceValue}>{foodFee} MMK</Text>
                </View>
              )}
              <View style={styles.priceDivider} />
              
              {/* 🚀 新增：支付方式选择 (开关形式) */}
              <View style={{ marginBottom: 15, padding: 12, backgroundColor: '#f1f5f9', borderRadius: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#475569', marginBottom: 12 }}>
                  {currentT.shippingFeePayment}
                </Text>
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ 
                      fontSize: 14, 
                      color: paymentMethod === 'balance' ? '#1e293b' : '#64748b', 
                      fontWeight: paymentMethod === 'balance' ? 'bold' : 'normal',
                      opacity: accountBalance === 0 ? 0.5 : 1
                    }}>
                      {currentT.courierFeeBalance}
                    </Text>
                    {paymentMethod === 'balance' && <Text style={{ fontSize: 10, color: '#10b981' }}>[Active]</Text>}
                    {accountBalance === 0 && (
                      <Text style={{ fontSize: 10, color: '#ef4444' }}>({language === 'zh' ? '未充值' : 'No Balance'})</Text>
                    )}
                  </View>
                  <Switch
                    value={paymentMethod === 'balance'}
                    disabled={accountBalance === 0} // 🚀 仅余额为0时禁止开启，不再受商城订单限制
                    onValueChange={(val) => onPaymentMethodChange(val ? 'balance' : 'cash')}
                    trackColor={{ false: '#cbd5e1', true: '#3b82f6' }}
                    thumbColor="#ffffff"
                  />
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 14, color: paymentMethod === 'cash' ? '#1e293b' : '#64748b', fontWeight: paymentMethod === 'cash' ? 'bold' : 'normal' }}>
                      {currentT.courierFeeCash}
                    </Text>
                    {paymentMethod === 'cash' && <Text style={{ fontSize: 10, color: '#10b981' }}>[Active]</Text>}
                  </View>
                  <Switch
                    value={paymentMethod === 'cash'}
                    disabled={accountBalance === 0} // 🚀 余额为0时锁定为现金支付，禁止切换
                    onValueChange={(val) => onPaymentMethodChange(val ? 'cash' : 'balance')}
                    trackColor={{ false: '#cbd5e1', true: '#3b82f6' }}
                    thumbColor="#ffffff"
                  />
                </View>
                
                {paymentMethod === 'balance' && (
                  <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0' }}>
                    <Text style={{ fontSize: 11, color: accountBalance < parseFloat(calculatedPrice) ? '#ef4444' : '#10b981', textAlign: 'center' }}>
                      {currentT.accountBalance}: {accountBalance.toLocaleString()} MMK 
                      {accountBalance < parseFloat(calculatedPrice) ? ` (${currentT.insufficientBalance})` : ''}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.priceDivider} />
              <View style={styles.priceRow}>
                <Text style={styles.priceLabelTotal}>{currentT.totalPrice}:</Text>
                <Text style={styles.priceTotal}>{calculatedPrice} MMK</Text>
              </View>
            </>
          )}
        </View>
      </View>
    </ScaleInView>
  );
});

PriceCalculation.displayName = 'PriceCalculation';

export default PriceCalculation;

