import React from 'react';
import { Alert, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const TEAL = '#2C98A6';

type Props = {
  visible: boolean;
  styles: any;
  currentT: any;
  selectedDate: string;
  selectedTime: string;
  availableTimeSlots: string[];
  onChangeDate: (date: string) => void;
  onChangeTime: (time: string) => void;
  onClose: () => void;
  onConfirm: (label: string) => void;
};

export default function ScheduledTimePickerModal({
  visible,
  styles,
  currentT,
  selectedDate,
  selectedTime,
  availableTimeSlots,
  onChangeDate,
  onChangeTime,
  onClose,
  onConfirm,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.timePickerOverlay}>
        <View style={styles.timePickerContent}>
          <LinearGradient
            colors={[TEAL, '#1F7A86']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.timePickerHeader}
          >
            <View style={styles.timePickerHeaderContent}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="time" size={24} color="#fff" style={{ marginRight: 10 }} />
                <View>
                  <Text style={styles.timePickerTitle}>{currentT.timePicker.title}</Text>
                  <Text style={styles.timePickerSubtitle}>{currentT.timePicker.subtitle}</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.timePickerCloseButton}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>

          <View style={styles.timePickerBody}>
            <View style={styles.quickSelectSection}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="calendar-outline" size={18} color="#64748b" style={{ marginRight: 6 }} />
                <Text style={styles.quickSelectTitle}>{currentT.timePicker.selectDate}</Text>
              </View>
              <View style={styles.quickSelectGrid}>
                <TouchableOpacity
                  style={[
                    styles.quickSelectButton,
                    selectedDate === 'Today' && { borderColor: TEAL, backgroundColor: '#e8f5f6' },
                  ]}
                  onPress={() => onChangeDate('Today')}
                >
                  <Ionicons
                    name={selectedDate === 'Today' ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20}
                    color={selectedDate === 'Today' ? TEAL : '#cbd5e1'}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.quickSelectButtonText, selectedDate === 'Today' && { color: TEAL }]}>
                    {currentT.timePicker.today}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.quickSelectButton,
                    selectedDate === 'Tomorrow' && { borderColor: TEAL, backgroundColor: '#e8f5f6' },
                  ]}
                  onPress={() => onChangeDate('Tomorrow')}
                >
                  <Ionicons
                    name={selectedDate === 'Tomorrow' ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20}
                    color={selectedDate === 'Tomorrow' ? TEAL : '#cbd5e1'}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.quickSelectButtonText, selectedDate === 'Tomorrow' && { color: TEAL }]}>
                    {currentT.timePicker.tomorrow}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.timeSlotsSection}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="time-outline" size={18} color="#64748b" style={{ marginRight: 6 }} />
                  <Text style={styles.timeSlotsTitle}>{currentT.timePicker.selectTime}</Text>
                </View>
                <Text style={{ fontSize: 12, color: '#94a3b8' }}>{currentT.timePicker.workingHours}</Text>
              </View>

              <ScrollView
                style={styles.timeSlotsContainer}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.timeSlotsGrid}
              >
                {availableTimeSlots.length > 0 ? (
                  availableTimeSlots.map((slot) => (
                    <TouchableOpacity
                      key={slot}
                      style={[
                        styles.timeSlotButton,
                        selectedTime === slot && styles.timeSlotButtonActive,
                      ]}
                      onPress={() => onChangeTime(slot)}
                    >
                      <Text style={[
                        styles.timeSlotText,
                        selectedTime === slot && styles.timeSlotTextActive,
                      ]}>{slot}</Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={{ width: '100%', padding: 20, alignItems: 'center' }}>
                    <Text style={{ color: '#94a3b8' }}>今日配送已截止，请选择明日</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>

          <View style={styles.timePickerButtons}>
            <TouchableOpacity style={styles.timePickerCancelButton} onPress={onClose}>
              <Text style={styles.timePickerCancelText}>{currentT.timePicker.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.timePickerConfirmButton}
              onPress={() => {
                if (selectedDate && selectedTime) {
                  const timeStr = `${selectedDate === 'Today' ? currentT.timePicker.today : currentT.timePicker.tomorrow} ${selectedTime}`;
                  onConfirm(timeStr);
                } else {
                  Alert.alert('提示', '请选择日期并输入时间');
                }
              }}
            >
              <LinearGradient
                colors={[TEAL, '#1F7A86']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.timePickerConfirmGradient}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.timePickerConfirmText}>{currentT.timePicker.confirm}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
