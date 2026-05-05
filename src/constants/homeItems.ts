export interface RoomBackground {
  id: string;
  name: string;
  wallColor: string;
  floorColor: string;
  cost: number;
  emoji: string;
}

export interface RoomDecoration {
  id: string;
  name: string;
  emoji: string;
  cost: number;
}

export const ROOM_BACKGROUNDS: RoomBackground[] = [
  { id: 'default',  name: 'Cozy Cottage',   wallColor: '#FFF8EE', floorColor: '#F5E6D0', cost: 0,   emoji: '🏡' },
  { id: 'ocean',    name: 'Ocean View',      wallColor: '#E3F2FD', floorColor: '#BBDEFB', cost: 50,  emoji: '🌊' },
  { id: 'garden',   name: 'Garden',          wallColor: '#E8F5E9', floorColor: '#C8E6C9', cost: 50,  emoji: '🌿' },
  { id: 'sunset',   name: 'Sunset',          wallColor: '#FFF3E0', floorColor: '#FFE0B2', cost: 80,  emoji: '🌅' },
  { id: 'night',    name: 'Night Sky',       wallColor: '#E8EAF6', floorColor: '#C5CAE9', cost: 100, emoji: '🌙' },
  { id: 'candy',    name: 'Candy Land',      wallColor: '#FCE4EC', floorColor: '#F8BBD0', cost: 80,  emoji: '🍭' },
  { id: 'forest',   name: 'Forest Cabin',    wallColor: '#F1F8E9', floorColor: '#DCEDC8', cost: 70,  emoji: '🌲' },
  { id: 'royal',    name: 'Royal Chamber',   wallColor: '#EDE7F6', floorColor: '#D1C4E9', cost: 120, emoji: '👑' },
];

export const ROOM_DECORATIONS: RoomDecoration[] = [
  { id: 'plant',    name: 'Plant',        emoji: '🪴', cost: 0  },
  { id: 'window',   name: 'Window',       emoji: '🪟', cost: 0  },
  { id: 'sofa',     name: 'Sofa',         emoji: '🛋️', cost: 40 },
  { id: 'tv',       name: 'TV',           emoji: '📺', cost: 60 },
  { id: 'guitar',   name: 'Guitar',       emoji: '🎸', cost: 70 },
  { id: 'painting', name: 'Painting',     emoji: '🖼️', cost: 50 },
  { id: 'candle',   name: 'Candle',       emoji: '🕯️', cost: 35 },
  { id: 'flower',   name: 'Flower Vase',  emoji: '💐', cost: 40 },
  { id: 'star',     name: 'Star Mobile',  emoji: '⭐',  cost: 80 },
  { id: 'books',    name: 'Bookshelf',    emoji: '📚', cost: 55 },
  { id: 'balloon',  name: 'Balloon',      emoji: '🎈', cost: 30 },
  { id: 'trophy',   name: 'Trophy',       emoji: '🏆', cost: 90 },
];

// Free items always available without purchase
export const FREE_DECORATION_IDS = ['plant', 'window'];

export const getBackgroundById = (id: string): RoomBackground =>
  ROOM_BACKGROUNDS.find(b => b.id === id) ?? ROOM_BACKGROUNDS[0];

export const getDecorationById = (id: string): RoomDecoration | undefined =>
  ROOM_DECORATIONS.find(d => d.id === id);
