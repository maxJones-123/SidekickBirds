export const XP_PER_LEVEL = 200;   // was 800 — levels up every 20 on-time doses

export function getLevel(totalXp: number): number {
  return Math.floor(totalXp / XP_PER_LEVEL) + 1;
}

export function getLevelXp(totalXp: number): number {
  return totalXp % XP_PER_LEVEL;
}
