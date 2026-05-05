import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useApp } from '../context/AppContext';
import BirdSvg from '../components/BirdSvg';
import { getCosmeticById, COSMETICS } from '../constants/cosmetics';
import { getDoseStatus, formatTime, getTodayString } from '../utils/medicationUtils';
import * as Haptics from 'expo-haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'BirdDetail'>;

function HealthBar({ health }: { health: number }) {
  const color = health > 65 ? '#4CAF7D' : health > 35 ? '#F4A261' : '#E63946';
  const label = health > 65 ? 'Healthy' : health > 35 ? 'Tired' : 'Unwell';
  return (
    <View style={styles.healthContainer}>
      <View style={styles.healthBarBg}>
        <View style={[styles.healthBarFill, { width: `${health}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.healthLabel, { color }]}>{label} ({health}%)</Text>
    </View>
  );
}

export default function BirdDetailScreen({ route, navigation }: Props) {
  const { medicationId } = route.params;
  const { state, takeDose, deleteMedication, equipCosmetic, unequipCosmetic } = useApp();

  const med = state.medications.find(m => m.id === medicationId);

  React.useEffect(() => {
    if (med) navigation.setOptions({ title: med.birdTraits.name });
  }, [med, navigation]);

  const handleTake = useCallback((timeKey: string) => {
    const result = takeDose(medicationId, timeKey);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (result.coinsEarned > 0) {
      Alert.alert('Dose taken! 🎉', `+${result.coinsEarned} coins!`, [{ text: 'Nice!' }]);
    }
  }, [medicationId, takeDose]);

  const handleDelete = useCallback(() => {
    Alert.alert('Remove medication?', `This will also remove ${med?.birdTraits.name}. This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: () => { deleteMedication(medicationId); navigation.goBack(); },
      },
    ]);
  }, [med, medicationId, deleteMedication, navigation]);

  const handleEquip = useCallback((cosmeticId: string) => {
    const c = getCosmeticById(cosmeticId);
    if (!c) return;
    const currentlyEquipped = c.type === 'hat' ? med?.equippedHat : med?.equippedAccessory;
    if (currentlyEquipped === cosmeticId) {
      unequipCosmetic(medicationId, c.type);
    } else {
      equipCosmetic(medicationId, cosmeticId, c.type);
    }
    Haptics.selectionAsync();
  }, [med, medicationId, equipCosmetic, unequipCosmetic]);

  if (!med) return null;

  const today = getTodayString();
  const recentHistory = [...med.history]
    .filter(r => r.date >= today.slice(0, 8))
    .sort((a, b) => (b.date + b.timeKey).localeCompare(a.date + a.timeKey))
    .slice(0, 14);

  const unlockedCosmetics = COSMETICS.filter(c => state.unlockedCosmetics.includes(c.id));
  const unlockedHats = unlockedCosmetics.filter(c => c.type === 'hat');
  const unlockedAccessories = unlockedCosmetics.filter(c => c.type === 'accessory');

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Bird display */}
        <View style={styles.birdSection}>
          <BirdSvg
            traits={med.birdTraits}
            equippedHat={med.equippedHat}
            equippedAccessory={med.equippedAccessory}
            health={med.health}
            size={180}
          />
          <Text style={styles.birdName}>{med.birdTraits.name}</Text>
          <Text style={styles.medName}>{med.name}{med.dose ? ` · ${med.dose}` : ''}</Text>
          <HealthBar health={med.health} />
          {med.streak > 0 && <Text style={styles.streak}>🔥 {med.streak} day streak</Text>}
        </View>

        {/* Today's doses */}
        <View style={styles.card}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Today's Doses</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('EditReminders', { medicationId })}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <Text style={styles.editTimesLink}>Edit times ✎</Text>
            </TouchableOpacity>
          </View>
          {med.scheduledTimes.map(t => {
            const status = getDoseStatus(med, t);
            const cfg = {
              due:      { emoji: '💊', label: 'Take', bg: '#4CAF7D', text: '#fff', canTake: true },
              taken:    { emoji: '✅', label: 'Done', bg: '#E8F5E9', text: '#4CAF7D', canTake: false },
              missed:   { emoji: '⚠️', label: 'Missed', bg: '#FFF0F0', text: '#E63946', canTake: false },
              upcoming: { emoji: '🕐', label: formatTime(t), bg: '#EEE8DC', text: '#6B6560', canTake: false },
            }[status];
            return (
              <View key={t} style={styles.doseRow}>
                <Text style={styles.doseEmoji}>{cfg.emoji}</Text>
                <Text style={styles.doseTime}>{formatTime(t)}</Text>
                <TouchableOpacity
                  style={[styles.doseBtn, { backgroundColor: cfg.bg }]}
                  onPress={cfg.canTake ? () => handleTake(t) : undefined}
                  disabled={!cfg.canTake}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.doseBtnText, { color: cfg.text }]}>{cfg.label}</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Cosmetics */}
        {(unlockedHats.length > 0 || unlockedAccessories.length > 0) && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Dress Your Bird</Text>
            {unlockedHats.length > 0 && (
              <>
                <Text style={styles.cosmeticCategory}>Hats</Text>
                <View style={styles.cosmeticRow}>
                  {unlockedHats.map(c => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.cosmeticChip, med.equippedHat === c.id && styles.cosmeticChipActive]}
                      onPress={() => handleEquip(c.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.cosmeticEmoji}>{c.emoji}</Text>
                      <Text style={styles.cosmeticLabel}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
            {unlockedAccessories.length > 0 && (
              <>
                <Text style={styles.cosmeticCategory}>Accessories</Text>
                <View style={styles.cosmeticRow}>
                  {unlockedAccessories.map(c => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.cosmeticChip, med.equippedAccessory === c.id && styles.cosmeticChipActive]}
                      onPress={() => handleEquip(c.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.cosmeticEmoji}>{c.emoji}</Text>
                      <Text style={styles.cosmeticLabel}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        {/* Recent history */}
        {recentHistory.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Recent History</Text>
            {recentHistory.map((r, i) => (
              <View key={i} style={styles.historyRow}>
                <Text style={styles.historyEmoji}>{r.takenAt ? '✅' : '❌'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyDate}>{r.date}</Text>
                  <Text style={styles.historyTime}>{formatTime(r.timeKey)}</Text>
                </View>
                <Text style={[styles.historyStatus, { color: r.takenAt ? '#4CAF7D' : '#E63946' }]}>
                  {r.takenAt ? 'Taken' : 'Missed'}
                </Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.8}>
          <Text style={styles.deleteBtnText}>Remove Medication</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F0E6' },
  scroll: { padding: 20, paddingBottom: 40 },
  birdSection: {
    alignItems: 'center', backgroundColor: '#fff', borderRadius: 24,
    padding: 24, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 3 },
  },
  birdName: { fontSize: 22, fontWeight: '800', color: '#2C3E50', marginTop: 8 },
  medName: { fontSize: 14, color: '#6B6560', marginTop: 4 },
  healthContainer: { width: '100%', marginTop: 16 },
  healthBarBg: { height: 10, backgroundColor: '#EEE8DC', borderRadius: 5, overflow: 'hidden' },
  healthBarFill: { height: 10, borderRadius: 5 },
  healthLabel: { fontSize: 12, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  streak: { fontSize: 14, color: '#E07B39', marginTop: 8, fontWeight: '700' },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#2C3E50' },
  editTimesLink: { fontSize: 13, color: '#00BCD4', fontWeight: '600' },
  doseRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  doseEmoji: { fontSize: 20, marginRight: 10 },
  doseTime: { flex: 1, fontSize: 15, color: '#2C3E50', fontWeight: '500' },
  doseBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  doseBtnText: { fontSize: 13, fontWeight: '700' },
  cosmeticCategory: { fontSize: 13, fontWeight: '600', color: '#B0A898', marginBottom: 10, marginTop: 4 },
  cosmeticRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  cosmeticChip: {
    alignItems: 'center', backgroundColor: '#F7F0E6', borderRadius: 14,
    padding: 10, minWidth: 70, borderWidth: 2, borderColor: 'transparent',
  },
  cosmeticChipActive: { borderColor: '#4CAF7D', backgroundColor: '#E8F5E9' },
  cosmeticEmoji: { fontSize: 24 },
  cosmeticLabel: { fontSize: 11, color: '#6B6560', marginTop: 4, fontWeight: '500', textAlign: 'center' },
  historyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  historyEmoji: { fontSize: 18, marginRight: 10 },
  historyDate: { fontSize: 13, color: '#2C3E50', fontWeight: '500' },
  historyTime: { fontSize: 12, color: '#B0A898' },
  historyStatus: { fontSize: 13, fontWeight: '600' },
  deleteBtn: {
    marginTop: 8, padding: 16, borderRadius: 16,
    borderWidth: 1.5, borderColor: '#E63946', alignItems: 'center',
  },
  deleteBtnText: { fontSize: 15, color: '#E63946', fontWeight: '600' },
});
