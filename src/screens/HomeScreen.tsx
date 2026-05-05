import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { RootStackParamList, Medication } from '../types';
import { useApp } from '../context/AppContext';
import { getDoseStatus, formatTime, getTodayString } from '../utils/medicationUtils';
import { getLevel, getLevelXp, XP_PER_LEVEL } from '../utils/levelUtils';
import BirdSvg from '../components/BirdSvg';
import { printMedicationDatabase } from '../data/medications';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const LOW_THRESHOLD = 7;

interface DoseRow {
  medicationId: string;
  medicationName: string;
  dose: string;
  form: string;
  frequency: string;
  timeKey: string;
}

function buildDoseRows(medications: Medication[]): DoseRow[] {
  const rows: DoseRow[] = [];
  for (const med of medications) {
    for (const timeKey of [...med.scheduledTimes].sort()) {
      rows.push({
        medicationId: med.id,
        medicationName: med.name,
        dose: med.dose,
        form: med.form,
        frequency: med.frequency,
        timeKey,
      });
    }
  }
  return rows;
}

function formatTodayLabel(): string {
  const d = new Date();
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).toUpperCase();
}

interface MedCardProps {
  row: DoseRow;
  med: Medication;
  onTake: (medicationId: string, timeKey: string) => void;
  onSkip: (medicationId: string, timeKey: string) => void;
  onBirdPress: (medicationId: string) => void;
  onEditTimes: (medicationId: string) => void;
}

function MedCard({ row, med, onTake, onSkip, onBirdPress, onEditTimes }: MedCardProps) {
  const status = getDoseStatus(med, row.timeKey);
  const doseLabel = [row.dose, row.form].filter(Boolean).join(' ');
  const isLow = med.pillCount !== null && med.pillCount <= LOW_THRESHOLD;

  const handleTake = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onTake(row.medicationId, row.timeKey);
  }, [row.medicationId, row.timeKey, onTake]);

  const handleSkip = useCallback(() => {
    Haptics.selectionAsync();
    onSkip(row.medicationId, row.timeKey);
  }, [row.medicationId, row.timeKey, onSkip]);

  return (
    <View style={[styles.card, isLow && styles.cardLowBorder]}>
      {/* Low pill warning strip */}
      {isLow && (
        <View style={styles.lowStrip}>
          <Text style={styles.lowStripText}>
            ⚠️ {med.pillCount === 0 ? 'Out of stock' : `${med.pillCount} tablet${med.pillCount === 1 ? '' : 's'} left`}
          </Text>
        </View>
      )}

      <View style={styles.cardInner}>
        {/* Bird avatar */}
        <TouchableOpacity
          onPress={() => onBirdPress(row.medicationId)}
          activeOpacity={0.85}
          style={styles.birdContainer}
        >
          <BirdSvg
            traits={med.birdTraits}
            equippedHat={med.equippedHat ?? undefined}
            equippedAccessory={med.equippedAccessory ?? undefined}
            health={med.health}
            size={80}
          />
          {med.streak > 0 && (
            <View style={styles.streakBadge}>
              <Text style={styles.streakBadgeText}>🔥{med.streak}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Info + actions */}
        <View style={styles.cardContent}>
          <View style={styles.cardTopRow}>
            <View style={styles.cardLeft}>
              <Text style={styles.cardMedName} numberOfLines={1}>{row.medicationName}</Text>
              {doseLabel ? (
                <Text style={styles.cardDose} numberOfLines={1}>{doseLabel} · {row.frequency}</Text>
              ) : (
                <Text style={styles.cardDose}>{row.frequency}</Text>
              )}
            </View>
            <TouchableOpacity
              onPress={() => onEditTimes(row.medicationId)}
              activeOpacity={0.7}
              style={styles.timeChip}
            >
              <Text style={styles.cardTime}>{formatTime(row.timeKey)}</Text>
              <Text style={styles.timeChipEdit}>✎</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cardBottom}>
            {status === 'taken' ? (
              <View style={styles.takenChip}>
                <Text style={styles.takenChipText}>✓ Taken</Text>
              </View>
            ) : status === 'missed' ? (
              <View style={styles.missedChip}>
                <Text style={styles.missedChipText}>Missed</Text>
              </View>
            ) : (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.skipBtn}
                  onPress={handleSkip}
                  activeOpacity={0.7}
                >
                  <Text style={styles.skipBtnText}>Skip</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.takeBtn}
                  onPress={handleTake}
                  activeOpacity={0.85}
                >
                  <Text style={styles.takeBtnText}>Take</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { state, takeDose, skipDose } = useApp();

  // DEV: print medication database on first load — remove when done validating
  useEffect(() => { printMedicationDatabase(); }, []);

  const level = getLevel(state.totalXp);
  const levelXp = getLevelXp(state.totalXp);
  const xpProgress = levelXp / XP_PER_LEVEL;

  const doseRows = buildDoseRows(state.medications);

  const lowMeds = state.medications.filter(
    m => m.pillCount !== null && m.pillCount <= LOW_THRESHOLD
  );

  const handleTake = useCallback(
    (medicationId: string, timeKey: string) => {
      const result = takeDose(medicationId, timeKey);
      if (result.coinsEarned > 0) {
        const med = state.medications.find(m => m.id === medicationId);
        navigation.navigate('TakeSuccess', {
          medicationId,
          medicationName: med?.name ?? '',
          timeKey,
          pointsEarned: result.coinsEarned,
          newStreak: result.newStreak,
        });
      }
    },
    [takeDose, state.medications, navigation]
  );

  const handleSkip = useCallback(
    (medicationId: string, timeKey: string) => {
      skipDose(medicationId, timeKey);
    },
    [skipDose]
  );

  const handleBirdPress = useCallback(
    (medicationId: string) => {
      navigation.navigate('BirdDetail', { medicationId });
    },
    [navigation]
  );

  const handleEditTimes = useCallback(
    (medicationId: string) => {
      navigation.navigate('EditReminders', { medicationId });
    },
    [navigation]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Medication Reminder</Text>
        <View style={styles.headerBtns}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.navigate('ManageMedications')}
            activeOpacity={0.7}
          >
            <Text style={styles.headerIconText}>⋮⋮</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.navigate('EmergencyContacts')}
            activeOpacity={0.7}
          >
            <Text style={styles.bellIcon}>🔔</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Level bar */}
      <View style={styles.levelSection}>
        <View style={styles.levelRow}>
          <Text style={styles.levelText}>Level {level}</Text>
          <Text style={styles.xpText}>XP: {levelXp} / {XP_PER_LEVEL}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.min(xpProgress * 100, 100)}%` }]} />
        </View>
      </View>

      {/* Running low banner */}
      {lowMeds.length > 0 && (
        <TouchableOpacity
          style={styles.lowBanner}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Restock' } as any)}
          activeOpacity={0.85}
        >
          <View style={styles.lowBannerLeft}>
            <Text style={styles.lowBannerIcon}>💊</Text>
            <View>
              <Text style={styles.lowBannerTitle}>Running Low</Text>
              <Text style={styles.lowBannerSub}>
                {lowMeds.length === 1
                  ? `${lowMeds[0].name} needs restocking`
                  : `${lowMeds.length} medications need restocking`}
              </Text>
            </View>
          </View>
          <Text style={styles.lowBannerArrow}>›</Text>
        </TouchableOpacity>
      )}

      {/* TODAY label */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>TODAY</Text>
        <Text style={styles.sectionDate}>{formatTodayLabel()}</Text>
      </View>

      {doseRows.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🐣</Text>
          <Text style={styles.emptyTitle}>No medications yet</Text>
          <Text style={styles.emptySubtitle}>
            Add a medication to start tracking your doses.
          </Text>
        </View>
      ) : (
        <FlatList
          data={doseRows}
          keyExtractor={item => `${item.medicationId}_${item.timeKey}`}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const med = state.medications.find(m => m.id === item.medicationId);
            if (!med) return null;
            return (
              <MedCard
                row={item}
                med={med}
                onTake={handleTake}
                onSkip={handleSkip}
                onBirdPress={handleBirdPress}
                onEditTimes={handleEditTimes}
              />
            );
          }}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddMedication')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F5F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A2B3C',
  },
  headerBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8EFF3',
  },
  headerIconText: {
    fontSize: 15,
    color: '#7A8B9A',
    letterSpacing: -2,
  },
  bellIcon: {
    fontSize: 18,
  },
  levelSection: {
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8EFF3',
  },
  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  levelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A2B3C',
  },
  xpText: {
    fontSize: 13,
    color: '#7A8B9A',
    fontWeight: '500',
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#E8EFF3',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    backgroundColor: '#00BCD4',
    borderRadius: 4,
  },
  lowBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#FFF3E0',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FFB300',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lowBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  lowBannerIcon: {
    fontSize: 24,
  },
  lowBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E65100',
  },
  lowBannerSub: {
    fontSize: 12,
    color: '#BF360C',
    marginTop: 2,
  },
  lowBannerArrow: {
    fontSize: 22,
    color: '#FFB300',
    fontWeight: '700',
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00BCD4',
    letterSpacing: 1.2,
  },
  sectionDate: {
    fontSize: 11,
    color: '#7A8B9A',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E8EFF3',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    overflow: 'hidden',
  },
  cardLowBorder: {
    borderColor: '#FFB300',
  },
  lowStrip: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE0B2',
  },
  lowStripText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E65100',
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  birdContainer: {
    width: 84,
    alignItems: 'center',
    position: 'relative',
    marginRight: 12,
  },
  streakBadge: {
    position: 'absolute',
    bottom: -4,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#E8EFF3',
  },
  streakBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardContent: {
    flex: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardLeft: {
    flex: 1,
    marginRight: 8,
  },
  cardMedName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A2B3C',
  },
  cardDose: {
    fontSize: 12,
    color: '#7A8B9A',
    marginTop: 2,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FBFC',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#B2EBF2',
  },
  cardTime: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00838F',
  },
  timeChipEdit: {
    fontSize: 11,
    color: '#00BCD4',
  },
  cardBottom: {
    alignItems: 'flex-end',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  skipBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E8EFF3',
    backgroundColor: '#FFFFFF',
  },
  skipBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7A8B9A',
  },
  takeBtn: {
    paddingHorizontal: 20,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#00BCD4',
  },
  takeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  takenChip: {
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  takenChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4CAF50',
  },
  missedChip: {
    backgroundColor: '#FFEBEE',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  missedChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F44336',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A2B3C',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#7A8B9A',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00BCD4',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00BCD4',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: {
    fontSize: 28,
    fontWeight: '400',
    color: '#FFFFFF',
    lineHeight: 32,
  },
});
