export interface Flashcard {
  id: string | number;
  chinese: string;
  pinyin: string;
  english: string;
}

export interface DailySession {
  date: string; // YYYY-MM-DD
  correct: number;
  total: number;
}

export interface ProgressData {
  sessions: DailySession[];
  totalCards: number;
  totalCorrect: number;
  streak: number;
  lastPracticeDate: string | null;
}

export interface SessionCardResult {
  cardId: string | number;
  chinese: string;
  pinyin: string;
  english: string;
  knew: boolean;
}

export interface SessionHistoryItem {
  id: string;
  completedAt: string; // ISO timestamp
  topic: string;
  topicTitle: string;
  language: string;
  languageLabel: string;
  correct: number;
  total: number;
  cards: SessionCardResult[];
}

export interface ReviewCard {
  id: string;
  topic: string;
  topicTitle: string;
  language: string;
  languageLabel: string;
  chinese: string;
  pinyin: string;
  english: string;
  dueDate: string; // YYYY-MM-DD
  intervalDays: number;
  incorrectCount: number;
}

export interface AppSettings {
  cardsPerSession: number;
  audioRate: number;
  remindersEnabled: boolean;
  dailyGoalCards: number;
}
