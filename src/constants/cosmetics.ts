import { Cosmetic } from '../types';

export const COSMETICS: Cosmetic[] = [
  // Hats
  { id: 'party_hat', name: 'Party Hat', type: 'hat', cost: 30, emoji: '🎊', description: 'Celebrate every dose!' },
  { id: 'top_hat', name: 'Top Hat', type: 'hat', cost: 50, emoji: '🎩', description: 'Very distinguished.' },
  { id: 'crown', name: 'Crown', type: 'hat', cost: 150, emoji: '👑', description: 'A medication monarch.' },
  { id: 'flower_crown', name: 'Flower Crown', type: 'hat', cost: 80, emoji: '🌸', description: 'Spring vibes.' },
  { id: 'graduation_cap', name: 'Grad Cap', type: 'hat', cost: 120, emoji: '🎓', description: 'Top of the class!' },
  { id: 'cowboy_hat', name: 'Cowboy Hat', type: 'hat', cost: 90, emoji: '🤠', description: 'Yee-haw, partner!' },
  { id: 'birthday_hat', name: 'Birthday Hat', type: 'hat', cost: 40, emoji: '🥳', description: 'Every day is a win!' },
  { id: 'santa_hat', name: 'Santa Hat', type: 'hat', cost: 100, emoji: '🎅', description: 'Ho ho ho!' },
  // Accessories
  { id: 'glasses', name: 'Glasses', type: 'accessory', cost: 40, emoji: '👓', description: 'Smart and stylish.' },
  { id: 'bow_tie', name: 'Bow Tie', type: 'accessory', cost: 35, emoji: '🎀', description: 'Fancy!' },
  { id: 'sunglasses', name: 'Sunglasses', type: 'accessory', cost: 55, emoji: '🕶️', description: 'Too cool for school.' },
  { id: 'scarf', name: 'Scarf', type: 'accessory', cost: 65, emoji: '🧣', description: 'Cozy birb.' },
  { id: 'heart', name: 'Heart Locket', type: 'accessory', cost: 70, emoji: '❤️', description: 'Full of love.' },
  { id: 'star_badge', name: 'Star Badge', type: 'accessory', cost: 45, emoji: '⭐', description: 'Superstar!' },
  { id: 'butterfly', name: 'Butterfly Pin', type: 'accessory', cost: 80, emoji: '🦋', description: 'Transformation!' },
  { id: 'rainbow', name: 'Rainbow', type: 'accessory', cost: 130, emoji: '🌈', description: 'Pure joy.' },
];

export const getCosmeticById = (id: string): Cosmetic | undefined =>
  COSMETICS.find(c => c.id === id);
