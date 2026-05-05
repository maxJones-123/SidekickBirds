import { BirdTraits, BodyShape, CrestStyle, TailStyle, EyeStyle } from '../types';

function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  let state = Math.abs(hash) || 42;
  return () => {
    state = (state * 1664525 + 1013904223) & 0xffffffff;
    return (state >>> 0) / 0xffffffff;
  };
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

export const BODY_COLORS = [
  '#E63946', '#457B9D', '#2D6A4F', '#F4A261', '#9B72CF',
  '#FF6B6B', '#4ECDC4', '#FFB703', '#E8A0BF', '#3D405B',
  '#81B29A', '#F2CC8F', '#264653', '#E76F51', '#6A4C93',
];

export const BELLY_COLORS = [
  '#FFF5D7', '#F5F0FF', '#E8F4FD', '#FFFACD', '#FFD6D6',
  '#D4F1E4', '#FFE4CC', '#E0F0FF', '#FFEFD5', '#F0FFF0',
];

export const WING_COLORS = [
  '#C0392B', '#2980B9', '#1D5E3F', '#E07B39', '#7B52CF',
  '#E05555', '#38B2AC', '#E09600', '#C4709A', '#2C3E50',
  '#6A9F7B', '#D4A843', '#1B3A4B', '#C4603D', '#4A2C6A',
];

export const BEAK_COLORS = ['#FF9A3C', '#FFD700', '#E07B39', '#FF6B6B', '#FFA07A'];

export const EYE_COLORS = ['#2C2C2C', '#4B0082', '#006400', '#8B0000', '#00008B', '#1a1a1a'];

const ADJECTIVES = [
  'Fluffy', 'Sunny', 'Brave', 'Tiny', 'Happy', 'Wispy', 'Bold', 'Bright',
  'Swift', 'Cozy', 'Jolly', 'Zesty', 'Plucky', 'Dandy', 'Nifty', 'Perky',
  'Spry', 'Chirpy', 'Dapper', 'Merry',
];

const SPECIES = [
  'Finch', 'Robin', 'Wren', 'Jay', 'Sparrow', 'Puffin', 'Lark',
  'Dove', 'Bunting', 'Warbler', 'Nuthatch', 'Pipit', 'Tit', 'Martin', 'Thrush',
];

export function generateBird(seed: string): BirdTraits {
  const rand = seededRandom(seed);

  return {
    bodyColour: pick(BODY_COLORS, rand),
    bellyColour: pick(BELLY_COLORS, rand),
    wingColour: pick(WING_COLORS, rand),
    beakColour: pick(BEAK_COLORS, rand),
    eyeColour: pick(EYE_COLORS, rand),
    bodyShape: pick<BodyShape>(['round', 'round', 'tall', 'chubby'], rand),
    crestStyle: pick<CrestStyle>(['none', 'none', 'none', 'small', 'small', 'large', 'curl'], rand),
    tailStyle: pick<TailStyle>(['short', 'short', 'long', 'fan', 'forked'], rand),
    eyeStyle: pick<EyeStyle>(['round', 'round', 'round', 'sleepy', 'wide'], rand),
    name: `${pick(ADJECTIVES, rand)} ${pick(SPECIES, rand)}`,
  };
}
