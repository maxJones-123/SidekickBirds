export interface BirdPalette {
  id: string;
  name: string;
  bodyColour: string;
  wingColour: string;
  bellyColour: string;
  beakColour: string;
  eyeColour: string;
  cost: number;
}

export const PRESET_PALETTE_COST = 50;
export const RANDOM_RECOLOR_COST = 30;

export const BIRD_PALETTES: BirdPalette[] = [
  { id: 'ocean',    name: 'Ocean',    bodyColour: '#1565C0', wingColour: '#0D47A1', bellyColour: '#E3F2FD', beakColour: '#FFB300', eyeColour: '#1a1a1a', cost: PRESET_PALETTE_COST },
  { id: 'forest',   name: 'Forest',   bodyColour: '#2E7D32', wingColour: '#1B5E20', bellyColour: '#E8F5E9', beakColour: '#FF8F00', eyeColour: '#1a1a1a', cost: PRESET_PALETTE_COST },
  { id: 'fiery',    name: 'Fiery',    bodyColour: '#C62828', wingColour: '#B71C1C', bellyColour: '#FFEBEE', beakColour: '#FF6F00', eyeColour: '#1a1a1a', cost: PRESET_PALETTE_COST },
  { id: 'royal',    name: 'Royal',    bodyColour: '#6A1B9A', wingColour: '#4A148C', bellyColour: '#F3E5F5', beakColour: '#FFB300', eyeColour: '#1a1a1a', cost: PRESET_PALETTE_COST },
  { id: 'golden',   name: 'Golden',   bodyColour: '#F57F17', wingColour: '#E65100', bellyColour: '#FFFDE7', beakColour: '#BF360C', eyeColour: '#1a1a1a', cost: PRESET_PALETTE_COST },
  { id: 'blossom',  name: 'Blossom',  bodyColour: '#AD1457', wingColour: '#880E4F', bellyColour: '#FCE4EC', beakColour: '#FF8A65', eyeColour: '#1a1a1a', cost: PRESET_PALETTE_COST },
  { id: 'teal',     name: 'Teal',     bodyColour: '#00695C', wingColour: '#004D40', bellyColour: '#E0F2F1', beakColour: '#FFB300', eyeColour: '#1a1a1a', cost: PRESET_PALETTE_COST },
  { id: 'midnight', name: 'Midnight', bodyColour: '#283593', wingColour: '#1A237E', bellyColour: '#E8EAF6', beakColour: '#FFA726', eyeColour: '#1a1a1a', cost: PRESET_PALETTE_COST },
  { id: 'coral',    name: 'Coral',    bodyColour: '#E64A19', wingColour: '#D84315', bellyColour: '#FBE9E7', beakColour: '#FFC107', eyeColour: '#1a1a1a', cost: PRESET_PALETTE_COST },
  { id: 'lavender', name: 'Lavender', bodyColour: '#7B1FA2', wingColour: '#6A1B9A', bellyColour: '#EDE7F6', beakColour: '#FFCA28', eyeColour: '#1a1a1a', cost: PRESET_PALETTE_COST },
];
