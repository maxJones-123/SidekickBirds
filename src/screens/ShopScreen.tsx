import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { RootStackParamList, Cosmetic } from '../types';
import { useApp } from '../context/AppContext';
import { COSMETICS } from '../constants/cosmetics';
import BirdSvg from '../components/BirdSvg';

type Props = NativeStackScreenProps<RootStackParamList, 'Shop'>;
type FilterType = 'all' | 'hat' | 'accessory';

export default function ShopScreen({ route }: Props) {
  const { medicationId } = route.params;
  const { state, buyCosmetic, equipCosmetic, unequipCosmetic } = useApp();
  const [filter, setFilter] = useState<FilterType>('all');

  const med = state.medications.find(m => m.id === medicationId);

  const handlePress = useCallback((item: Cosmetic) => {
    const owned = state.unlockedCosmetics.includes(item.id);

    if (!owned) {
      Alert.alert(
        `Buy ${item.name}?`,
        `Cost: 🪙 ${item.cost} coins\nYou have: 🪙 ${state.coins} coins\n\n${item.description}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: `Buy for ${item.cost} 🪙`,
            onPress: () => {
              const success = buyCosmetic(item.id, item.cost);
              if (success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } else {
                Alert.alert('Not enough coins', `You need ${item.cost - state.coins} more coins.`);
              }
            },
          },
        ]
      );
      return;
    }

    if (!med) return;
    const currentlyEquipped =
      item.type === 'hat' ? med.equippedHat : med.equippedAccessory;

    if (currentlyEquipped === item.id) {
      unequipCosmetic(medicationId, item.type);
    } else {
      equipCosmetic(medicationId, item.id, item.type);
    }
    Haptics.selectionAsync();
  }, [state.unlockedCosmetics, state.coins, med, medicationId, buyCosmetic, equipCosmetic, unequipCosmetic]);

  const filtered = COSMETICS.filter(c => filter === 'all' || c.type === filter);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Bird preview */}
      {med && (
        <View style={styles.preview}>
          <BirdSvg
            traits={med.birdTraits}
            equippedHat={med.equippedHat}
            equippedAccessory={med.equippedAccessory}
            health={med.health}
            size={110}
          />
          <View style={styles.previewInfo}>
            <Text style={styles.previewName}>{med.birdTraits.name}</Text>
            <Text style={styles.previewMed}>{med.name}</Text>
            <View style={styles.equippedRow}>
              <Text style={styles.equippedLabel}>
                Hat: {med.equippedHat
                  ? COSMETICS.find(c => c.id === med.equippedHat)?.emoji ?? '—'
                  : '—'}
              </Text>
              <Text style={styles.equippedLabel}>
                Acc: {med.equippedAccessory
                  ? COSMETICS.find(c => c.id === med.equippedAccessory)?.emoji ?? '—'
                  : '—'}
              </Text>
            </View>
            <View style={styles.coinBadge}>
              <Text style={styles.coinText}>🪙 {state.coins}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {(['all', 'hat', 'accessory'] as FilterType[]).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'All' : f === 'hat' ? '🎩 Hats' : '✨ Accessories'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={c => c.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => {
          const owned = state.unlockedCosmetics.includes(item.id);
          const equipped =
            item.type === 'hat'
              ? med?.equippedHat === item.id
              : med?.equippedAccessory === item.id;
          const canAfford = state.coins >= item.cost;

          return (
            <TouchableOpacity
              style={[
                styles.itemCard,
                equipped && styles.itemCardEquipped,
                owned && !equipped && styles.itemCardOwned,
              ]}
              onPress={() => handlePress(item)}
              activeOpacity={0.8}
            >
              <Text style={[styles.itemEmoji, !owned && styles.itemEmojiLocked]}>
                {item.emoji}
              </Text>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemDesc}>{item.description}</Text>

              {equipped ? (
                <View style={styles.equippedBadge}>
                  <Text style={styles.equippedBadgeText}>✓ Equipped</Text>
                </View>
              ) : owned ? (
                <View style={styles.ownedBadge}>
                  <Text style={styles.ownedBadgeText}>Tap to equip</Text>
                </View>
              ) : (
                <View style={[styles.buyBadge, !canAfford && styles.buyBadgeDisabled]}>
                  <Text style={styles.buyBadgeText}>🪙 {item.cost}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F9FA' },

  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8EFF3',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  previewInfo: { flex: 1, marginLeft: 12 },
  previewName: { fontSize: 16, fontWeight: '700', color: '#1A2B3C' },
  previewMed: { fontSize: 12, color: '#7A8B9A', marginTop: 2 },
  equippedRow: { flexDirection: 'row', gap: 12, marginTop: 6 },
  equippedLabel: { fontSize: 13, color: '#1A2B3C' },
  coinBadge: {
    alignSelf: 'flex-start', marginTop: 8,
    backgroundColor: '#FFF8E7', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: '#FFD700',
  },
  coinText: { fontSize: 13, fontWeight: '700', color: '#B8860B' },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 12,
    marginBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E8EFF3',
  },
  filterChipActive: { backgroundColor: '#00BCD4', borderColor: '#00BCD4' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#7A8B9A' },
  filterTextActive: { color: '#fff' },

  grid: { paddingHorizontal: 12, paddingBottom: 40 },
  row: { justifyContent: 'space-between', marginBottom: 12 },

  itemCard: {
    flex: 0.48,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  itemCardOwned: { borderColor: '#B2EBF2' },
  itemCardEquipped: { borderColor: '#00BCD4', backgroundColor: '#E0F7FA' },
  itemEmoji: { fontSize: 40, marginBottom: 8 },
  itemEmojiLocked: { opacity: 0.45 },
  itemName: { fontSize: 13, fontWeight: '700', color: '#1A2B3C', textAlign: 'center' },
  itemDesc: {
    fontSize: 11, color: '#7A8B9A', textAlign: 'center',
    marginTop: 4, marginBottom: 8, lineHeight: 15,
  },
  equippedBadge: {
    backgroundColor: '#00BCD4', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  equippedBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  ownedBadge: {
    backgroundColor: '#E0F7FA', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  ownedBadgeText: { fontSize: 12, fontWeight: '600', color: '#00838F' },
  buyBadge: {
    backgroundColor: '#00BCD4', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  buyBadgeDisabled: { backgroundColor: '#CFD8DC' },
  buyBadgeText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
