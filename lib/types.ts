export interface Flashcard {
  id: number;
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
