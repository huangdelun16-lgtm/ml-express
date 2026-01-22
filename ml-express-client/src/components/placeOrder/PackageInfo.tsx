import React, { memo, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { PackageIcon } from '../Icon';
import { FadeInView } from '../Animations';
import PackageTypeChip from './PackageTypeChip';

interface PackageInfoProps {
  language: 'zh' | 'en' | 'my';
  styles: any;
  currentT: any;
  packageType: string;
  weight: string;
  description: string;
  showWeightInput: boolean;
  packageTypes: Array<{ value: string; label: string }>;
  onPackageTypeChange: (value: string) => void;
  onWeightChange: (text: string) => void;
  onDescriptionChange: (text: string) => void;
  onPackageTypeInfoClick: (type: string) => void;
  cartTotal?: number;
  accountBalance?: number;
}

const PackageInfo = memo<PackageInfoProps>(({
  language,
  styles,
  currentT,
  packageType,
  weight,
  description,
  showWeightInput,
  packageTypes,
  onPackageTypeChange,
  onWeightChange,
  onDescriptionChange,
  onPackageTypeInfoClick,
  cartTotal,
  accountBalance = 0,
}) => {
  const handlePackageTypeClick = (typeValue: string) => {
    onPackageTypeChange(typeValue);
    onPackageTypeInfoClick(typeValue);
  };

  return (
    <FadeInView delay={300}>
      <View style={styles.section}>
        <View style={styles.sectionTitleContainer}>
          <PackageIcon size={18} color="#1e293b" />
          <Text style={styles.sectionTitle}> {currentT.packageInfo}</Text>
        </View>

        {/* 包裹类型部分 */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>包裹类型 *</Text>
          <View style={styles.chipContainer}>
            {packageTypes.map((type) => (
              <PackageTypeChip
                key={type.value}
                type={type}
                isSelected={packageType === type.value}
                onPress={handlePackageTypeClick}
                styles={styles}
              />
            ))}
          </View>
        </View>

        {/* 重量输入框 - 只在选择超重件或超规件时显示 */}
        {showWeightInput && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{currentT.weight} *</Text>
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={onWeightChange}
              placeholder={currentT.placeholders.weight}
              placeholderTextColor="#9ca3af"
              keyboardType="decimal-pad"
            />
          </View>
        )}

        {/* 包裹描述 */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{currentT.description}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={onDescriptionChange}
            placeholder={currentT.placeholders.description}
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* 余额支付 (从购物车结算时显示) */}
        {cartTotal !== undefined && cartTotal > 0 && (
          <View style={{ marginTop: 15, padding: 12, backgroundColor: '#f1f5f9', borderRadius: 12 }}>
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#475569', marginBottom: 12 }}>
              {currentT.itemBalancePayment}
            </Text>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 14, color: '#1e293b', fontWeight: 'bold' }}>
                  {currentT.balancePayment}
                </Text>
                <Text style={{ fontSize: 10, color: '#10b981' }}>[Active]</Text>
              </View>
              <View style={{ backgroundColor: '#10b981', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                <Text style={{ fontSize: 12, color: 'white', fontWeight: 'bold' }}>
                  {cartTotal.toLocaleString()} MMK
                </Text>
              </View>
            </View>

            <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0' }}>
              <Text style={{ fontSize: 11, color: accountBalance < cartTotal ? '#ef4444' : '#10b981', textAlign: 'center' }}>
                {currentT.accountBalance}: {accountBalance.toLocaleString()} MMK 
                {accountBalance < cartTotal ? ` (${currentT.insufficientBalance})` : ''}
              </Text>
            </View>
          </View>
        )}
      </View>
    </FadeInView>
  );
});

PackageInfo.displayName = 'PackageInfo';

export default PackageInfo;

