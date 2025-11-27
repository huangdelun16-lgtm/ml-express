import React, { memo } from 'react';
import { View, Text, TextInput, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { PackageIcon } from '../Icon';
import { FadeInView } from '../Animations';

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
  onBlur?: (field: string) => void;
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
  onBlur,
}) => {
  const handleAddressChange = (text: string) => {
    // 如果用户手动编辑地址，移除坐标信息
    const lines = text.split('\n');
    const addressLines = lines.filter(line => !line.includes('📍'));
    onSenderAddressChange(addressLines.join('\n'));
  };

  return (
    <FadeInView delay={100}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <PackageIcon size={18} color="#1e293b" />
            <Text style={styles.sectionTitle}> {currentT.senderInfo}</Text>
          </View>
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>{currentT.useMyInfo}</Text>
            <Switch
              value={useMyInfo}
              onValueChange={onUseMyInfoChange}
              trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
              thumbColor={useMyInfo ? '#3b82f6' : '#f3f4f6'}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{currentT.senderName} *</Text>
          <TextInput
            style={[
              styles.input,
              touched.senderName && errors.senderName ? { borderColor: '#ef4444', borderWidth: 1 } : null
            ]}
            value={senderName}
            onChangeText={onSenderNameChange}
            onBlur={() => onBlur && onBlur('senderName')}
            placeholder={currentT.placeholders.name}
            placeholderTextColor="#9ca3af"
          />
          {touched.senderName && errors.senderName && (
            <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.senderName}</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{currentT.senderPhone} *</Text>
          <TextInput
            style={[
              styles.input,
              touched.senderPhone && errors.senderPhone ? { borderColor: '#ef4444', borderWidth: 1 } : null
            ]}
            value={senderPhone}
            onChangeText={onSenderPhoneChange}
            onBlur={() => onBlur && onBlur('senderPhone')}
            placeholder={currentT.placeholders.phone}
            placeholderTextColor="#9ca3af"
            keyboardType="phone-pad"
          />
          {touched.senderPhone && errors.senderPhone && (
            <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.senderPhone}</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>{currentT.senderAddress} *</Text>
            <TouchableOpacity onPress={onOpenMap}>
              <Text style={styles.linkButton}>🗺️ {currentT.openMap}</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={[
              styles.input, 
              styles.textArea,
              touched.senderAddress && errors.senderAddress ? { borderColor: '#ef4444', borderWidth: 1 } : null
            ]}
            value={senderAddress}
            onChangeText={handleAddressChange}
            onBlur={() => onBlur && onBlur('senderAddress')}
            placeholder={currentT.placeholders.address}
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={3}
          />
          {touched.senderAddress && errors.senderAddress && (
            <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.senderAddress}</Text>
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
    </FadeInView>
  );
});

SenderForm.displayName = 'SenderForm';

export default SenderForm;

