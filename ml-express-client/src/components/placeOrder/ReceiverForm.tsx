import React, { memo } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { LocationIcon } from '../Icon';
import { FadeInView } from '../Animations';

interface ReceiverFormProps {
  language: 'zh' | 'en' | 'my';
  styles: any;
  currentT: any;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  receiverCoordinates: { lat: number; lng: number } | null;
  errors?: Record<string, string>;
  touched?: Record<string, boolean>;
  onReceiverNameChange: (text: string) => void;
  onReceiverPhoneChange: (text: string) => void;
  onReceiverAddressChange: (text: string) => void;
  onOpenMap: () => void;
  onBlur?: (field: string) => void;
}

const ReceiverForm = memo<ReceiverFormProps>(({
  language,
  styles,
  currentT,
  receiverName,
  receiverPhone,
  receiverAddress,
  receiverCoordinates,
  errors = {},
  touched = {},
  onReceiverNameChange,
  onReceiverPhoneChange,
  onReceiverAddressChange,
  onOpenMap,
  onBlur,
}) => {
  const handleAddressChange = (text: string) => {
    // 如果用户手动编辑地址，移除坐标信息
    const lines = text.split('\n');
    const addressLines = lines.filter(line => !line.includes('📍'));
    onReceiverAddressChange(addressLines.join('\n'));
  };

  return (
    <FadeInView delay={200}>
      <View style={styles.section}>
        <View style={styles.sectionTitleContainer}>
          <LocationIcon size={18} color="#1e293b" />
          <Text style={styles.sectionTitle}> {currentT.receiverInfo}</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{currentT.receiverName} *</Text>
          <TextInput
            style={[
              styles.input,
              touched.receiverName && errors.receiverName ? { borderColor: '#ef4444', borderWidth: 1 } : null
            ]}
            value={receiverName}
            onChangeText={onReceiverNameChange}
            onBlur={() => onBlur && onBlur('receiverName')}
            placeholder={currentT.placeholders.name}
            placeholderTextColor="#9ca3af"
          />
          {touched.receiverName && errors.receiverName && (
            <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.receiverName}</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{currentT.receiverPhone} *</Text>
          <TextInput
            style={[
              styles.input,
              touched.receiverPhone && errors.receiverPhone ? { borderColor: '#ef4444', borderWidth: 1 } : null
            ]}
            value={receiverPhone}
            onChangeText={onReceiverPhoneChange}
            onBlur={() => onBlur && onBlur('receiverPhone')}
            placeholder={currentT.placeholders.phone}
            placeholderTextColor="#9ca3af"
            keyboardType="phone-pad"
          />
          {touched.receiverPhone && errors.receiverPhone && (
            <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.receiverPhone}</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>{currentT.receiverAddress} *</Text>
            <TouchableOpacity onPress={onOpenMap}>
              <Text style={styles.linkButton}>🗺️ {currentT.openMap}</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={[
              styles.input, 
              styles.textArea,
              touched.receiverAddress && errors.receiverAddress ? { borderColor: '#ef4444', borderWidth: 1 } : null
            ]}
            value={receiverAddress}
            onChangeText={handleAddressChange}
            onBlur={() => onBlur && onBlur('receiverAddress')}
            placeholder={currentT.placeholders.address}
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={3}
          />
          {touched.receiverAddress && errors.receiverAddress && (
            <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.receiverAddress}</Text>
          )}
          {receiverCoordinates && (
            <View style={styles.coordsContainer}>
              <Text style={styles.coordsLabel}>经纬度：</Text>
              <Text style={styles.coordsText}>
                {receiverCoordinates.lat.toFixed(6)}, {receiverCoordinates.lng.toFixed(6)}
              </Text>
            </View>
          )}
        </View>
      </View>
    </FadeInView>
  );
});

ReceiverForm.displayName = 'ReceiverForm';

export default ReceiverForm;

