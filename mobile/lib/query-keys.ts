export const queryKeys = {
  profile:          (userId: string) => ["profile",          userId] as const,
  srsQueue:         (userId: string) => ["srsQueue",         userId] as const,
  inProgressLesson: (userId: string) => ["inProgressLesson", userId] as const,
  categories:       (languageId?: string) => languageId ? ["categories", languageId] as const : ["categories"] as const,
  languages:        ()               => ["languages"]                as const,
  sessions:         (userId: string) => ["sessions",         userId] as const,
  sessionStats:     (userId: string) => ["sessionStats",     userId] as const,
  savedReviews:     (userId: string) => ["savedReviews",     userId] as const,
  decks:            (userId: string) => ["decks",            userId] as const,
  deck:             (userId: string, deckId: string) => ["deck",      userId, deckId] as const,
  deckCards:        (userId: string, deckId: string) => ["deckCards", userId, deckId] as const,
};
