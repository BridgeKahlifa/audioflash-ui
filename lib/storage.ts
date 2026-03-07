import AsyncStorage from "@react-native-async-storage/async-storage";
import { Flashcard, DailySession, ProgressData } from "./types";

const KEYS = {
  PROGRESS: "audioflash:progress",
  CURRENT_CARDS: "audioflash:cards:",
} as const;

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function previousDay(dateStr: string): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function calcStreak(sessions: DailySession[]): number {
  if (sessions.length === 0) return 0;

  const today = todayStr();
  const uniqueDates = [...new Set(sessions.map((s) => s.date))].sort().reverse();

  // Streak must include today or yesterday to be active
  if (uniqueDates[0] !== today && uniqueDates[0] !== previousDay(today)) {
    return 0;
  }

  let streak = 1;
  for (let i = 0; i < uniqueDates.length - 1; i++) {
    if (previousDay(uniqueDates[i]) === uniqueDates[i + 1]) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

const defaultProgress: ProgressData = {
  sessions: [],
  totalCards: 0,
  totalCorrect: 0,
  streak: 0,
  lastPracticeDate: null,
};

export async function getProgress(): Promise<ProgressData> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.PROGRESS);
    return raw ? JSON.parse(raw) : defaultProgress;
  } catch {
    return defaultProgress;
  }
}

export async function recordSession(
  correct: number,
  total: number
): Promise<void> {
  try {
    const progress = await getProgress();
    const session: DailySession = { date: todayStr(), correct, total };
    const sessions = [...progress.sessions, session];

    const updated: ProgressData = {
      sessions,
      totalCards: progress.totalCards + total,
      totalCorrect: progress.totalCorrect + correct,
      streak: calcStreak(sessions),
      lastPracticeDate: todayStr(),
    };

    await AsyncStorage.setItem(KEYS.PROGRESS, JSON.stringify(updated));
  } catch {
    // Non-critical — silently ignore
  }
}

export async function getCurrentCards(topic: string): Promise<Flashcard[] | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.CURRENT_CARDS + topic);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function setCurrentCards(
  topic: string,
  cards: Flashcard[]
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      KEYS.CURRENT_CARDS + topic,
      JSON.stringify(cards)
    );
  } catch {
    // Non-critical
  }
}
