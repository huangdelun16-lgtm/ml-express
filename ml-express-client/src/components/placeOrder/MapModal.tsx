import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LoggerService from './../../services/LoggerService';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator, BackHandler, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MapPlaceSearchStatus } from '../../utils/mapPlaceSearch';
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
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
  searchStatus?: MapPlaceSearchStatus;
  onRetrySearch?: () => void;
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
  searchStatus,
  onRetrySearch,
  onLocationChange,
  onPlaceChange,
  markerTitle,
}) => {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const skipNextAnimateRef = useRef(true);
  const lastAnimatedRef = useRef({ latitude: 0, longitude: 0 });
  const [attachMap, setAttachMap] = useState(false);
  const [mapReady, setMapReady] = useState(false);

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
    if (onRetrySearch) {
      onRetrySearch();
      return;
    }
    if (mapAddressInput.trim()) {
      onMapAddressInputChange(mapAddressInput);
    }
  }, [mapAddressInput, onMapAddressInputChange, onRetrySearch]);

  const handleInputBlur = useCallback(() => {
    setTimeout(() => {
      // 失败/空结果/加载中要留下拉，否则「重试」会被 200ms 后的关闭冲掉
      if (searchStatus === 'loading' || searchStatus === 'empty' || searchStatus === 'error') {
        return;
      }
      onSetShowSuggestions(false);
    }, 200);
  }, [onSetShowSuggestions, searchStatus]);

  const mapRegion = useMemo<Region>(() => {
    const lat = selectedLocation?.latitude || 21.9588;
    const lng = selectedLocation?.longitude || 96.0891;
    return {
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  }, [selectedLocation]);

  useEffect(() => {
    if (!visible) {
      setAttachMap(false);
      setMapReady(false);
      skipNextAnimateRef.current = true;
      return;
    }
    const delay = Platform.OS === 'android' ? 450 : 50;
    const timer = setTimeout(() => setAttachMap(true), delay);
    return () => clearTimeout(timer);
  }, [visible]);

  useEffect(() => {
    if (!visible) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [onClose, visible]);

  useEffect(() => {
    if (!mapReady || !attachMap) return;
    const lat = mapRegion.latitude;
    const lng = mapRegion.longitude;
    if (skipNextAnimateRef.current) {
      skipNextAnimateRef.current = false;
      lastAnimatedRef.current = { latitude: lat, longitude: lng };
      return;
    }
    if (
      Math.abs(lastAnimatedRef.current.latitude - lat) < 0.00001 &&
      Math.abs(lastAnimatedRef.current.longitude - lng) < 0.00001
    ) {
      return;
    }
    lastAnimatedRef.current = { latitude: lat, longitude: lng };
    mapRef.current?.animateToRegion(mapRegion, 350);
  }, [attachMap, mapReady, mapRegion]);

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

  const searchLabels = useMemo(() => {
    if (language === 'zh') {
      return { loading: '搜索中...', empty: '未找到相关位置', failed: '搜索失败，请稍后重试', retry: '重试' };
    }
    if (language === 'en') {
      return { loading: 'Searching...', empty: 'No matching places', failed: 'Search failed. Please try again.', retry: 'Retry' };
    }
    return {
      loading: 'ရှာဖွေနေသည်...',
      empty: 'ကိုက်ညီသောနေရာ မတွေ့ပါ',
      failed: 'ရှာဖွေမှု မအောင်မြင်ပါ။ ပြန်လည်ကြိုးစားပါ။',
      retry: 'ပြန်ကြိုးစားရန်',
    };
  }, [language]);

  const status = searchStatus || (showSuggestions && autocompleteSuggestions.length > 0 ? 'success' : 'idle');
  const showDropdown = showSuggestions && status !== 'idle';
  const markerCoordinate = {
    latitude: selectedLocation.latitude || 21.9588,
    longitude: selectedLocation.longitude || 96.0891,
  };

  if (!visible) return null;

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  return (
    <View
      style={[localStyles.overlay, { width: screenWidth, height: screenHeight }]}
      pointerEvents="auto"
      collapsable={false}
    >
      <View style={styles.mapModalContainer} collapsable={false}>
        <View style={[styles.mapHeader, { paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 50 : 24) }]}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.mapCloseButton}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.mapTitle}>{mapTitle}</Text>
          <TouchableOpacity onPress={onConfirm}>
            <Text style={styles.mapConfirmButton}>✓</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.mapAddressInputContainer}>
          <View>
            <TextInput
              style={[styles.mapAddressInput, status === 'loading' ? { paddingRight: 40 } : null]}
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
            {status === 'loading' ? (
              <ActivityIndicator
                size="small"
                color="#2C98A6"
                style={{ position: 'absolute', right: 14, top: 14 }}
              />
            ) : null}
          </View>
          
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
              borderColor: '#2C98A6',
            }}
          >
            <Text style={{
              fontSize: 14,
              color: '#2C98A6',
              fontWeight: '600',
            }}>
              📍 {currentT.useCurrentLocation}
            </Text>
          </TouchableOpacity>

          {showDropdown ? (
            <View style={styles.suggestionsContainer}>
              {status === 'loading' ? (
                <Text style={{ padding: 16, textAlign: 'center', color: '#6b7280' }}>
                  {searchLabels.loading}
                </Text>
              ) : null}
              {status === 'empty' ? (
                <Text style={{ padding: 16, textAlign: 'center', color: '#6b7280' }}>
                  {searchLabels.empty}
                </Text>
              ) : null}
              {status === 'error' ? (
                <View style={{ padding: 16, alignItems: 'center' }}>
                  <Text style={{ color: '#b45309', textAlign: 'center' }}>{searchLabels.failed}</Text>
                  {onRetrySearch ? (
                    <TouchableOpacity
                      onPress={onRetrySearch}
                      style={{
                        marginTop: 10,
                        paddingHorizontal: 14,
                        paddingVertical: 6,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: '#d1d5db',
                      }}
                    >
                      <Text style={{ color: '#1f2937', fontSize: 14 }}>{searchLabels.retry}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}
              {status === 'success' ? (
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
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={localStyles.mapWrap} collapsable={false}>
          {visible && attachMap ? (
            <MapView
              ref={mapRef}
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
              style={localStyles.mapFill}
              initialRegion={mapRegion}
              showsUserLocation
              showsMyLocationButton={false}
              showsCompass
              loadingEnabled
              moveOnMarkerPress={false}
              toolbarEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
              mapType="standard"
              onPress={handleMapPress}
              onPoiClick={handlePoiClick}
              onMapReady={() => {
                setMapReady(true);
                if (__DEV__) {
                  LoggerService.debug('地图已准备就绪');
                }
              }}
            >
              <Marker
                coordinate={markerCoordinate}
                draggable
                onDragEnd={handleMarkerDragEnd}
                title={markerTitle || '选择的位置'}
                description={markerTitle ? '店铺注册位置' : '拖动或点击地图调整位置'}
              />
            </MapView>
          ) : (
            <View style={[localStyles.mapFill, localStyles.mapPlaceholder]}>
              <ActivityIndicator size="large" color="#2C98A6" />
            </View>
          )}
        </View>

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
    </View>
  );
});

MapModal.displayName = 'MapModal';

const localStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: '#ffffff',
  },
  mapWrap: {
    flex: 1,
    minHeight: 240,
    backgroundColor: '#e8eef2',
    overflow: 'hidden',
  },
  mapFill: {
    ...StyleSheet.absoluteFillObject,
  },
  mapPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default MapModal;
