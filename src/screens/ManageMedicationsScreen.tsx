import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { RootStackParamList, Medication } from '../types';
import { useApp } from '../context/AppContext';
import BirdSvg from '../components/BirdSvg';

type Props = NativeStackScreenProps<RootStackParamList, 'ManageMedications'>;

export default function ManageMedicationsScreen({ navigation }: Props) {
  const { state, reorderMedications, deleteMedication } = useApp();
  const [data, setData] = useState<Medication[]>(state.medications);

  const move = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (toIndex < 0 || toIndex >= data.length) return;
      Haptics.selectionAsync();
      const next = [...data];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      setData(next);
      reorderMedications(next.map(m => m.id));
    },
    [data, reorderMedications]
  );

  const handleDelete = useCallback(
    (med: Medication, index: number) => {
      Alert.alert(
        'Remove Medication',
        `Remove ${med.name}? This will delete all tracking history and its bird.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              const next = data.filter((_, i) => i !== index);
              setData(next);
              deleteMedication(med.id);
            },
          },
        ]
      );
    },
    [data, deleteMedication]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.hint}>
        <Text style={styles.hintText}>
          Use ↑ ↓ to reorder · tap 🗑 to remove
        </Text>
      </View>

      {data.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🐣</Text>
          <Text style={styles.emptyText}>No medications yet</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {data.map((med, index) => (
            <View key={med.id} style={styles.row}>
              {/* Arrow controls */}
              <View style={styles.arrowCol}>
                <TouchableOpacity
                  style={[styles.arrowBtn, index === 0 && styles.arrowBtnDisabled]}
                  onPress={() => move(index, index - 1)}
                  disabled={index === 0}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.arrowText, index === 0 && styles.arrowTextDisabled]}>
                    ↑
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.arrowBtn, index === data.length - 1 && styles.arrowBtnDisabled]}
                  onPress={() => move(index, index + 1)}
                  disabled={index === data.length - 1}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.arrowText, index === data.length - 1 && styles.arrowTextDisabled]}>
                    ↓
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Bird thumbnail */}
              <View style={styles.birdThumb}>
                <BirdSvg
                  traits={med.birdTraits}
                  equippedHat={med.equippedHat ?? undefined}
                  equippedAccessory={med.equippedAccessory ?? undefined}
                  health={med.health}
                  size={48}
                />
              </View>

              {/* Info */}
              <View style={styles.rowInfo}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {med.birdTraits.name || med.name}
                </Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                  {med.name} · {med.frequency}
                </Text>
                {med.pillCount !== null && (
                  <Text style={[styles.rowPills, med.pillCount <= 7 && styles.rowPillsLow]}>
                    {med.pillCount} tablet{med.pillCount === 1 ? '' : 's'} remaining
                  </Text>
                )}
              </View>

              {/* Delete */}
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(med, index)}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteIcon}>🗑</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F5F9FA',
  },
  hint: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#E0F7FA',
    borderBottomWidth: 1,
    borderBottomColor: '#B2EBF2',
  },
  hintText: {
    fontSize: 13,
    color: '#006064',
    textAlign: 'center',
    fontWeight: '500',
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  row: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingRight: 14,
    borderWidth: 1,
    borderColor: '#E8EFF3',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  arrowCol: {
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 2,
  },
  arrowBtn: {
    width: 32,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: '#F0F4F7',
  },
  arrowBtnDisabled: {
    backgroundColor: 'transparent',
  },
  arrowText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00BCD4',
  },
  arrowTextDisabled: {
    color: '#D0D8DE',
  },
  birdThumb: {
    marginRight: 10,
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A2B3C',
  },
  rowSub: {
    fontSize: 12,
    color: '#7A8B9A',
    marginTop: 2,
  },
  rowPills: {
    fontSize: 11,
    color: '#7A8B9A',
    marginTop: 2,
  },
  rowPillsLow: {
    color: '#E65100',
    fontWeight: '600',
  },
  deleteBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIcon: {
    fontSize: 18,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#7A8B9A',
    fontWeight: '600',
  },
});
