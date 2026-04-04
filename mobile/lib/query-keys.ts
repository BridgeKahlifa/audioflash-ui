export const queryKeys = {
  profile:          (userId: string) => ["profile",          userId] as const,
  srsQueue:         (userId: string) => ["srsQueue",         userId] as const,
  inProgressLesson: (userId: string) => ["inProgressLesson", userId] as const,
  categories:       ()               => ["categories"]               as const,
  languages:        ()               => ["languages"]                as const,
  sessions:         (userId: string) => ["sessions",         userId] as const,
  sessionStats:     (userId: string) => ["sessionStats",     userId] as const,
  savedReviews:     (userId: string) => ["savedReviews",     userId] as const,
};
