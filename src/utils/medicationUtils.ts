import { Medication, DoseRecord } from '../types';

export type DoseStatus = 'upcoming' | 'due' | 'taken' | 'missed';

export function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function getCurrentMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export function getDoseStatus(med: Medication, timeKey: string): DoseStatus {
  const today = getTodayString();
  const taken = med.history.find(r => r.date === today && r.timeKey === timeKey && r.takenAt !== null);
  if (taken) return 'taken';

  const scheduledMins = parseMinutes(timeKey);
  const nowMins = getCurrentMinutes();
  const diff = nowMins - scheduledMins;

  if (diff >= 0 && diff <= 90) return 'due';
  if (diff > 90) return 'missed';
  return 'upcoming';
}

export function getNextDoseInfo(med: Medication): { timeKey: string; status: DoseStatus } | null {
  if (med.scheduledTimes.length === 0) return null;

  const sorted = [...med.scheduledTimes].sort();
  const nowMins = getCurrentMinutes();
  const today = getTodayString();

  for (const t of sorted) {
    const status = getDoseStatus(med, t);
    if (status === 'due') return { timeKey: t, status: 'due' };
    if (status === 'missed') {
      const taken = med.history.find(r => r.date === today && r.timeKey === t && r.takenAt !== null);
      if (!taken) return { timeKey: t, status: 'missed' };
    }
  }

  for (const t of sorted) {
    if (parseMinutes(t) > nowMins) {
      return { timeKey: t, status: 'upcoming' };
    }
  }

  const nextDay = sorted[0];
  return { timeKey: nextDay, status: 'upcoming' };
}

export function formatTime(timeKey: string): string {
  const [h, m] = timeKey.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
}

export function calculateStreak(history: DoseRecord[], scheduledTimes: string[]): number {
  if (scheduledTimes.length === 0) return 0;
  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const allTaken = scheduledTimes.every(t =>
      history.some(r => r.date === dateStr && r.timeKey === t && r.takenAt !== null)
    );
    if (allTaken) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

export function applyDoseTaken(med: Medication, timeKey: string, onTime: boolean): Medication {
  const today = getTodayString();
  const existing = med.history.find(r => r.date === today && r.timeKey === timeKey);
  const newRecord: DoseRecord = { date: today, timeKey, takenAt: Date.now() };

  const newHistory = existing
    ? med.history.map(r => (r.date === today && r.timeKey === timeKey ? newRecord : r))
    : [...med.history, newRecord];

  const newHealth = Math.min(100, med.health + (onTime ? 8 : 3));
  const newStreak = calculateStreak(newHistory, med.scheduledTimes);

  return { ...med, history: newHistory, health: newHealth, streak: newStreak };
}

export function applyMissedDoses(med: Medication): Medication {
  const today = getTodayString();
  const nowMins = getCurrentMinutes();

  let healthPenalty = 0;
  const newHistory = [...med.history];

  for (const t of med.scheduledTimes) {
    const scheduledMins = parseMinutes(t);
    const diff = nowMins - scheduledMins;
    const alreadyLogged = med.history.some(r => r.date === today && r.timeKey === t);
    if (diff > 90 && !alreadyLogged) {
      newHistory.push({ date: today, timeKey: t, takenAt: null });
      healthPenalty += 12;
    }
  }

  if (healthPenalty === 0) return med;

  const newHealth = Math.max(10, med.health - healthPenalty);
  const newStreak = calculateStreak(newHistory, med.scheduledTimes);
  return { ...med, history: newHistory, health: newHealth, streak: newStreak };
}
