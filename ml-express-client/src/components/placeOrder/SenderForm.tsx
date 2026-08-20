import React, { memo } from 'react';
import { View, Text, TextInput, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { PackageIcon } from '../Icon';

interface SenderFormProps {
  language: 'zh' | 'en' | 'my';
  styles: any;
  currentT: any;
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  useMyInfo: boolean;
  senderCoordinates: { lat: number; lng: number } | null;
  errors?: Record<string, string>;
  touched?: Record<string, boolean>;
  onSenderNameChange: (text: string) => void;
  onSenderPhoneChange: (text: string) => void;
  onSenderAddressChange: (text: string) => void;
  onUseMyInfoChange: (value: boolean) => void;
  onOpenMap: () => void;
  onOpenAddressBook: () => void;
  onBlur?: (field: string) => void;
  disabled?: boolean;
}

const SenderForm = memo<SenderFormProps>(({
  language,
  styles,
  currentT,
  senderName,
  senderPhone,
  senderAddress,
  useMyInfo,
  senderCoordinates,
  errors = {},
  touched = {},
  onSenderNameChange,
  onSenderPhoneChange,
  onSenderAddressChange,
  onUseMyInfoChange,
  onOpenMap,
  onOpenAddressBook,
  onBlur,
  disabled = false,
}) => {
  const handleAddressChange = (text: string) => {
    if (disabled) return;
    const lines = text.split('\n');
    const addressLines = lines.filter(line => !line.includes('📍'));
    onSenderAddressChange(addressLines.join('\n'));
  };

  const chooseAddressT = {
    zh: '常用地址',
    en: 'Saved Address',
    my: 'လိပ်စာစာအုပ်',
  }[language] || '常用地址';

  const myInfoT = {
    zh: '我的信息',
    en: 'My Info',
    my: 'ကျွန်ုပ်၏အချက်အလက်',
  }[language] || '我的信息';

  const mallSenderLockT = {
    zh: '商城订单已自动锁定店铺信息',
    en: 'Store info locked for mall order',
    my: 'ဆိုင်အချက်အလက်များကို ပိတ်ထားသည်',
  }[language] || '商城订单已自动锁定店铺信息';

  return (
    <View style={[styles.section, disabled && { opacity: 0.8 }]}>
        <View style={localStyles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <PackageIcon size={16} color="#1e293b" />
            <Text style={styles.sectionTitle}> {currentT.senderInfo}</Text>
          </View>
          {!disabled ? (
            <TouchableOpacity
              onPress={onOpenAddressBook}
              style={localStyles.addressBookBtn}
              activeOpacity={0.75}
            >
              <Text style={localStyles.addressBookBtnText}>📖 {chooseAddressT}</Text>
            </TouchableOpacity>
          ) : (
            <View style={localStyles.lockBadge}>
              <Text style={localStyles.lockBadgeText}>🔒 {mallSenderLockT}</Text>
            </View>
          )}
        </View>

        {!disabled && (
          <View style={localStyles.myInfoRow}>
            <Text style={localStyles.myInfoLabel}>{myInfoT}</Text>
            <Switch
              value={useMyInfo}
              onValueChange={onUseMyInfoChange}
              trackColor={{ false: '#cbd5e1', true: '#2C98A6' }}
              thumbColor={useMyInfo ? '#2C98A6' : '#f8fafc'}
              ios_backgroundColor="#cbd5e1"
              style={localStyles.myInfoSwitch}
            />
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{currentT.senderName} *</Text>
          <TextInput
            style={[
              styles.input,
              touched.senderName && errors.senderName ? { borderColor: '#ef4444', borderWidth: 1 } : null,
              disabled && { backgroundColor: '#f8fafc', color: '#64748b' },
            ]}
            value={senderName}
            onChangeText={onSenderNameChange}
            onBlur={() => onBlur && onBlur('senderName')}
            placeholder={currentT.placeholders.name}
            placeholderTextColor="#9ca3af"
            editable={!disabled}
          />
          {touched.senderName && errors.senderName && (
            <Text style={localStyles.errorText}>{errors.senderName}</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{currentT.senderPhone} *</Text>
          <TextInput
            style={[
              styles.input,
              touched.senderPhone && errors.senderPhone ? { borderColor: '#ef4444', borderWidth: 1 } : null,
              disabled && { backgroundColor: '#f8fafc', color: '#64748b' },
            ]}
            value={senderPhone}
            onChangeText={onSenderPhoneChange}
            onBlur={() => onBlur && onBlur('senderPhone')}
            placeholder={currentT.placeholders.phone}
            placeholderTextColor="#9ca3af"
            keyboardType="phone-pad"
            editable={!disabled}
          />
          {touched.senderPhone && errors.senderPhone && (
            <Text style={localStyles.errorText}>{errors.senderPhone}</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>{currentT.senderAddress} *</Text>
            {!disabled && (
              <TouchableOpacity onPress={onOpenMap}>
                <Text style={styles.linkButton}>🗺️ {currentT.openMap}</Text>
              </TouchableOpacity>
            )}
          </View>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              touched.senderAddress && errors.senderAddress ? { borderColor: '#ef4444', borderWidth: 1 } : null,
              disabled && { backgroundColor: '#f8fafc', color: '#64748b' },
            ]}
            value={senderAddress}
            onChangeText={handleAddressChange}
            onBlur={() => onBlur && onBlur('senderAddress')}
            placeholder={currentT.placeholders.address}
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={2}
            editable={!disabled}
          />
          {touched.senderAddress && errors.senderAddress && (
            <Text style={localStyles.errorText}>{errors.senderAddress}</Text>
          )}
          {senderCoordinates && (
            <View style={styles.coordsContainer}>
              <Text style={styles.coordsLabel}>经纬度：</Text>
              <Text style={styles.coordsText}>
                {senderCoordinates.lat.toFixed(6)}, {senderCoordinates.lng.toFixed(6)}
              </Text>
            </View>
          )}
        </View>
      </View>
  );
});

SenderForm.displayName = 'SenderForm';

const localStyles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  addressBookBtn: {
    backgroundColor: '#e8f5f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#b7dce1',
    flexShrink: 0,
  },
  addressBookBtnText: {
    fontSize: 11,
    color: '#2C98A6',
    fontWeight: '700',
  },
  lockBadge: {
    backgroundColor: 'rgba(44, 152, 166, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexShrink: 1,
  },
  lockBadgeText: {
    fontSize: 10,
    color: '#2C98A6',
    fontWeight: '700',
  },
  myInfoRow: {
    marginBottom: 8,
  },
  myInfoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 1,
  },
  myInfoSwitch: {
    alignSelf: 'flex-start',
    transform: [{ scaleX: 0.78 }, { scaleY: 0.78 }],
    marginLeft: -8,
    marginTop: -2,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
});

export default SenderForm;
