export interface Flashcard {
  id: string | number;
  dbId?: string;
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
  completedAt: string;
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
  dueDate: string;
  intervalDays: number;
  incorrectCount: number;
}

export interface AppSettings {
  cardsPerSession: number;
  audioRate: number;
  remindersEnabled: boolean;
  dailyGoalCards: number;
}
