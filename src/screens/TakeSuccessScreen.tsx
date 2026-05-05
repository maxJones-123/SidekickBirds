import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { formatTime } from '../utils/medicationUtils';
import { useApp } from '../context/AppContext';

type Props = NativeStackScreenProps<RootStackParamList, 'TakeSuccess'>;

export default function TakeSuccessScreen({ route, navigation }: Props) {
  const { medicationId, medicationName, timeKey, pointsEarned, newStreak } = route.params;
  const { undoDose } = useApp();

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.doneBtn}>Done</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const handleUndo = () => {
    undoDose(medicationId, timeKey);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        {/* Sparkles + circle */}
        <View style={styles.sparkleRow}>
          <Text style={styles.sparkle}>✨</Text>
          <Text style={styles.sparkle}>✨</Text>
          <Text style={styles.sparkle}>✨</Text>
        </View>

        <View style={styles.checkCircle}>
          <Text style={styles.checkMark}>✓</Text>
        </View>

        <View style={styles.sparkleRowBottom}>
          <Text style={styles.sparkle}>✨</Text>
          <Text style={styles.sparkle}>✨</Text>
          <Text style={styles.sparkle}>✨</Text>
        </View>

        <Text style={styles.title}>Great job!</Text>
        <Text style={styles.subtitle}>
          You took {medicationName} · {formatTime(timeKey)}
        </Text>

        {/* Points badge */}
        <View style={styles.pointsBadge}>
          <Text style={styles.pointsText}>+{pointsEarned} points</Text>
        </View>

        {/* Streak card */}
        <View style={styles.streakCard}>
          <Text style={styles.streakEmoji}>🛡️</Text>
          <View style={styles.streakInfo}>
            <Text style={styles.streakTitle}>Streak: {newStreak} day{newStreak !== 1 ? 's' : ''}</Text>
            <Text style={styles.streakSub}>Keep it going!</Text>
          </View>
        </View>

        {/* Undo button */}
        <TouchableOpacity style={styles.undoBtn} onPress={handleUndo} activeOpacity={0.7}>
          <Text style={styles.undoBtnText}>Undo</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F5F9FA',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  doneBtn: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00BCD4',
    marginRight: 4,
  },
  sparkleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  sparkleRowBottom: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 28,
  },
  sparkle: {
    fontSize: 24,
  },
  checkCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#00BCD4',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00BCD4',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  checkMark: {
    fontSize: 48,
    color: '#FFFFFF',
    fontWeight: '700',
    lineHeight: 56,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A2B3C',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#7A8B9A',
    textAlign: 'center',
    marginBottom: 20,
  },
  pointsBadge: {
    backgroundColor: '#00BCD4',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginBottom: 28,
  },
  pointsText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E8EFF3',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  streakEmoji: {
    fontSize: 32,
    marginRight: 14,
  },
  streakInfo: {
    flex: 1,
  },
  streakTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2B3C',
  },
  streakSub: {
    fontSize: 13,
    color: '#7A8B9A',
    marginTop: 2,
  },
  undoBtn: {
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E8EFF3',
    backgroundColor: '#FFFFFF',
  },
  undoBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#7A8B9A',
  },
});
