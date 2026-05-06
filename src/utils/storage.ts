import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Medication } from '../types';

const KEY = '@sidekickbirds_state';

const DEFAULT_STATE: AppState = {
  medications: [],
  coins: 50,
  totalXp: 0,
  unlockedCosmetics: [],
  emergencyContacts: [],
  userName: '',
};

function migrateMedication(m: Medication): Medication {
  return {
    ...m,
    form: m.form ?? '',
    frequency: m.frequency ?? 'Once Daily',
    pillCount: m.pillCount !== undefined ? m.pillCount : null,
    lowPillThreshold: m.lowPillThreshold ?? 7,
    reorderAmount: m.reorderAmount ?? 30,
    reorderReminderDate: m.reorderReminderDate !== undefined ? m.reorderReminderDate : null,
    lastRestockedAt: m.lastRestockedAt !== undefined ? m.lastRestockedAt : null,
    roomBackground: m.roomBackground ?? 'default',
    roomDecorations: m.roomDecorations ?? ['plant', 'window'],
    isRepeat: m.isRepeat ?? false,
    repeatEveryDays: m.repeatEveryDays ?? 28,
    pharmacyPhone: m.pharmacyPhone ?? '',
    repeatRequestedAt: m.repeatRequestedAt !== undefined ? m.repeatRequestedAt : null,
  };
}

export async function loadState(): Promise<AppState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const merged: AppState = { ...DEFAULT_STATE, ...parsed };
    merged.medications = (merged.medications || []).map(migrateMedication);
    return merged;
  } catch {
    return DEFAULT_STATE;
  }
}

export async function saveState(state: AppState): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // storage write failures are non-fatal
  }
}
