import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { errorService } from '../../services/ErrorService';
import AutocompleteSuggestionItem from './AutocompleteSuggestionItem';

interface MapModalProps {
  visible: boolean;
  language: 'zh' | 'en' | 'my';
  styles: any;
  currentT: any;
  mapType: 'sender' | 'receiver';
  selectedLocation: { latitude: number; longitude: number };
  selectedPlace: { name?: string; address?: string; rating?: number } | null;
  mapAddressInput: string;
  showSuggestions: boolean;
  autocompleteSuggestions: Array<{
    main_text: string;
    secondary_text?: string;
    typeIcon?: string;
    place_id: string;
    description: string;
  }>;
  onClose: () => void;
  onConfirm: () => void;
  onAddressInputChange: (text: string) => void;
  onMapAddressInputChange: (text: string) => void;
  onUseCurrentLocation: () => void;
  onSelectSuggestion: (suggestion: any) => void;
  onSetShowSuggestions: (show: boolean) => void;
  onLocationChange: (coords: { latitude: number; longitude: number }) => void;
  onPlaceChange: (place: { name?: string; address?: string; rating?: number } | null) => void;
  markerTitle?: string;
}

const MapModal = memo<MapModalProps>(({
  visible,
  language,
  styles,
  currentT,
  mapType,
  selectedLocation,
  selectedPlace,
  mapAddressInput,
  showSuggestions,
  autocompleteSuggestions,
  onClose,
  onConfirm,
  onAddressInputChange,
  onMapAddressInputChange,
  onUseCurrentLocation,
  onSelectSuggestion,
  onSetShowSuggestions,
  onLocationChange,
  onPlaceChange,
  markerTitle,
}) => {
  const handleMapPress = useCallback((e: any) => {
    onLocationChange(e.nativeEvent.coordinate);
    onPlaceChange(null);
  }, [onLocationChange, onPlaceChange]);

  const handlePoiClick = useCallback((e: any) => {
    onLocationChange(e.nativeEvent.coordinate);
    onPlaceChange({
      name: e.nativeEvent.name || '选中位置',
      address: e.nativeEvent.name || '未知地址'
    });
  }, [onLocationChange, onPlaceChange]);

  const handleMarkerDragEnd = useCallback((e: any) => {
    onLocationChange(e.nativeEvent.coordinate);
    onPlaceChange(null);
  }, [onLocationChange, onPlaceChange]);

  const handleSuggestionPress = useCallback((suggestion: any) => {
    onSelectSuggestion(suggestion);
    onSetShowSuggestions(false);
  }, [onSelectSuggestion, onSetShowSuggestions]);

  const handleInputFocus = useCallback(() => {
    if (mapAddressInput.trim()) {
      onMapAddressInputChange(mapAddressInput);
    }
  }, [mapAddressInput, onMapAddressInputChange]);

  const handleInputBlur = useCallback(() => {
    setTimeout(() => onSetShowSuggestions(false), 200);
  }, [onSetShowSuggestions]);

  const mapRegion = useMemo(() => ({
    latitude: selectedLocation.latitude,
    longitude: selectedLocation.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  }), [selectedLocation]);

  const mapTitle = useMemo(() => {
    return mapType === 'sender' ? currentT.senderAddress : currentT.receiverAddress;
  }, [mapType, currentT]);

  const placeholderText = useMemo(() => {
    if (language === 'zh') return '搜索店铺名称或输入详细地址';
    if (language === 'en') return 'Search store name or enter detailed address';
    return 'ဆိုင်အမည် ရှာဖွေရန် သို့မဟုတ် အသေးစိတ်လိပ်စာထည့်ပါ';
  }, [language]);

  const selectedPlaceName = useMemo(() => {
    if (language === 'zh') return '已选择位置';
    if (language === 'en') return 'Selected Location';
    return 'ရွေးချယ်ထားသောနေရာ';
  }, [language]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.mapModalContainer}>
        <View style={styles.mapHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.mapCloseButton}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.mapTitle}>{mapTitle}</Text>
          <TouchableOpacity onPress={onConfirm}>
            <Text style={styles.mapConfirmButton}>✓</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.mapAddressInputContainer}>
          <TextInput
            style={styles.mapAddressInput}
            value={mapAddressInput}
            onChangeText={(text) => {
              onAddressInputChange(text);
              onMapAddressInputChange(text);
            }}
            placeholder={placeholderText}
            placeholderTextColor="#9ca3af"
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
          />
          
          <TouchableOpacity 
            onPress={onUseCurrentLocation} 
            style={{
              marginTop: 12,
              flexDirection: 'row',
              alignItems: 'center',
              alignSelf: 'flex-start',
              backgroundColor: '#f0f9ff',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#3b82f6',
            }}
          >
            <Text style={{
              fontSize: 14,
              color: '#3b82f6',
              fontWeight: '600',
            }}>
              📍 {currentT.useCurrentLocation}
            </Text>
          </TouchableOpacity>

          {showSuggestions && autocompleteSuggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <ScrollView 
                style={styles.suggestionsList} 
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled={true}
              >
                {autocompleteSuggestions.map((suggestion, index) => (
                  <AutocompleteSuggestionItem
                    key={`${suggestion.place_id}-${index}`}
                    suggestion={suggestion}
                    index={index}
                    totalCount={autocompleteSuggestions.length}
                    onPress={() => handleSuggestionPress(suggestion)}
                    styles={styles}
                  />
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={mapRegion}
          region={mapRegion}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={true}
          showsScale={true}
          loadingEnabled={true}
          mapType="standard"
          onPress={handleMapPress}
          onPoiClick={handlePoiClick}
          onMapReady={() => {
            if (__DEV__) {
              console.log('地图已准备就绪');
            }
          }}
        >
          <Marker
            coordinate={selectedLocation}
            draggable
            onDragEnd={handleMarkerDragEnd}
            title={markerTitle || "选择的位置"}
            description={markerTitle ? "店铺注册位置" : "拖动或点击地图调整位置"}
          />
        </MapView>

        {selectedPlace && (
          <View style={styles.selectedPlaceInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ fontSize: 18, marginRight: 8 }}>✅</Text>
              <Text style={styles.selectedPlaceName}>
                {selectedPlace.name || selectedPlaceName}
              </Text>
              {selectedPlace.rating && (
                <Text style={{ fontSize: 12, color: '#f59e0b', marginLeft: 8 }}>
                  ⭐ {selectedPlace.rating.toFixed(1)}
                </Text>
              )}
            </View>
            {selectedPlace.address && (
              <Text style={styles.selectedPlaceAddress}>{selectedPlace.address}</Text>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
});

MapModal.displayName = 'MapModal';

export default MapModal;

