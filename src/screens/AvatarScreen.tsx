import React, { useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, NativeSyntheticEvent, NativeScrollEvent,
  Modal, TextInput, Alert, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { RootStackParamList, Medication, BirdTraits } from '../types';
import { useApp } from '../context/AppContext';
import BirdSvg from '../components/BirdSvg';
import { getLevel, getLevelXp, XP_PER_LEVEL } from '../utils/levelUtils';
import { getBackgroundById, getDecorationById } from '../constants/homeItems';
import { BIRD_PALETTES, RANDOM_RECOLOR_COST, BirdPalette } from '../constants/birdPalettes';
import { BODY_COLORS, WING_COLORS, BELLY_COLORS, BEAK_COLORS, EYE_COLORS } from '../utils/birdGenerator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DECO_POSITIONS = [
  { top: 12, right: 14 },
  { bottom: 6, left: 12 },
  { top: 12, left: 14 },
  { bottom: 6, right: 12 },
  { top: 90, left: 10 },
  { top: 90, right: 10 },
] as const;

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Rename Modal ────────────────────────────────────────────────────────────

interface RenameModalProps {
  visible: boolean;
  currentName: string;
  onSave: (name: string) => void;
  onClose: () => void;
}

function RenameModal({ visible, currentName, onSave, onClose }: RenameModalProps) {
  const [value, setValue] = useState(currentName);

  const handleOpen = useCallback(() => {
    setValue(currentName);
  }, [currentName]);

  const handleSave = () => {
    const trimmed = value.trim();
    if (!trimmed) { Alert.alert('Name required', 'Please enter a name.'); return; }
    onSave(trimmed);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onShow={handleOpen}
      onRequestClose={onClose}
    >
      <View style={modalStyles.backdrop}>
        <View style={modalStyles.sheet}>
          <Text style={modalStyles.title}>Rename Bird</Text>
          <TextInput
            style={modalStyles.input}
            value={value}
            onChangeText={setValue}
            placeholder="Enter a name…"
            placeholderTextColor="#B0BEC5"
            autoFocus
            maxLength={32}
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
          <View style={modalStyles.btnRow}>
            <TouchableOpacity style={modalStyles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={modalStyles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={modalStyles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
              <Text style={modalStyles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Recolour Modal ───────────────────────────────────────────────────────────

interface RecolourModalProps {
  visible: boolean;
  med: Medication;
  coins: number;
  onApply: (colours: { bodyColour: string; wingColour: string; bellyColour: string; beakColour: string; eyeColour: string }, cost: number) => void;
  onClose: () => void;
}

function RecolourModal({ visible, med, coins, onApply, onClose }: RecolourModalProps) {
  const [selected, setSelected] = useState<BirdPalette | 'random' | null>(null);

  const previewTraits: BirdTraits = selected && selected !== 'random'
    ? { ...med.birdTraits, ...selected }
    : med.birdTraits;

  const cost = selected === 'random' ? RANDOM_RECOLOR_COST : (selected?.cost ?? 0);
  const canAfford = coins >= cost;

  const handleApply = () => {
    if (!selected) return;
    if (!canAfford) {
      Alert.alert('Not enough coins', `You need ${cost - coins} more coins.`);
      return;
    }
    if (selected === 'random') {
      onApply({
        bodyColour: randomPick(BODY_COLORS),
        wingColour: randomPick(WING_COLORS),
        bellyColour: randomPick(BELLY_COLORS),
        beakColour: randomPick(BEAK_COLORS),
        eyeColour: randomPick(EYE_COLORS),
      }, RANDOM_RECOLOR_COST);
    } else {
      onApply({
        bodyColour: selected.bodyColour,
        wingColour: selected.wingColour,
        bellyColour: selected.bellyColour,
        beakColour: selected.beakColour,
        eyeColour: selected.eyeColour,
      }, selected.cost);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={recolourStyles.backdrop}>
        <View style={recolourStyles.sheet}>
          {/* Header */}
          <View style={recolourStyles.header}>
            <Text style={recolourStyles.title}>Recolour Bird</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={recolourStyles.closeBtn}>
              <Text style={recolourStyles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Live preview */}
          <View style={recolourStyles.preview}>
            <BirdSvg
              traits={previewTraits}
              equippedHat={med.equippedHat}
              equippedAccessory={med.equippedAccessory}
              health={med.health}
              size={100}
            />
            <View style={recolourStyles.previewInfo}>
              <Text style={recolourStyles.previewName}>{med.birdTraits.name}</Text>
              {selected ? (
                <View style={recolourStyles.costBadge}>
                  <Text style={recolourStyles.costText}>
                    🪙 {cost} {canAfford ? '' : `(need ${cost - coins} more)`}
                  </Text>
                </View>
              ) : (
                <Text style={recolourStyles.previewHint}>Tap a colour to preview</Text>
              )}
            </View>
          </View>

          {/* Random option */}
          <TouchableOpacity
            style={[recolourStyles.randomBtn, selected === 'random' && recolourStyles.randomBtnSelected]}
            onPress={() => setSelected('random')}
            activeOpacity={0.8}
          >
            <Text style={recolourStyles.randomBtnText}>✨ Random Recolour — 🪙 {RANDOM_RECOLOR_COST} pts</Text>
          </TouchableOpacity>

          {/* Palette grid */}
          <Text style={recolourStyles.sectionLabel}>PRESETS — 🪙 {BIRD_PALETTES[0].cost} pts each</Text>
          <FlatList
            data={BIRD_PALETTES}
            keyExtractor={p => p.id}
            numColumns={5}
            scrollEnabled={false}
            contentContainerStyle={recolourStyles.paletteGrid}
            renderItem={({ item }) => {
              const isSelected = selected !== 'random' && selected?.id === item.id;
              return (
                <TouchableOpacity
                  style={[recolourStyles.swatch, isSelected && recolourStyles.swatchSelected]}
                  onPress={() => setSelected(item)}
                  activeOpacity={0.8}
                >
                  <View style={[recolourStyles.swatchBody, { backgroundColor: item.bodyColour }]} />
                  <View style={[recolourStyles.swatchBelly, { backgroundColor: item.bellyColour }]} />
                  <Text style={recolourStyles.swatchName}>{item.name}</Text>
                </TouchableOpacity>
              );
            }}
          />

          {/* Apply button */}
          <TouchableOpacity
            style={[recolourStyles.applyBtn, (!selected || !canAfford) && recolourStyles.applyBtnDisabled]}
            onPress={handleApply}
            disabled={!selected}
            activeOpacity={0.85}
          >
            <Text style={recolourStyles.applyBtnText}>
              {selected ? `Apply — 🪙 ${cost} pts` : 'Select a colour'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── BirdRoom ────────────────────────────────────────────────────────────────

interface BirdRoomProps {
  med: Medication;
  coins: number;
  totalXp: number;
  onEditName: () => void;
}

function BirdRoom({ med, coins, totalXp, onEditName }: BirdRoomProps) {
  const level = getLevel(totalXp);
  const levelXp = getLevelXp(totalXp);
  const xpProgress = levelXp / XP_PER_LEVEL;
  const bg = getBackgroundById(med.roomBackground ?? 'default');
  const decos = med.roomDecorations ?? ['plant', 'window'];

  return (
    <View style={[styles.roomPage, { width: SCREEN_WIDTH }]}>
      <View style={[styles.room, { backgroundColor: bg.wallColour }]}>
        <View style={[styles.roomFloor, { backgroundColor: bg.floorColour }]} />
        {decos.slice(0, 6).map((id, i) => {
          const deco = getDecorationById(id);
          if (!deco) return null;
          const pos = DECO_POSITIONS[i % DECO_POSITIONS.length];
          return (
            <Text key={id} style={[styles.roomDecoEmoji, pos as any]}>{deco.emoji}</Text>
          );
        })}
        <View style={styles.birdContainer}>
          <BirdSvg
            traits={med.birdTraits}
            equippedHat={med.equippedHat}
            equippedAccessory={med.equippedAccessory}
            health={med.health}
            size={160}
          />
        </View>
      </View>

      <View style={styles.birdInfo}>
        <View style={styles.birdNameRow}>
          <Text style={styles.birdName} numberOfLines={1}>{med.birdTraits.name}</Text>
          <TouchableOpacity onPress={onEditName} style={styles.editNameBtn} activeOpacity={0.7}>
            <Text style={styles.editNameIcon}>✏️</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.birdStatsRow}>
          <Text style={styles.birdLevel}>Level {level}</Text>
          <Text style={styles.birdCoins}>🪙 {coins} pts</Text>
        </View>
        <View style={styles.xpRow}>
          <Text style={styles.xpLabel}>XP</Text>
          <View style={styles.xpTrack}>
            <View style={[styles.xpFill, { width: `${Math.min(xpProgress * 100, 100)}%` }]} />
          </View>
          <Text style={styles.xpValue}>{levelXp}/{XP_PER_LEVEL}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function AvatarScreen() {
  const navigation = useNavigation<Nav>();
  const { state, renameBird, recolourBird } = useApp();
  const [activePage, setActivePage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const [renameVisible, setRenameVisible] = useState(false);
  const [recolourVisible, setRecolourVisible] = useState(false);

  const activeMed = state.medications[activePage] ?? null;

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActivePage(page);
  }, []);

  const handleRenameSave = useCallback((name: string) => {
    if (!activeMed) return;
    renameBird(activeMed.id, name);
    setRenameVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [activeMed, renameBird]);

  const handleRecolour = useCallback(
    (colours: { bodyColour: string; wingColour: string; bellyColour: string; beakColour: string; eyeColour: string }, cost: number) => {
      if (!activeMed) return;
      const ok = recolourBird(activeMed.id, colours, cost);
      if (ok) {
        setRecolourVisible(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('Not enough coins', `You need more coins to recolour.`);
      }
    },
    [activeMed, recolourBird]
  );

  if (state.medications.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}><Text style={styles.headerTitle}>Avatar</Text></View>
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🐣</Text>
          <Text style={styles.emptyTitle}>No birds yet</Text>
          <Text style={styles.emptySubtitle}>Add a medication on the Home tab to hatch your first bird.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}><Text style={styles.headerTitle}>Avatar</Text></View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
      >
        {state.medications.map(med => (
          <BirdRoom
            key={med.id}
            med={med}
            coins={state.coins}
            totalXp={state.totalXp}
            onEditName={() => setRenameVisible(true)}
          />
        ))}
      </ScrollView>

      {state.medications.length > 1 && (
        <View style={styles.dotsRow}>
          {state.medications.map((_, i) => (
            <View key={i} style={[styles.dot, i === activePage && styles.dotActive]} />
          ))}
        </View>
      )}

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => activeMed && navigation.navigate('Shop', { medicationId: activeMed.id })}
          activeOpacity={0.85}
        >
          <Text style={styles.actionBtnIcon}>👕</Text>
          <View style={styles.actionBtnTextGroup}>
            <Text style={styles.actionBtnLabel}>Shop</Text>
            <Text style={styles.actionBtnSub}>Clothes & Skins</Text>
          </View>
          <Text style={styles.actionBtnChevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => setRecolourVisible(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.actionBtnIcon}>🎨</Text>
          <View style={styles.actionBtnTextGroup}>
            <Text style={styles.actionBtnLabel}>Recolour Bird</Text>
            <Text style={styles.actionBtnSub}>Presets 🪙 50 · Random 🪙 30</Text>
          </View>
          <Text style={styles.actionBtnChevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => activeMed && navigation.navigate('CustomiseHome', { medicationId: activeMed.id })}
          activeOpacity={0.85}
        >
          <Text style={styles.actionBtnIcon}>🏠</Text>
          <View style={styles.actionBtnTextGroup}>
            <Text style={styles.actionBtnLabel}>Customise Home</Text>
            <Text style={styles.actionBtnSub}>Backgrounds & Items</Text>
          </View>
          <Text style={styles.actionBtnChevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Rename modal */}
      {activeMed && (
        <RenameModal
          visible={renameVisible}
          currentName={activeMed.birdTraits.name}
          onSave={handleRenameSave}
          onClose={() => setRenameVisible(false)}
        />
      )}

      {/* Recolour modal */}
      {activeMed && (
        <RecolourModal
          visible={recolourVisible}
          med={activeMed}
          coins={state.coins}
          onApply={handleRecolour}
          onClose={() => setRecolourVisible(false)}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F9FA' },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1A2B3C' },

  roomPage: { alignItems: 'center' },
  room: {
    width: SCREEN_WIDTH - 32, height: 240,
    borderRadius: 20, marginHorizontal: 16, marginTop: 8,
    alignItems: 'center', justifyContent: 'flex-end',
    overflow: 'hidden', borderWidth: 1, borderColor: '#E8EFF3',
    position: 'relative',
  },
  roomFloor: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 48 },
  roomDecoEmoji: { position: 'absolute', fontSize: 34 },
  birdContainer: { alignItems: 'center', justifyContent: 'center' },

  birdInfo: {
    width: SCREEN_WIDTH - 32, marginHorizontal: 16, marginTop: 12,
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#E8EFF3',
  },
  birdNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  birdName: { fontSize: 18, fontWeight: '800', color: '#1A2B3C', flex: 1 },
  editNameBtn: { padding: 4, marginLeft: 8 },
  editNameIcon: { fontSize: 16 },

  birdStatsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  birdLevel: { fontSize: 14, color: '#00BCD4', fontWeight: '600' },
  birdCoins: { fontSize: 14, color: '#7A8B9A', fontWeight: '500' },

  xpRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  xpLabel: { fontSize: 12, fontWeight: '700', color: '#7A8B9A', width: 24 },
  xpTrack: { flex: 1, height: 8, backgroundColor: '#E8EFF3', borderRadius: 4, overflow: 'hidden' },
  xpFill: { height: 8, backgroundColor: '#00BCD4', borderRadius: 4 },
  xpValue: { fontSize: 11, color: '#7A8B9A', width: 64, textAlign: 'right' },

  dotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 10, marginBottom: 2 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#E8EFF3' },
  dotActive: { backgroundColor: '#00BCD4', width: 18 },

  actionButtons: { paddingHorizontal: 16, paddingBottom: 16, marginTop: 12, gap: 8 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E8EFF3',
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  actionBtnIcon: { fontSize: 26, marginRight: 14 },
  actionBtnTextGroup: { flex: 1 },
  actionBtnLabel: { fontSize: 15, fontWeight: '700', color: '#1A2B3C' },
  actionBtnSub: { fontSize: 11, color: '#7A8B9A', marginTop: 2 },
  actionBtnChevron: { fontSize: 22, color: '#B0BEC5', fontWeight: '300' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80, paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1A2B3C', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#7A8B9A', textAlign: 'center', lineHeight: 20 },
});

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  sheet: {
    width: SCREEN_WIDTH - 48, backgroundColor: '#FFFFFF',
    borderRadius: 24, padding: 24,
  },
  title: { fontSize: 18, fontWeight: '800', color: '#1A2B3C', marginBottom: 16, textAlign: 'center' },
  input: {
    backgroundColor: '#F5F9FA', borderRadius: 12,
    padding: 14, fontSize: 16, color: '#1A2B3C',
    borderWidth: 1.5, borderColor: '#E8EFF3', marginBottom: 20,
  },
  btnRow: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, padding: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E8EFF3', alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#7A8B9A' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#00BCD4', alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

const recolourStyles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 36,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  title: { flex: 1, fontSize: 18, fontWeight: '800', color: '#1A2B3C' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F5F9FA', alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 14, color: '#7A8B9A', fontWeight: '600' },

  preview: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F5F9FA', borderRadius: 16, padding: 12, marginBottom: 16,
  },
  previewInfo: { flex: 1, marginLeft: 12 },
  previewName: { fontSize: 16, fontWeight: '700', color: '#1A2B3C' },
  previewHint: { fontSize: 12, color: '#B0BEC5', marginTop: 4 },
  costBadge: {
    alignSelf: 'flex-start', marginTop: 6,
    backgroundColor: '#E0F7FA', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  costText: { fontSize: 13, color: '#00838F', fontWeight: '600' },

  randomBtn: {
    borderWidth: 1.5, borderColor: '#E8EFF3', borderRadius: 14,
    paddingVertical: 12, alignItems: 'center', marginBottom: 16,
  },
  randomBtnSelected: { borderColor: '#00BCD4', backgroundColor: '#E0F7FA' },
  randomBtnText: { fontSize: 14, fontWeight: '600', color: '#1A2B3C' },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#B0BEC5', letterSpacing: 1, marginBottom: 12 },

  paletteGrid: { gap: 8, marginBottom: 20 },
  swatch: {
    flex: 1, alignItems: 'center', margin: 2,
    borderRadius: 12, padding: 6,
    borderWidth: 2, borderColor: 'transparent',
  },
  swatchSelected: { borderColor: '#00BCD4', backgroundColor: '#E0F7FA' },
  swatchBody: { width: 32, height: 22, borderRadius: 8, marginBottom: 2 },
  swatchBelly: { width: 20, height: 12, borderRadius: 6, marginBottom: 4 },
  swatchName: { fontSize: 9, color: '#7A8B9A', fontWeight: '600', textAlign: 'center' },

  applyBtn: { backgroundColor: '#00BCD4', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  applyBtnDisabled: { backgroundColor: '#CFD8DC' },
  applyBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
