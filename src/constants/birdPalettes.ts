export interface BirdPalette {
  id: string;
  name: string;
  bodyColor: string;
  wingColor: string;
  bellyColor: string;
  beakColor: string;
  eyeColor: string;
  cost: number;
}

export const PRESET_PALETTE_COST = 50;
export const RANDOM_RECOLOR_COST = 30;

export const BIRD_PALETTES: BirdPalette[] = [
  { id: 'ocean',    name: 'Ocean',    bodyColor: '#1565C0', wingColor: '#0D47A1', bellyColor: '#E3F2FD', beakColor: '#FFB300', eyeColor: '#1a1a1a', cost: PRESET_PALETTE_COST },
  { id: 'forest',   name: 'Forest',   bodyColor: '#2E7D32', wingColor: '#1B5E20', bellyColor: '#E8F5E9', beakColor: '#FF8F00', eyeColor: '#1a1a1a', cost: PRESET_PALETTE_COST },
  { id: 'fiery',    name: 'Fiery',    bodyColor: '#C62828', wingColor: '#B71C1C', bellyColor: '#FFEBEE', beakColor: '#FF6F00', eyeColor: '#1a1a1a', cost: PRESET_PALETTE_COST },
  { id: 'royal',    name: 'Royal',    bodyColor: '#6A1B9A', wingColor: '#4A148C', bellyColor: '#F3E5F5', beakColor: '#FFB300', eyeColor: '#1a1a1a', cost: PRESET_PALETTE_COST },
  { id: 'golden',   name: 'Golden',   bodyColor: '#F57F17', wingColor: '#E65100', bellyColor: '#FFFDE7', beakColor: '#BF360C', eyeColor: '#1a1a1a', cost: PRESET_PALETTE_COST },
  { id: 'blossom',  name: 'Blossom',  bodyColor: '#AD1457', wingColor: '#880E4F', bellyColor: '#FCE4EC', beakColor: '#FF8A65', eyeColor: '#1a1a1a', cost: PRESET_PALETTE_COST },
  { id: 'teal',     name: 'Teal',     bodyColor: '#00695C', wingColor: '#004D40', bellyColor: '#E0F2F1', beakColor: '#FFB300', eyeColor: '#1a1a1a', cost: PRESET_PALETTE_COST },
  { id: 'midnight', name: 'Midnight', bodyColor: '#283593', wingColor: '#1A237E', bellyColor: '#E8EAF6', beakColor: '#FFA726', eyeColor: '#1a1a1a', cost: PRESET_PALETTE_COST },
  { id: 'coral',    name: 'Coral',    bodyColor: '#E64A19', wingColor: '#D84315', bellyColor: '#FBE9E7', beakColor: '#FFC107', eyeColor: '#1a1a1a', cost: PRESET_PALETTE_COST },
  { id: 'lavender', name: 'Lavender', bodyColor: '#7B1FA2', wingColor: '#6A1B9A', bellyColor: '#EDE7F6', beakColor: '#FFCA28', eyeColor: '#1a1a1a', cost: PRESET_PALETTE_COST },
];
