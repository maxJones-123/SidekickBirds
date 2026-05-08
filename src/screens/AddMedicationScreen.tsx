import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { RootStackParamList, Frequency } from '../types';
import { useApp } from '../context/AppContext';
import BarcodeScannerModal, { ScannedMedInfo } from '../components/BarcodeScannerModal';
import TimePickerModal from '../components/TimePickerModal';

type Props = NativeStackScreenProps<RootStackParamList, 'AddMedication'>;

const FREQUENCIES: Frequency[] = [
  'Once Daily', 'Twice Daily', '3x Daily', '4x Daily', 'As Needed', 'Weekly',
];

const FREQUENCY_DEFAULT_TIMES: Record<Frequency, string[]> = {
  'Once Daily':  ['08:00'],
  'Twice Daily': ['08:00', '20:00'],
  '3x Daily':    ['08:00', '14:00', '20:00'],
  '4x Daily':    ['08:00', '12:00', '16:00', '20:00'],
  'As Needed':   [],
  'Weekly':      ['08:00'],
};

function formatTimeLabel(t: string): string {
  const [h, m] = t.split(':').map(Number);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function AddMedicationScreen({ navigation }: Props) {
  const { addMedication } = useApp();
  const [name, setName] = useState('');
  const [doseForm, setDoseForm] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('Once Daily');
  const [selectedTimes, setSelectedTimes] = useState<string[]>(['08:00']);
  const [showFreqPicker, setShowFreqPicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerInitial, setTimePickerInitial] = useState('08:00');
  const [timePickerTitle, setTimePickerTitle] = useState('Add Time');
  const [showScanner, setShowScanner] = useState(false);
  const [scannedBirdName, setScannedBirdName] = useState<string | undefined>(undefined);
  const editingTimeIndex = useRef<number | null>(null);

  const handleScanned = useCallback((info: ScannedMedInfo) => {
    if (info.name) setName(info.name);
    const parts = [info.dose, info.form].filter(Boolean).join(' ');
    if (parts) setDoseForm(parts);
    setScannedBirdName(info.funnyBirdName);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handleFrequencySelect = useCallback((freq: Frequency) => {
    setFrequency(freq);
    setSelectedTimes(FREQUENCY_DEFAULT_TIMES[freq]);
    setShowFreqPicker(false);
    Haptics.selectionAsync();
  }, []);

  const openAddTime = useCallback(() => {
    editingTimeIndex.current = null;
    setTimePickerInitial('08:00');
    setTimePickerTitle('Add Time');
    setShowTimePicker(true);
  }, []);

  const openEditTime = useCallback((index: number) => {
    editingTimeIndex.current = index;
    setTimePickerInitial(selectedTimes[index]);
    setTimePickerTitle('Change Time');
    setShowTimePicker(true);
    Haptics.selectionAsync();
  }, [selectedTimes]);

  const handleTimeConfirm = useCallback((timeKey: string) => {
    setShowTimePicker(false);
    setSelectedTimes(prev => {
      const next = [...prev];
      if (editingTimeIndex.current === null) {
        if (!next.includes(timeKey)) next.push(timeKey);
      } else {
        next[editingTimeIndex.current] = timeKey;
      }
      return next.sort();
    });
    Haptics.selectionAsync();
  }, []);

  const removeTime = useCallback((index: number) => {
    Haptics.selectionAsync();
    setSelectedTimes(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSave = useCallback(() => {
    const trimName = name.trim();
    if (!trimName || selectedTimes.length === 0) return;
    const parts = doseForm.trim().split(' ');
    const dose = parts[0] ?? '';
    const form = parts.slice(1).join(' ');
    addMedication(trimName, dose, form, frequency, selectedTimes, scannedBirdName);
    navigation.goBack();
  }, [name, doseForm, frequency, selectedTimes, scannedBirdName, addMedication, navigation]);

  const isValid = name.trim().length > 0 && selectedTimes.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Scan barcode */}
          <TouchableOpacity style={styles.scanBtn} onPress={() => setShowScanner(true)} activeOpacity={0.85}>
            <Text style={styles.scanBtnIcon}>📷</Text>
            <Text style={styles.scanBtnText}>Scan Medication Barcode</Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>OR ENTER MANUALLY</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Medication name */}
          <Text style={styles.fieldLabel}>MEDICATION</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Aspirin"
            placeholderTextColor="#B0BEC5"
            autoFocus
          />

          {/* Dose & form */}
          <Text style={styles.fieldLabel}>DOSE & FORM</Text>
          <TextInput
            style={styles.input}
            value={doseForm}
            onChangeText={setDoseForm}
            placeholder="e.g. 100mg tablet"
            placeholderTextColor="#B0BEC5"
          />

          {/* Frequency */}
          <Text style={styles.fieldLabel}>FREQUENCY</Text>
          <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowFreqPicker(true)} activeOpacity={0.7}>
            <Text style={styles.pickerBtnText}>{frequency}</Text>
            <Text style={styles.pickerChevron}>›</Text>
          </TouchableOpacity>

          {/* Reminder times */}
          <Text style={styles.fieldLabel}>REMINDER TIMES</Text>
          <View style={styles.timesCard}>
            {selectedTimes.length === 0 && (
              <Text style={styles.noTimesHint}>No times selected</Text>
            )}
            {selectedTimes.map((t, idx) => (
              <View key={`${t}_${idx}`} style={styles.timeRow}>
                <TouchableOpacity
                  style={styles.timeBtn}
                  onPress={() => openEditTime(idx)}
                  activeOpacity={0.7}
                >
                  <View style={styles.clockBadge}>
                    <Text style={styles.clockBadgeText}>🕐</Text>
                  </View>
                  <Text style={styles.timeLabel}>{formatTimeLabel(t)}</Text>
                  <Text style={styles.editHint}>tap to change</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => removeTime(idx)}
                  hitSlop={{ top: 10, bottom: 10, left: 12, right: 12 }}
                  activeOpacity={0.6}
                >
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            {selectedTimes.length > 0 && <View style={styles.divider} />}

            <TouchableOpacity style={styles.addTimeBtn} onPress={openAddTime} activeOpacity={0.7}>
              <Text style={styles.addTimeBtnText}>+ Add Time</Text>
            </TouchableOpacity>
          </View>

          {/* Save */}
          <TouchableOpacity
            style={[styles.saveBtn, !isValid && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!isValid}
            activeOpacity={0.85}
          >
            <Text style={styles.saveBtnText}>Add Medication</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Barcode scanner */}
      <BarcodeScannerModal
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScanned={handleScanned}
      />

      {/* Frequency picker */}
      <Modal visible={showFreqPicker} transparent animationType="slide" onRequestClose={() => setShowFreqPicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowFreqPicker(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select Frequency</Text>
            {FREQUENCIES.map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.modalOption, f === frequency && styles.modalOptionActive]}
                onPress={() => handleFrequencySelect(f)}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalOptionText, f === frequency && styles.modalOptionTextActive]}>{f}</Text>
                {f === frequency && <Text style={styles.modalOptionCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Time picker wheel */}
      <TimePickerModal
        visible={showTimePicker}
        initialTime={timePickerInitial}
        title={timePickerTitle}
        onConfirm={handleTimeConfirm}
        onCancel={() => setShowTimePicker(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F9FA' },
  flex: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 48 },

  fieldLabel: {
    fontSize: 11, fontWeight: '700', color: '#7A8B9A',
    letterSpacing: 1.2, marginBottom: 8, marginTop: 20,
  },
  input: {
    backgroundColor: '#FFFFFF', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#1A2B3C',
    borderWidth: 1, borderColor: '#E8EFF3',
  },
  pickerBtn: {
    backgroundColor: '#FFFFFF', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: '#E8EFF3',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  pickerBtnText: { fontSize: 15, color: '#1A2B3C', fontWeight: '500' },
  pickerChevron: { fontSize: 20, color: '#7A8B9A', fontWeight: '300' },

  // Times
  timesCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12,
    borderWidth: 1, borderColor: '#E8EFF3', overflow: 'hidden',
  },
  noTimesHint: { fontSize: 14, color: '#B0BEC5', paddingHorizontal: 16, paddingVertical: 14 },
  timeRow: {
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: '#F0F4F7',
  },
  timeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13, gap: 12,
  },
  clockBadge: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: '#E0F7FA', alignItems: 'center', justifyContent: 'center',
  },
  clockBadgeText: { fontSize: 14 },
  timeLabel: { fontSize: 15, fontWeight: '700', color: '#1A2B3C', flex: 1 },
  editHint: { fontSize: 10, color: '#B0BEC5', fontStyle: 'italic' },
  removeBtn: { paddingHorizontal: 16, paddingVertical: 13 },
  removeBtnText: { fontSize: 16, color: '#FFCDD2', fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#F0F4F7', marginHorizontal: 16 },
  addTimeBtn: { paddingHorizontal: 16, paddingVertical: 14 },
  addTimeBtnText: { fontSize: 14, fontWeight: '600', color: '#00BCD4' },

  // Save
  saveBtn: {
    marginTop: 32, backgroundColor: '#00BCD4', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: '#00BCD4', shadowOpacity: 0.3, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  saveBtnDisabled: { backgroundColor: '#B0BEC5', shadowOpacity: 0 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  // Frequency modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 20, paddingBottom: 36, paddingHorizontal: 20, maxHeight: '75%',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1A2B3C', marginBottom: 16, textAlign: 'center' },
  modalOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F4F7',
  },
  modalOptionActive: { backgroundColor: '#F0FBFC' },
  modalOptionText: { fontSize: 15, color: '#1A2B3C', fontWeight: '500' },
  modalOptionTextActive: { color: '#00BCD4', fontWeight: '700' },
  modalOptionCheck: { fontSize: 16, color: '#00BCD4', fontWeight: '700' },

  // Scan
  scanBtn: {
    marginTop: 20, backgroundColor: '#00BCD4', borderRadius: 14, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: '#00BCD4', shadowOpacity: 0.3, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  scanBtnIcon: { fontSize: 20 },
  scanBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 4, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E8EFF3' },
  dividerLabel: { fontSize: 10, fontWeight: '700', color: '#B0BEC5', letterSpacing: 1 },
});
