import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../contexts/AppContext';
import { addressService, AddressItem } from '../services/supabase';
import { theme } from '../config/theme';
import Toast from '../components/Toast';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapModal from '../components/placeOrder/MapModal';
import { useLanguageStyles } from '../hooks/useLanguageStyles';
import { usePlaceAutocomplete } from '../hooks/usePlaceAutocomplete';
import * as Location from 'expo-location';

const baseStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  backBtn: { width: 40 },
  title: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  list: { padding: 16, paddingBottom: 100 },
  addressCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...theme.shadows.small
  },
  addressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  labelContainer: { flexDirection: 'row', alignItems: 'center' },
  label: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginRight: 8 },
  defaultBadge: { backgroundColor: '#eff6ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  defaultText: { fontSize: 10, color: '#3b82f6', fontWeight: 'bold' },
  deleteBtn: { padding: 4 },
  contactText: { fontSize: 14, color: '#64748b', marginBottom: 4 },
  addressText: { fontSize: 15, color: '#1e293b', lineHeight: 22 },
  editHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 8 },
  editHintText: { fontSize: 12, color: '#94a3b8', marginRight: 4 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 16, color: '#94a3b8', fontSize: 16 },
  fab: { position: 'absolute', bottom: 30, right: 30, borderRadius: 30, ...theme.shadows.medium },
  fabGradient: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  form: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#64748b', marginBottom: 8 },
  input: { backgroundColor: '#f1f5f9', borderRadius: 12, padding: 12, marginBottom: 16, fontSize: 16 },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginBottom: 16,
    gap: 8
  },
  mapBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2563eb'
  },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  checkboxLabel: { marginLeft: 8, fontSize: 15, color: '#1e293b' },
  saveBtn: { backgroundColor: '#2563eb', borderRadius: 12, padding: 16, alignItems: 'center' },
  saveBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  
  // 地图模态框样式
  mapModalContainer: { flex: 1, backgroundColor: 'white' },
  mapHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  mapCloseButton: { fontSize: 24, color: '#64748b' },
  mapTitle: { fontSize: 18, fontWeight: 'bold' },
  mapConfirmButton: { fontSize: 24, color: '#2563eb' },
  mapAddressInputContainer: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  mapAddressInput: { backgroundColor: '#f1f5f9', borderRadius: 8, padding: 12, fontSize: 16 },
  suggestionsContainer: { position: 'absolute', top: 120, left: 16, right: 16, backgroundColor: 'white', borderRadius: 8, zIndex: 1000, ...theme.shadows.medium },
  suggestionsList: { maxHeight: 200 },
  map: { flex: 1 },
  selectedPlaceInfo: { position: 'absolute', bottom: 20, left: 16, right: 16, backgroundColor: 'white', borderRadius: 12, padding: 16, ...theme.shadows.medium },
  selectedPlaceName: { fontSize: 16, fontWeight: 'bold' },
  selectedPlaceAddress: { fontSize: 14, color: '#64748b', marginTop: 4 },
  suggestionItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  suggestionMainText: { fontSize: 15, color: '#1e293b' },
  suggestionSecondaryText: { fontSize: 13, color: '#64748b' }
});

export default function AddressBookScreen({ navigation, route }: any) {
  const { language } = useApp();
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [userId, setUserId] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPickerMode] = useState(route.params?.pickerMode || false);

  const styles = useLanguageStyles(baseStyles);

  // 翻译内容 (MapModal 需要)
  const currentT = useMemo(() => ({
    senderAddress: language === 'zh' ? '寄件地址' : 'Sender Address',
    receiverAddress: language === 'zh' ? '收件地址' : 'Receiver Address',
    coordinates: language === 'zh' ? '坐标' : 'Coordinates',
    useCurrentLocation: language === 'zh' ? '使用当前位置' : 'Use Current Location'
  }), [language]);

  // 地图选择相关
  const [showMapSelector, setShowMapSelector] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState({
    latitude: 21.9588,
    longitude: 96.0891,
  });
  const [selectedPlace, setSelectedPlace] = useState<any>(null);

  const {
    mapAddressInput,
    setMapAddressInput,
    autocompleteSuggestions,
    showSuggestions,
    setShowSuggestions,
    handleMapAddressInputChange,
    handleSelectSuggestion,
  } = usePlaceAutocomplete({
    language: language as any,
    selectedLocation,
    onLocationChange: setSelectedLocation,
    onPlaceChange: setSelectedPlace,
  });

  const [formData, setFormData] = useState<Partial<AddressItem>>({
    label: '',
    contact_name: '',
    contact_phone: '',
    address_text: '',
    is_default: false
  });

  // Toast
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(msg);
    setToastType(type);
    setToastVisible(true);
  };

  const t = {
    zh: {
      title: '常用地址',
      add: '添加新地址',
      edit: '编辑地址',
      label: '地址标签 (如: 家, 公司)',
      name: '联系人姓名',
      phone: '联系人电话',
      address: '详细地址',
      selectOnMap: '地图中选择',
      default: '设为默认地址',
      save: '保存',
      cancel: '取消',
      delete: '删除',
      confirmDelete: '确定要删除这个地址吗？',
      noAddress: '暂无地址，点击下方按钮添加',
      saveSuccess: '保存成功',
      deleteSuccess: '删除成功',
      select: '选择地址'
    },
    en: {
      title: 'Address Book',
      add: 'Add New Address',
      edit: 'Edit Address',
      label: 'Label (e.g. Home, Office)',
      name: 'Contact Name',
      phone: 'Phone Number',
      address: 'Detail Address',
      selectOnMap: 'Select on Map',
      default: 'Set as Default',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      confirmDelete: 'Are you sure to delete this address?',
      noAddress: 'No address yet, click below to add',
      saveSuccess: 'Saved successfully',
      deleteSuccess: 'Deleted successfully',
      select: 'Select Address'
    },
    my: {
      title: 'လိပ်စာစာအုပ်',
      add: 'လိပ်စာအသစ်ထည့်ရန်',
      edit: 'လိပ်စာပြင်ရန်',
      label: 'လိပ်စာအမည် (ဥပမာ: အိမ်၊ ရုံး)',
      name: 'အမည်',
      phone: 'ဖုန်းနံပါတ်',
      address: 'လိပ်စာအပြည့်အစုံ',
      selectOnMap: 'မြေပုံမှရွေးချယ်ရန်',
      default: 'မူလလိပ်စာအဖြစ်သတ်မှတ်ရန်',
      save: 'သိမ်းဆည်းရန်',
      cancel: 'မလုပ်တော့ပါ',
      delete: 'ဖျက်ရန်',
      confirmDelete: 'ဤလိပ်စာကို ဖျက်ရန် သေချာပါသလား?',
      noAddress: 'လိပ်စာမရှိသေးပါ၊ အသစ်ထည့်ရန် နှိပ်ပါ',
      saveSuccess: 'သိမ်းဆည်းမှုအောင်မြင်သည်',
      deleteSuccess: 'ဖျက်သိမ်းမှုအောင်မြင်သည်',
      select: 'လိပ်စာရွေးချယ်ပါ'
    }
  }[language as 'zh' | 'en' | 'my'] || {
    zh: {}, en: {}, my: {}
  };

  useEffect(() => {
    loadUserId();
  }, []);

  useEffect(() => {
    if (userId) {
      loadAddresses();
    }
  }, [userId]);

  const loadUserId = async () => {
    const currentUser = await AsyncStorage.getItem('currentUser');
    if (currentUser) {
      const user = JSON.parse(currentUser);
      setUserId(user.id);
    }
  };

  const loadAddresses = async () => {
    setLoading(true);
    const data = await addressService.getAddresses(userId);
    setAddresses(data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.contact_name || !formData.contact_phone || !formData.address_text) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const payload: AddressItem = {
      ...formData as AddressItem,
      user_id: userId
    };

    let result;
    if (editingId) {
      result = await addressService.updateAddress(editingId, payload);
    } else {
      result = await addressService.addAddress(payload);
    }

    if (result.success) {
      showToast(t.saveSuccess, 'success');
      setShowModal(false);
      loadAddresses();
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(t.confirmDelete, '', [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.delete,
        style: 'destructive',
        onPress: async () => {
          const result = await addressService.deleteAddress(id);
          if (result.success) {
            showToast(t.deleteSuccess, 'success');
            loadAddresses();
          }
        }
      }
    ]);
  };

  const openEdit = (item: AddressItem) => {
    setEditingId(item.id || null);
    setFormData(item);
    setShowModal(true);
  };

  const openAdd = () => {
    setEditingId(null);
    setFormData({
      label: '',
      contact_name: '',
      contact_phone: '',
      address_text: '',
      is_default: addresses.length === 0
    });
    setShowModal(true);
  };

  const handleSelect = (item: AddressItem) => {
    if (isPickerMode && route.params?.onSelect) {
      route.params.onSelect(item);
      navigation.goBack();
    }
  };

  const handleConfirmMapLocation = async () => {
    let finalAddress = mapAddressInput.trim();
    
    // 如果没有输入地址，则使用反向地理编码
    if (!finalAddress) {
      try {
        const address = await Location.reverseGeocodeAsync({
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
        });

        if (address && address[0]) {
          const addr = address[0];
          finalAddress = `${addr.street || ''} ${addr.district || ''} ${addr.city || ''} ${addr.region || ''}`.trim();
        }
      } catch (e) {
        console.error('Reverse geocode error:', e);
      }
    }
    
    setFormData({
      ...formData,
      address_text: finalAddress,
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude
    });
    setShowMapSelector(false);
  };

  const handleUseCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({});
      setSelectedLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
    } catch (e) {
      console.error('Get current location error:', e);
    }
  };

  const renderItem = ({ item }: { item: AddressItem }) => (
    <TouchableOpacity
      style={styles.addressCard}
      onPress={() => isPickerMode ? handleSelect(item) : openEdit(item)}
      activeOpacity={0.7}
    >
      <View style={styles.addressHeader}>
        <View style={styles.labelContainer}>
          <Text style={styles.label}>{item.label || '📍'}</Text>
          {item.is_default && <View style={styles.defaultBadge}><Text style={styles.defaultText}>DEFAULT</Text></View>}
        </View>
        <TouchableOpacity onPress={() => handleDelete(item.id!)} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={20} color={theme.colors.error.DEFAULT} />
        </TouchableOpacity>
      </View>
      <Text style={styles.contactText}>{item.contact_name} | {item.contact_phone}</Text>
      <Text style={styles.addressText}>{item.address_text}</Text>
      {!isPickerMode && (
        <View style={styles.editHint}>
          <Text style={styles.editHintText}>Click to edit</Text>
          <Ionicons name="chevron-forward" size={14} color="#94a3b8" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1e3a8a', '#2563eb']}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>{t.title}</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={addresses}
          renderItem={renderItem}
          keyExtractor={(item) => item.id!}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="map-outline" size={80} color="#cbd5e1" />
              <Text style={styles.emptyText}>{t.noAddress}</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <LinearGradient
          colors={['#3b82f6', '#2563eb']}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={30} color="white" />
        </LinearGradient>
      </TouchableOpacity>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? t.edit : t.add}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.form}>
              <Text style={styles.inputLabel}>{t.label}</Text>
              <TextInput
                style={styles.input}
                value={formData.label}
                onChangeText={v => setFormData({ ...formData, label: v })}
                placeholder="e.g. Home, Office"
              />
              <Text style={styles.inputLabel}>{t.name} *</Text>
              <TextInput
                style={styles.input}
                value={formData.contact_name}
                onChangeText={v => setFormData({ ...formData, contact_name: v })}
              />
              <Text style={styles.inputLabel}>{t.phone} *</Text>
              <TextInput
                style={styles.input}
                value={formData.contact_phone}
                onChangeText={v => setFormData({ ...formData, contact_phone: v })}
                keyboardType="phone-pad"
              />
              <Text style={styles.inputLabel}>{t.address} *</Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                value={formData.address_text}
                onChangeText={v => setFormData({ ...formData, address_text: v })}
                multiline
              />

              <TouchableOpacity 
                style={styles.mapBtn} 
                onPress={() => setShowMapSelector(true)}
              >
                <Ionicons name="map-outline" size={20} color="#2563eb" />
                <Text style={styles.mapBtnText}>{t.selectOnMap}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.checkboxRow}
                onPress={() => setFormData({ ...formData, is_default: !formData.is_default })}
              >
                <Ionicons 
                  name={formData.is_default ? "checkbox" : "square-outline"} 
                  size={24} 
                  color={theme.colors.primary.DEFAULT} 
                />
                <Text style={styles.checkboxLabel}>{t.default}</Text>
              </TouchableOpacity>
            </ScrollView>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>{t.save}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />

      <MapModal
        visible={showMapSelector}
        language={language as any}
        styles={styles}
        currentT={currentT}
        mapType="receiver"
        selectedLocation={selectedLocation}
        selectedPlace={selectedPlace}
        mapAddressInput={mapAddressInput}
        showSuggestions={showSuggestions}
        autocompleteSuggestions={autocompleteSuggestions}
        onClose={() => setShowMapSelector(false)}
        onConfirm={handleConfirmMapLocation}
        onAddressInputChange={handleMapAddressInputChange}
        onMapAddressInputChange={setMapAddressInput}
        onUseCurrentLocation={handleUseCurrentLocation}
        onSelectSuggestion={handleSelectSuggestion}
        onSetShowSuggestions={setShowSuggestions}
        onLocationChange={setSelectedLocation}
        onPlaceChange={setSelectedPlace}
        markerTitle={t.selectOnMap}
      />
    </View>
  );
}

