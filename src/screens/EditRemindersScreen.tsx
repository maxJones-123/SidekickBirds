import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { RootStackParamList } from '../types';
import { useApp } from '../context/AppContext';
import TimePickerModal from '../components/TimePickerModal';

type Props = NativeStackScreenProps<RootStackParamList, 'EditReminders'>;

function formatTimeLabel(timeKey: string): string {
  const [h, m] = timeKey.split(':').map(Number);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function EditRemindersScreen({ route, navigation }: Props) {
  const { medicationId } = route.params;
  const { state, updateMedication } = useApp();
  const med = state.medications.find(m => m.id === medicationId);

  const [times, setTimes] = useState<string[]>(
    med ? [...med.scheduledTimes].sort() : []
  );
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerInitial, setPickerInitial] = useState('08:00');
  const [pickerTitle, setPickerTitle] = useState('Add Time');
  const editingIndex = useRef<number | null>(null);

  const openAdd = useCallback(() => {
    editingIndex.current = null;
    setPickerInitial('08:00');
    setPickerTitle('Add Time');
    setPickerVisible(true);
  }, []);

  const openEdit = useCallback((index: number) => {
    editingIndex.current = index;
    setPickerInitial(times[index]);
    setPickerTitle('Change Time');
    setPickerVisible(true);
    Haptics.selectionAsync();
  }, [times]);

  const handlePickerConfirm = useCallback((timeKey: string) => {
    setPickerVisible(false);
    setTimes(prev => {
      const next = [...prev];
      if (editingIndex.current === null) {
        if (!next.includes(timeKey)) next.push(timeKey);
      } else {
        next[editingIndex.current] = timeKey;
      }
      return next.sort();
    });
  }, []);

  const deleteTime = useCallback((index: number) => {
    Haptics.selectionAsync();
    setTimes(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSave = useCallback(() => {
    if (!med || times.length === 0) return;
    updateMedication({ ...med, scheduledTimes: times });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.goBack();
  }, [med, times, updateMedication, navigation]);

  if (!med) return null;

  const doseLabel = [med.dose, med.form].filter(Boolean).join(' ');
  const hasChanges = JSON.stringify(times) !== JSON.stringify([...med.scheduledTimes].sort());

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Medication header */}
        <View style={styles.medCard}>
          <Text style={styles.medCardName}>{med.name}</Text>
          <Text style={styles.medCardDose}>
            {doseLabel ? `${doseLabel} · ` : ''}{med.frequency}
          </Text>
        </View>

        <Text style={styles.sectionLabel}>REMINDER TIMES</Text>

        <View style={styles.timesCard}>
          {times.length === 0 && (
            <Text style={styles.emptyHint}>No times set — add one below</Text>
          )}

          {times.map((t, idx) => (
            <View key={`${t}_${idx}`} style={styles.timeRow}>
              <TouchableOpacity
                style={styles.timeBtn}
                onPress={() => openEdit(idx)}
                activeOpacity={0.7}
              >
                <View style={styles.clockBadge}>
                  <Text style={styles.clockBadgeText}>🕐</Text>
                </View>
                <Text style={styles.timeLabel}>{formatTimeLabel(t)}</Text>
                <Text style={styles.editHint}>tap to change</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => deleteTime(idx)}
                hitSlop={{ top: 10, bottom: 10, left: 12, right: 12 }}
                activeOpacity={0.6}
              >
                <Text style={styles.deleteBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          {times.length > 0 && <View style={styles.divider} />}

          <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.7}>
            <Text style={styles.addBtnText}>+ Add Time</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>Tap a time to edit it · ✕ to remove</Text>

        <TouchableOpacity
          style={[styles.saveBtn, (!hasChanges || times.length === 0) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!hasChanges || times.length === 0}
          activeOpacity={0.85}
        >
          <Text style={styles.saveBtnText}>
            {hasChanges ? 'Save Changes' : 'No Changes'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <TimePickerModal
        visible={pickerVisible}
        initialTime={pickerInitial}
        title={pickerTitle}
        onConfirm={handlePickerConfirm}
        onCancel={() => setPickerVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F9FA' },
  scroll: { padding: 20, paddingBottom: 48 },
  medCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    marginBottom: 24, borderWidth: 1, borderColor: '#E8EFF3',
  },
  medCardName: { fontSize: 17, fontWeight: '700', color: '#1A2B3C' },
  medCardDose: { fontSize: 13, color: '#7A8B9A', marginTop: 4 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#7A8B9A',
    letterSpacing: 1.2, marginBottom: 10,
  },
  timesCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1, borderColor: '#E8EFF3',
    overflow: 'hidden', marginBottom: 12,
  },
  emptyHint: { fontSize: 14, color: '#B0BEC5', padding: 18 },
  timeRow: {
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: '#F0F4F7',
  },
  timeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  clockBadge: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#E0F7FA', alignItems: 'center', justifyContent: 'center',
  },
  clockBadgeText: { fontSize: 16 },
  timeLabel: { fontSize: 17, fontWeight: '700', color: '#1A2B3C', flex: 1 },
  editHint: { fontSize: 11, color: '#B0BEC5', fontStyle: 'italic' },
  deleteBtn: { paddingHorizontal: 18, paddingVertical: 14 },
  deleteBtnText: { fontSize: 17, color: '#FFCDD2', fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#F0F4F7', marginHorizontal: 16 },
  addBtn: { paddingHorizontal: 16, paddingVertical: 16 },
  addBtnText: { fontSize: 15, fontWeight: '600', color: '#00BCD4' },
  hint: { fontSize: 12, color: '#B0BEC5', textAlign: 'center', marginBottom: 24 },
  saveBtn: {
    backgroundColor: '#00BCD4', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', shadowColor: '#00BCD4', shadowOpacity: 0.3,
    shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  saveBtnDisabled: { backgroundColor: '#B0BEC5', shadowOpacity: 0 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
