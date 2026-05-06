import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import { AppState, Medication, EmergencyContact, Frequency } from '../types';
import { loadState, saveState } from '../utils/storage';
import { applyDoseTaken, getDoseStatus, getTodayString } from '../utils/medicationUtils';
import { generateBird } from '../utils/birdGenerator';
import { syncNotifications, cancelMedicationNotifications } from '../utils/notifications';

interface AppContextValue {
  state: AppState;
  isLoading: boolean;
  addMedication: (name: string, dose: string, form: string, frequency: Frequency, times: string[]) => void;
  deleteMedication: (id: string) => void;
  takeDose: (medicationId: string, timeKey: string) => { coinsEarned: number; xpEarned: number; newStreak: number };
  skipDose: (medicationId: string, timeKey: string) => void;
  undoDose: (medicationId: string, timeKey: string) => void;
  updateMedication: (med: Medication) => void;
  updatePillCount: (medicationId: string, count: number | null) => void;
  buyCosmetic: (cosmeticId: string, cost: number) => boolean;
  equipCosmetic: (medicationId: string, cosmeticId: string, type: 'hat' | 'accessory') => void;
  unequipCosmetic: (medicationId: string, type: 'hat' | 'accessory') => void;
  addContact: (name: string, phone: string) => void;
  removeContact: (id: string) => void;
  updateContact: (contact: EmergencyContact) => void;
  setRoomBackground: (medicationId: string, backgroundId: string) => void;
  toggleRoomDecoration: (medicationId: string, decorationId: string) => void;
  buyHomeItem: (itemId: string, cost: number) => boolean;
  renameBird: (medicationId: string, newName: string) => void;
  recolourBird: (medicationId: string, colours: { bodyColour: string; wingColour: string; bellyColour: string; beakColour: string; eyeColour: string }, cost: number) => boolean;
  reorderMedications: (ids: string[]) => void;
  setRepeatSettings: (medicationId: string, enabled: boolean, days: number, phone: string) => void;
  markRepeatRequested: (medicationId: string) => void;
  setReorderAmount: (medicationId: string, amount: number) => void;
  setReorderReminder: (medicationId: string, dateMs: number | null) => void;
  confirmRestock: (medicationId: string) => void;
  setUserName: (name: string) => void;
}

type Action =
  | { type: 'LOAD'; payload: AppState }
  | { type: 'ADD_MED'; payload: Medication }
  | { type: 'DELETE_MED'; payload: string }
  | { type: 'UPDATE_MED'; payload: Medication }
  | { type: 'ADD_COINS'; payload: number }
  | { type: 'SPEND_COINS'; payload: number }
  | { type: 'ADD_XP'; payload: number }
  | { type: 'UNLOCK_COSMETIC'; payload: string }
  | { type: 'EQUIP_COSMETIC'; payload: { medicationId: string; hat?: string | null; accessory?: string | null } }
  | { type: 'UPDATE_PILL_COUNT'; payload: { medicationId: string; count: number | null } }
  | { type: 'ADD_CONTACT'; payload: EmergencyContact }
  | { type: 'REMOVE_CONTACT'; payload: string }
  | { type: 'UPDATE_CONTACT'; payload: EmergencyContact }
  | { type: 'SET_ROOM_BG'; payload: { medicationId: string; backgroundId: string } }
  | { type: 'TOGGLE_ROOM_DECO'; payload: { medicationId: string; decorationId: string } }
  | { type: 'REORDER_MEDS'; payload: string[] }
  | { type: 'SET_USER_NAME'; payload: string };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOAD':
      return action.payload;
    case 'ADD_MED':
      return { ...state, medications: [...state.medications, action.payload] };
    case 'DELETE_MED':
      return { ...state, medications: state.medications.filter(m => m.id !== action.payload) };
    case 'UPDATE_MED':
      return {
        ...state,
        medications: state.medications.map(m => m.id === action.payload.id ? action.payload : m),
      };
    case 'ADD_COINS':
      return { ...state, coins: state.coins + action.payload };
    case 'SPEND_COINS':
      return { ...state, coins: Math.max(0, state.coins - action.payload) };
    case 'ADD_XP':
      return { ...state, totalXp: state.totalXp + action.payload };
    case 'UNLOCK_COSMETIC':
      return { ...state, unlockedCosmetics: [...state.unlockedCosmetics, action.payload] };
    case 'EQUIP_COSMETIC': {
      const { medicationId, hat, accessory } = action.payload;
      return {
        ...state,
        medications: state.medications.map(m => {
          if (m.id !== medicationId) return m;
          return {
            ...m,
            equippedHat: hat !== undefined ? hat : m.equippedHat,
            equippedAccessory: accessory !== undefined ? accessory : m.equippedAccessory,
          };
        }),
      };
    }
    case 'UPDATE_PILL_COUNT':
      return {
        ...state,
        medications: state.medications.map(m =>
          m.id === action.payload.medicationId
            ? { ...m, pillCount: action.payload.count }
            : m
        ),
      };
    case 'ADD_CONTACT':
      return {
        ...state,
        emergencyContacts: [...(state.emergencyContacts || []), action.payload],
      };
    case 'REMOVE_CONTACT':
      return {
        ...state,
        emergencyContacts: (state.emergencyContacts || []).filter(c => c.id !== action.payload),
      };
    case 'UPDATE_CONTACT':
      return {
        ...state,
        emergencyContacts: (state.emergencyContacts || []).map(c =>
          c.id === action.payload.id ? action.payload : c
        ),
      };
    case 'SET_ROOM_BG':
      return {
        ...state,
        medications: state.medications.map(m =>
          m.id === action.payload.medicationId
            ? { ...m, roomBackground: action.payload.backgroundId }
            : m
        ),
      };
    case 'TOGGLE_ROOM_DECO': {
      const { medicationId, decorationId } = action.payload;
      return {
        ...state,
        medications: state.medications.map(m => {
          if (m.id !== medicationId) return m;
          const decos = m.roomDecorations ?? [];
          const next = decos.includes(decorationId)
            ? decos.filter(d => d !== decorationId)
            : [...decos, decorationId].slice(-6); // cap at 6 decorations
          return { ...m, roomDecorations: next };
        }),
      };
    }
    case 'REORDER_MEDS': {
      const idOrder = action.payload;
      const medMap = new Map(state.medications.map(m => [m.id, m]));
      const reordered = idOrder.map(id => medMap.get(id)).filter((m): m is typeof state.medications[0] => !!m);
      return { ...state, medications: reordered };
    }
    case 'SET_USER_NAME':
      return { ...state, userName: action.payload };
    default:
      return state;
  }
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    medications: [],
    coins: 50,
    totalXp: 0,
    unlockedCosmetics: [],
    emergencyContacts: [],
    userName: '',
  });
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    loadState().then(loaded => {
      dispatch({ type: 'LOAD', payload: loaded });
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!isLoading) {
      saveState(state);
    }
  }, [state, isLoading]);

  // Re-sync push notifications whenever medications change (after load completes)
  useEffect(() => {
    if (!isLoading) {
      syncNotifications(state.medications);
    }
  }, [state.medications, isLoading]);

  const addMedication = useCallback(
    (name: string, dose: string, form: string, frequency: Frequency, times: string[]) => {
      const id = `med_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const med: Medication = {
        id,
        name,
        dose,
        form,
        frequency,
        scheduledTimes: times,
        birdTraits: generateBird(id),
        equippedHat: null,
        equippedAccessory: null,
        health: 100,
        streak: 0,
        history: [],
        pillCount: null,
        lowPillThreshold: 7,
        reorderAmount: 30,
        reorderReminderDate: null,
        lastRestockedAt: null,
        roomBackground: 'default',
        roomDecorations: ['plant', 'window'],
        isRepeat: false,
        repeatEveryDays: 28,
        pharmacyPhone: '',
        repeatRequestedAt: null,
        createdAt: Date.now(),
      };
      dispatch({ type: 'ADD_MED', payload: med });
    },
    []
  );

  const deleteMedication = useCallback((id: string) => {
    cancelMedicationNotifications(id);
    dispatch({ type: 'DELETE_MED', payload: id });
  }, []);

  const takeDose = useCallback(
    (medicationId: string, timeKey: string): { coinsEarned: number; xpEarned: number; newStreak: number } => {
      const med = state.medications.find(m => m.id === medicationId);
      if (!med) return { coinsEarned: 0, xpEarned: 0, newStreak: 0 };

      const status = getDoseStatus(med, timeKey);
      if (status === 'taken') return { coinsEarned: 0, xpEarned: 0, newStreak: med.streak };

      const onTime = status === 'due';
      const updated = applyDoseTaken(med, timeKey, onTime);

      // Decrement pill count if tracked
      const newPillCount =
        updated.pillCount !== null ? Math.max(0, updated.pillCount - 1) : null;
      const updatedWithPills = { ...updated, pillCount: newPillCount };

      dispatch({ type: 'UPDATE_MED', payload: updatedWithPills });

      const coinsEarned = onTime ? 15 : 5;
      const streakBonus = updated.streak > 0 && updated.streak % 7 === 0 ? 25 : 0;
      const totalCoins = coinsEarned + streakBonus;
      dispatch({ type: 'ADD_COINS', payload: totalCoins });

      const xpEarned = 5 + (updated.streak > 0 && updated.streak % 7 === 0 ? 10 : 0);
      dispatch({ type: 'ADD_XP', payload: xpEarned });

      return { coinsEarned: totalCoins, xpEarned, newStreak: updated.streak };
    },
    [state.medications]
  );

  const skipDose = useCallback(
    (medicationId: string, timeKey: string) => {
      const med = state.medications.find(m => m.id === medicationId);
      if (!med) return;

      const today = getTodayString();
      const existing = med.history.find(r => r.date === today && r.timeKey === timeKey);
      if (existing) return;

      const newHistory = [...med.history, { date: today, timeKey, takenAt: null, skipped: true }];
      dispatch({ type: 'UPDATE_MED', payload: { ...med, history: newHistory } });
    },
    [state.medications]
  );

  const undoDose = useCallback(
    (medicationId: string, timeKey: string) => {
      const med = state.medications.find(m => m.id === medicationId);
      if (!med) return;

      const today = getTodayString();
      const record = med.history.find(r => r.date === today && r.timeKey === timeKey && r.takenAt !== null);
      if (!record) return;

      const newHistory = med.history.filter(r => !(r.date === today && r.timeKey === timeKey && r.takenAt !== null));

      // Restore pill count if tracked
      const restoredPillCount = med.pillCount !== null ? med.pillCount + 1 : null;

      dispatch({
        type: 'UPDATE_MED',
        payload: { ...med, history: newHistory, pillCount: restoredPillCount },
      });

      // Deduct coins and XP
      dispatch({ type: 'SPEND_COINS', payload: 15 });
      dispatch({ type: 'ADD_XP', payload: -10 });
    },
    [state.medications]
  );

  const updateMedication = useCallback((med: Medication) => {
    dispatch({ type: 'UPDATE_MED', payload: med });
  }, []);

  const updatePillCount = useCallback((medicationId: string, count: number | null) => {
    dispatch({ type: 'UPDATE_PILL_COUNT', payload: { medicationId, count } });
  }, []);

  const buyCosmetic = useCallback(
    (cosmeticId: string, cost: number): boolean => {
      if (state.coins < cost) return false;
      if (state.unlockedCosmetics.includes(cosmeticId)) return false;
      dispatch({ type: 'SPEND_COINS', payload: cost });
      dispatch({ type: 'UNLOCK_COSMETIC', payload: cosmeticId });
      return true;
    },
    [state.coins, state.unlockedCosmetics]
  );

  const equipCosmetic = useCallback(
    (medicationId: string, cosmeticId: string, type: 'hat' | 'accessory') => {
      if (type === 'hat') {
        dispatch({ type: 'EQUIP_COSMETIC', payload: { medicationId, hat: cosmeticId } });
      } else {
        dispatch({ type: 'EQUIP_COSMETIC', payload: { medicationId, accessory: cosmeticId } });
      }
    },
    []
  );

  const unequipCosmetic = useCallback(
    (medicationId: string, type: 'hat' | 'accessory') => {
      if (type === 'hat') {
        dispatch({ type: 'EQUIP_COSMETIC', payload: { medicationId, hat: null } });
      } else {
        dispatch({ type: 'EQUIP_COSMETIC', payload: { medicationId, accessory: null } });
      }
    },
    []
  );

  const addContact = useCallback((name: string, phone: string) => {
    const contact: EmergencyContact = {
      id: `contact_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name,
      phone,
    };
    dispatch({ type: 'ADD_CONTACT', payload: contact });
  }, []);

  const removeContact = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_CONTACT', payload: id });
  }, []);

  const updateContact = useCallback((contact: EmergencyContact) => {
    dispatch({ type: 'UPDATE_CONTACT', payload: contact });
  }, []);

  const setRoomBackground = useCallback((medicationId: string, backgroundId: string) => {
    dispatch({ type: 'SET_ROOM_BG', payload: { medicationId, backgroundId } });
  }, []);

  const toggleRoomDecoration = useCallback((medicationId: string, decorationId: string) => {
    dispatch({ type: 'TOGGLE_ROOM_DECO', payload: { medicationId, decorationId } });
  }, []);

  const renameBird = useCallback((medicationId: string, newName: string) => {
    const med = state.medications.find(m => m.id === medicationId);
    if (!med) return;
    dispatch({
      type: 'UPDATE_MED',
      payload: { ...med, birdTraits: { ...med.birdTraits, name: newName.trim() } },
    });
  }, [state.medications]);

  const recolourBird = useCallback(
    (medicationId: string, colours: { bodyColour: string; wingColour: string; bellyColour: string; beakColour: string; eyeColour: string }, cost: number): boolean => {
      if (state.coins < cost) return false;
      const med = state.medications.find(m => m.id === medicationId);
      if (!med) return false;
      dispatch({ type: 'SPEND_COINS', payload: cost });
      dispatch({
        type: 'UPDATE_MED',
        payload: { ...med, birdTraits: { ...med.birdTraits, ...colours } },
      });
      return true;
    },
    [state.coins, state.medications]
  );

  const reorderMedications = useCallback((ids: string[]) => {
    dispatch({ type: 'REORDER_MEDS', payload: ids });
  }, []);

  const setRepeatSettings = useCallback(
    (medicationId: string, enabled: boolean, days: number, phone: string) => {
      const med = state.medications.find(m => m.id === medicationId);
      if (!med) return;
      dispatch({
        type: 'UPDATE_MED',
        payload: { ...med, isRepeat: enabled, repeatEveryDays: days, pharmacyPhone: phone.trim() },
      });
    },
    [state.medications]
  );

  const markRepeatRequested = useCallback(
    (medicationId: string) => {
      const med = state.medications.find(m => m.id === medicationId);
      if (!med) return;
      dispatch({
        type: 'UPDATE_MED',
        payload: { ...med, repeatRequestedAt: Date.now() },
      });
    },
    [state.medications]
  );

  const setReorderAmount = useCallback((medicationId: string, amount: number) => {
    const med = state.medications.find(m => m.id === medicationId);
    if (!med) return;
    dispatch({ type: 'UPDATE_MED', payload: { ...med, reorderAmount: amount } });
  }, [state.medications]);

  const setReorderReminder = useCallback((medicationId: string, dateMs: number | null) => {
    const med = state.medications.find(m => m.id === medicationId);
    if (!med) return;
    dispatch({ type: 'UPDATE_MED', payload: { ...med, reorderReminderDate: dateMs } });
  }, [state.medications]);

  const confirmRestock = useCallback((medicationId: string) => {
    const med = state.medications.find(m => m.id === medicationId);
    if (!med) return;
    const newCount = (med.pillCount ?? 0) + (med.reorderAmount ?? 30);
    dispatch({
      type: 'UPDATE_MED',
      payload: {
        ...med,
        pillCount: newCount,
        reorderReminderDate: null,
        lastRestockedAt: Date.now(),
      },
    });
  }, [state.medications]);

  const buyHomeItem = useCallback(
    (itemId: string, cost: number): boolean => {
      if (state.coins < cost) return false;
      if (state.unlockedCosmetics.includes(itemId)) return false;
      dispatch({ type: 'SPEND_COINS', payload: cost });
      dispatch({ type: 'UNLOCK_COSMETIC', payload: itemId });
      return true;
    },
    [state.coins, state.unlockedCosmetics]
  );

  return (
    <AppContext.Provider
      value={{
        state,
        isLoading,
        addMedication,
        deleteMedication,
        takeDose,
        skipDose,
        undoDose,
        updateMedication,
        updatePillCount,
        buyCosmetic,
        equipCosmetic,
        unequipCosmetic,
        addContact,
        removeContact,
        updateContact,
        setRoomBackground,
        toggleRoomDecoration,
        buyHomeItem,
        renameBird,
        recolourBird,
        reorderMedications,
        setRepeatSettings,
        markRepeatRequested,
        setReorderAmount,
        setReorderReminder,
        confirmRestock,
        setUserName: useCallback((name: string) => dispatch({ type: 'SET_USER_NAME', payload: name.trim() }), []),
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
