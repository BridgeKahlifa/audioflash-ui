type DeckScopedQueryKeyArgs = {
  userId: string;
  deckId: string;
};

const getDeckScopedQueryKeyArgs = (
  userIdOrArgs: string | DeckScopedQueryKeyArgs,
  deckId?: string,
): DeckScopedQueryKeyArgs => {
  if (typeof userIdOrArgs === "string") {
    return { userId: userIdOrArgs, deckId: deckId as string };
  }

  return userIdOrArgs;
};

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
  deck:             (userIdOrArgs: string | DeckScopedQueryKeyArgs, deckId?: string) => {
    const { userId, deckId: resolvedDeckId } = getDeckScopedQueryKeyArgs(userIdOrArgs, deckId);
    return ["deck", userId, resolvedDeckId] as const;
  },
  deckCards:        (userIdOrArgs: string | DeckScopedQueryKeyArgs, deckId?: string) => {
    const { userId, deckId: resolvedDeckId } = getDeckScopedQueryKeyArgs(userIdOrArgs, deckId);
    return ["deckCards", userId, resolvedDeckId] as const;
  },
  deckFlashcards:   (userIdOrArgs: string | DeckScopedQueryKeyArgs, deckId?: string) => {
    const { userId, deckId: resolvedDeckId } = getDeckScopedQueryKeyArgs(userIdOrArgs, deckId);
    return ["deckFlashcards", userId, resolvedDeckId] as const;
  },
};
