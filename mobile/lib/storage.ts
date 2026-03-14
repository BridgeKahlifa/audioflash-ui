import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  AppSettings,
  DailySession,
  Flashcard,
  ProgressData,
  ReviewCard,
  SessionCardResult,
  SessionHistoryItem,
} from "./types";
import type { ApiProfile, ApiSession, ApiSessionStats } from "./api";

const KEYS = {
  PROGRESS: "audioflash:progress",
  CURRENT_CARDS: "audioflash:cards:",
  SESSION_HISTORY: "audioflash:session-history",
  LAST_SESSION: "audioflash:last-session",
  REVIEW_QUEUE: "audioflash:review-queue",
  SETTINGS: "audioflash:settings",
  PROFILE: "audioflash:profile",
  SESSIONS: "audioflash:sessions",
  SESSION_STATS: "audioflash:session-stats",
} as const;

export async function getCachedProfile(): Promise<ApiProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.PROFILE);
    return raw ? (JSON.parse(raw) as ApiProfile) : null;
  } catch {
    return null;
  }
}

export async function setCachedProfile(profile: ApiProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
  } catch {
    // Non-critical
  }
}

export async function clearCachedProfile(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEYS.PROFILE);
  } catch {
    // Non-critical
  }
}

export async function getCachedSessions(): Promise<ApiSession[] | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SESSIONS);
    return raw ? (JSON.parse(raw) as ApiSession[]) : null;
  } catch {
    return null;
  }
}

export async function setCachedSessions(sessions: ApiSession[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
  } catch {
    // Non-critical
  }
}

export async function getCachedSessionStats(): Promise<ApiSessionStats | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SESSION_STATS);
    return raw ? (JSON.parse(raw) as ApiSessionStats) : null;
  } catch {
    return null;
  }
}

export async function setCachedSessionStats(stats: ApiSessionStats): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.SESSION_STATS, JSON.stringify(stats));
  } catch {
    // Non-critical
  }
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
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

const defaultSettings: AppSettings = {
  cardsPerSession: 20,
  audioRate: 0.8,
  remindersEnabled: false,
  dailyGoalCards: 25,
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

export async function getSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
    if (!raw) return defaultSettings;
    return { ...defaultSettings, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch {
    return defaultSettings;
  }
}

export async function setSettings(settings: AppSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  } catch {
    // Non-critical
  }
}

export async function getSessionHistory(): Promise<SessionHistoryItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SESSION_HISTORY);
    return raw ? (JSON.parse(raw) as SessionHistoryItem[]) : [];
  } catch {
    return [];
  }
}

async function setSessionHistory(history: SessionHistoryItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.SESSION_HISTORY, JSON.stringify(history));
  } catch {
    // Non-critical
  }
}

export async function getLastSession(): Promise<SessionHistoryItem | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.LAST_SESSION);
    return raw ? (JSON.parse(raw) as SessionHistoryItem) : null;
  } catch {
    return null;
  }
}

async function setLastSession(session: SessionHistoryItem): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.LAST_SESSION, JSON.stringify(session));
  } catch {
    // Non-critical
  }
}

function reviewKey(language: string, chinese: string): string {
  return `${language}:${chinese}`;
}

export async function getReviewQueue(): Promise<ReviewCard[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.REVIEW_QUEUE);
    return raw ? (JSON.parse(raw) as ReviewCard[]) : [];
  } catch {
    return [];
  }
}

async function setReviewQueue(cards: ReviewCard[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.REVIEW_QUEUE, JSON.stringify(cards));
  } catch {
    // Non-critical
  }
}

export async function getDueReviewCards(): Promise<ReviewCard[]> {
  const today = todayStr();
  const all = await getReviewQueue();
  return all.filter((item) => item.dueDate <= today);
}

async function applyReviewSessionResults(
  topic: string,
  topicTitle: string,
  language: string,
  languageLabel: string,
  cards: SessionCardResult[]
): Promise<void> {
  const queue = await getReviewQueue();
  const byKey = new Map(queue.map((item) => [reviewKey(item.language, item.chinese), item]));

  cards.forEach((card) => {
    const key = reviewKey(language, card.chinese);
    const existing = byKey.get(key);

    if (!card.knew) {
      byKey.set(key, {
        id: existing?.id ?? `${Date.now()}-${card.cardId}-${Math.random().toString(36).slice(2, 8)}`,
        topic,
        topicTitle,
        language,
        languageLabel,
        chinese: card.chinese,
        pinyin: card.pinyin,
        english: card.english,
        dueDate: todayStr(),
        intervalDays: 1,
        incorrectCount: (existing?.incorrectCount ?? 0) + 1,
      });
      return;
    }

    if (!existing) {
      return;
    }

    const nextInterval = Math.min(Math.max(existing.intervalDays * 2, 2), 14);
    byKey.set(key, {
      ...existing,
      dueDate: addDays(todayStr(), nextInterval),
      intervalDays: nextInterval,
      incorrectCount: Math.max(existing.incorrectCount - 1, 0),
    });
  });

  await setReviewQueue(Array.from(byKey.values()));
}

export async function saveCompletedSession(input: {
  topic: string;
  topicTitle: string;
  language: string;
  languageLabel: string;
  cards: SessionCardResult[];
}): Promise<SessionHistoryItem> {
  const total = input.cards.length;
  const correct = input.cards.filter((card) => card.knew).length;

  await recordSession(correct, total);

  const entry: SessionHistoryItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    completedAt: new Date().toISOString(),
    topic: input.topic,
    topicTitle: input.topicTitle,
    language: input.language,
    languageLabel: input.languageLabel,
    correct,
    total,
    cards: input.cards,
  };

  const history = await getSessionHistory();
  const updatedHistory = [entry, ...history].slice(0, 100);

  await Promise.all([
    setSessionHistory(updatedHistory),
    setLastSession(entry),
    applyReviewSessionResults(
      input.topic,
      input.topicTitle,
      input.language,
      input.languageLabel,
      input.cards
    ),
  ]);

  return entry;
}
