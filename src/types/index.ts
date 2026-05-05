export type BodyShape = 'round' | 'tall' | 'chubby';
export type CrestStyle = 'none' | 'small' | 'large' | 'curl';
export type TailStyle = 'short' | 'long' | 'fan' | 'forked';
export type EyeStyle = 'round' | 'sleepy' | 'wide';
export type CosmeticType = 'hat' | 'accessory';
export type Frequency = 'Once Daily' | 'Twice Daily' | '3x Daily' | '4x Daily' | 'As Needed' | 'Weekly';

export interface BirdTraits {
  bodyColour: string;
  bellyColour: string;
  wingColour: string;
  beakColour: string;
  eyeColour: string;
  bodyShape: BodyShape;
  crestStyle: CrestStyle;
  tailStyle: TailStyle;
  eyeStyle: EyeStyle;
  name: string;
}

export interface Cosmetic {
  id: string;
  name: string;
  type: CosmeticType;
  cost: number;
  emoji: string;
  description: string;
}

export interface DoseRecord {
  date: string;
  timeKey: string;
  takenAt: number | null;
  skipped?: boolean;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
}

export interface Medication {
  id: string;
  name: string;
  dose: string;
  form: string;
  frequency: Frequency;
  scheduledTimes: string[];
  birdTraits: BirdTraits;
  equippedHat: string | null;
  equippedAccessory: string | null;
  health: number;
  streak: number;
  history: DoseRecord[];
  pillCount: number | null;
  lowPillThreshold: number;       // default 7
  reorderAmount: number;          // how many pills to add when restocking, default 30
  reorderReminderDate: number | null; // epoch ms for scheduled reminder, null = none
  lastRestockedAt: number | null; // epoch ms of last restock
  roomBackground: string;       // background id, default 'default'
  roomDecorations: string[];    // decoration ids, default ['plant', 'window']
  // Repeat prescription
  isRepeat: boolean;            // tracked as a repeat prescription
  repeatEveryDays: number;      // cycle length: 28 / 56 / 84 / 90
  pharmacyPhone: string;        // pharmacy contact (optional)
  repeatRequestedAt: number | null; // epoch ms of last request
  createdAt: number;
}

export interface AppState {
  medications: Medication[];
  coins: number;
  totalXp: number;
  unlockedCosmetics: string[];
  emergencyContacts: EmergencyContact[];
}

export type RootStackParamList = {
  MainTabs: undefined;
  AddMedication: undefined;
  ManageMedications: undefined;
  EditReminders: { medicationId: string };
  EmergencyContacts: undefined;
  TakeSuccess: {
    medicationId: string;
    medicationName: string;
    timeKey: string;
    pointsEarned: number;
    newStreak: number;
  };
  HowItWorks: undefined;
  BirdDetail: { medicationId: string };
  Shop: { medicationId: string };
  CustomiseHome: { medicationId: string };
};

export type MainTabParamList = {
  Home: undefined;
  Avatar: undefined;
  Restock: undefined;
};
