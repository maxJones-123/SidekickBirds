import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { RootStackParamList } from '../types';
import { useApp } from '../context/AppContext';
import BirdSvg from '../components/BirdSvg';
import {
  ROOM_BACKGROUNDS, ROOM_DECORATIONS, FREE_DECORATION_IDS,
  getBackgroundById, getDecorationById,
} from '../constants/homeItems';

type Props = NativeStackScreenProps<RootStackParamList, 'CustomizeHome'>;

const SCREEN_WIDTH = Dimensions.get('window').width;

const DECO_POSITIONS = [
  { top: 12, right: 14 },
  { bottom: 6, left: 12 },
  { top: 12, left: 14 },
  { bottom: 6, right: 12 },
  { top: '40%' as const, left: 10 },
  { top: '40%' as const, right: 10 },
] as const;

export default function CustomizeHomeScreen({ route, navigation }: Props) {
  const { medicationId } = route.params;
  const { state, setRoomBackground, toggleRoomDecoration, buyHomeItem } = useApp();

  const med = state.medications.find(m => m.id === medicationId);
  const [activeTab, setActiveTab] = useState<'backgrounds' | 'decorations'>('backgrounds');

  if (!med) return null;

  const currentBg = getBackgroundById(med.roomBackground ?? 'default');
  const currentDecos = med.roomDecorations ?? ['plant', 'window'];

  function isItemUnlocked(id: string, cost: number): boolean {
    if (cost === 0) return true;
    return state.unlockedCosmetics.includes(id);
  }

  function handleSelectBackground(id: string, cost: number) {
    if (med!.roomBackground === id) return;
    if (isItemUnlocked(id, cost)) {
      setRoomBackground(medicationId, id);
      Haptics.selectionAsync();
    } else {
      Alert.alert(
        `Unlock ${getBackgroundById(id).name}?`,
        `Cost: 🪙 ${cost} coins\nYou have: 🪙 ${state.coins} coins`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: `Buy for ${cost} 🪙`,
            onPress: () => {
              const ok = buyHomeItem(id, cost);
              if (ok) {
                setRoomBackground(medicationId, id);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } else {
                Alert.alert('Not enough coins', `You need ${cost - state.coins} more coins.`);
              }
            },
          },
        ]
      );
    }
  }

  function handleToggleDecoration(id: string, cost: number) {
    if (isItemUnlocked(id, cost)) {
      toggleRoomDecoration(medicationId, id);
      Haptics.selectionAsync();
    } else {
      const deco = getDecorationById(id);
      Alert.alert(
        `Unlock ${deco?.name ?? id}?`,
        `Cost: 🪙 ${cost} coins\nYou have: 🪙 ${state.coins} coins`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: `Buy for ${cost} 🪙`,
            onPress: () => {
              const ok = buyHomeItem(id, cost);
              if (ok) {
                toggleRoomDecoration(medicationId, id);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } else {
                Alert.alert('Not enough coins', `You need ${cost - state.coins} more coins.`);
              }
            },
          },
        ]
      );
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Live room preview */}
        <View style={[styles.room, { backgroundColor: currentBg.wallColor }]}>
          <View style={[styles.floor, { backgroundColor: currentBg.floorColor }]} />

          {/* Decorations */}
          {currentDecos.slice(0, 6).map((id, i) => {
            const deco = getDecorationById(id);
            if (!deco) return null;
            const pos = DECO_POSITIONS[i % DECO_POSITIONS.length];
            return (
              <Text key={id} style={[styles.roomDeco, pos as any]}>
                {deco.emoji}
              </Text>
            );
          })}

          {/* Bird */}
          <View style={styles.birdWrap}>
            <BirdSvg
              traits={med.birdTraits}
              equippedHat={med.equippedHat}
              equippedAccessory={med.equippedAccessory}
              health={med.health}
              size={130}
            />
          </View>
        </View>

        {/* Coin balance */}
        <View style={styles.coinRow}>
          <Text style={styles.coinText}>🪙 {state.coins} coins available</Text>
        </View>

        {/* Tab switcher */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'backgrounds' && styles.tabActive]}
            onPress={() => setActiveTab('backgrounds')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'backgrounds' && styles.tabTextActive]}>
              Backgrounds
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'decorations' && styles.tabActive]}
            onPress={() => setActiveTab('decorations')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'decorations' && styles.tabTextActive]}>
              Decorations
            </Text>
          </TouchableOpacity>
        </View>

        {/* Backgrounds grid */}
        {activeTab === 'backgrounds' && (
          <View style={styles.grid}>
            {ROOM_BACKGROUNDS.map(bg => {
              const selected = (med.roomBackground ?? 'default') === bg.id;
              const unlocked = isItemUnlocked(bg.id, bg.cost);
              return (
                <TouchableOpacity
                  key={bg.id}
                  style={[
                    styles.bgCard,
                    { backgroundColor: bg.wallColor },
                    selected && styles.cardSelected,
                  ]}
                  onPress={() => handleSelectBackground(bg.id, bg.cost)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.bgFloorPreview, { backgroundColor: bg.floorColor }]} />
                  <Text style={styles.bgEmoji}>{bg.emoji}</Text>
                  <Text style={styles.bgName}>{bg.name}</Text>
                  {!unlocked && (
                    <View style={styles.lockBadge}>
                      <Text style={styles.lockText}>🪙 {bg.cost}</Text>
                    </View>
                  )}
                  {selected && (
                    <View style={styles.selectedBadge}>
                      <Text style={styles.selectedCheck}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Decorations grid */}
        {activeTab === 'decorations' && (
          <>
            <Text style={styles.decoHint}>
              Tap to toggle items in your room (up to 6 at once)
            </Text>
            <View style={styles.grid}>
              {ROOM_DECORATIONS.map(deco => {
                const equipped = currentDecos.includes(deco.id);
                const unlocked = isItemUnlocked(deco.id, deco.cost);
                return (
                  <TouchableOpacity
                    key={deco.id}
                    style={[
                      styles.decoCard,
                      equipped && styles.cardSelected,
                      !unlocked && styles.cardLocked,
                    ]}
                    onPress={() => handleToggleDecoration(deco.id, deco.cost)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.decoEmoji, !unlocked && styles.emojiLocked]}>
                      {deco.emoji}
                    </Text>
                    <Text style={styles.decoName}>{deco.name}</Text>
                    {!unlocked && (
                      <Text style={styles.decoCost}>🪙 {deco.cost}</Text>
                    )}
                    {equipped && (
                      <View style={styles.selectedBadge}>
                        <Text style={styles.selectedCheck}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F9FA' },
  scroll: { paddingBottom: 40 },

  room: {
    height: 200,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderColor: '#E8EFF3',
  },
  floor: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 48,
  },
  roomDeco: {
    position: 'absolute',
    fontSize: 32,
  },
  birdWrap: {
    marginBottom: 8,
    zIndex: 1,
  },

  coinRow: {
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 4,
  },
  coinText: {
    fontSize: 13,
    color: '#7A8B9A',
    fontWeight: '500',
  },

  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    backgroundColor: '#E8EFF3',
    borderRadius: 12,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  tabText: { fontSize: 14, fontWeight: '600', color: '#7A8B9A' },
  tabTextActive: { color: '#1A2B3C' },

  decoHint: {
    fontSize: 12,
    color: '#7A8B9A',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },

  bgCard: {
    width: CARD_WIDTH,
    height: 110,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  bgFloorPreview: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 28,
  },
  bgEmoji: { fontSize: 30, marginBottom: 4 },
  bgName: { fontSize: 12, fontWeight: '600', color: '#1A2B3C' },

  decoCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E8EFF3',
  },
  cardSelected: { borderColor: '#00BCD4' },
  cardLocked: { opacity: 0.7 },
  decoEmoji: { fontSize: 36, marginBottom: 6 },
  emojiLocked: { opacity: 0.5 },
  decoName: { fontSize: 12, fontWeight: '600', color: '#1A2B3C' },
  decoCost: { fontSize: 11, color: '#7A8B9A', marginTop: 3 },

  lockBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  lockText: { fontSize: 11, color: '#fff', fontWeight: '600' },

  selectedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#00BCD4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCheck: { fontSize: 13, color: '#fff', fontWeight: '800' },
});
