import type { FlashcardDisplayMode } from "./types";
import type { components } from "./generated/api-types";

export type ApiLanguage = components["schemas"]["LanguageResponse"];
export type ApiCategory = components["schemas"]["CategoryResponse"] & {
  is_public?: boolean;
  supported_difficulties?: number[];
  total_cards?: number;
};
export type ApiLessonCard = components["schemas"]["FlashcardResponse"];
export type ApiProfile = components["schemas"]["ProfileResponse"];
export type ApiUpdateProfile = components["schemas"]["UpdateProfileRequest"];
export type ApiSession = components["schemas"]["SessionResponse"];
export type ApiCreateSession = components["schemas"]["CreateSessionRequest"];
export type ApiSessionStats = components["schemas"]["SessionStatsResponse"];
export type ApiCreateFlashcard =
  components["schemas"]["CreateFlashcardRequest"];
export type ApiReview = {
  id: string;
  profile_id: string;
  parent_session_id: string;
  activity_id?: string;
  review_name: string;
  flashcard_ids: string[];
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
};

export interface ApiCreateReview {
  profile_id: string;
  parent_session_id: string;
  review_name: string;
  flashcard_ids: string[];
}

export interface ApiConfig {
  DB_ENV?: string | null;
  db_env?: string | null;
  [key: string]: unknown;
}

export interface ApiStartLesson {
  profile_id: string;
  category_id: string;
  difficulty: number;
  card_count?: number;
  started_at?: string | null;
}

export interface ApiCreateLessonSession {
  profile_id: string;
  category_id: string;
  difficulty?: number;
  display_mode?: FlashcardDisplayMode;
  started_at?: string | null;
  ended_at?: string | null;
  grade_percent?: number | null;
  cards_seen?: number;
  cards_correct?: number;
  card_ids: string[];
  current_index?: number;
  status?: "in_progress" | "completed" | "abandoned";
  completed?: boolean;
}

export interface ApiEndLesson {
  profile_id: string;
  session_id: string;
}

export interface ApiLessonSession {
  session_id: string;
  activity_id?: string;
  profile_id: string;
  category_id: string;
  difficulty?: number | null;
  session_mode?: FlashcardDisplayMode | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  grade_percent: number | null;
  cards_seen: number;
  cards_correct: number;
  card_ids: string[];
  current_index: number;
  status: "in_progress" | "completed" | "abandoned";
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export async function fetchInProgressLesson(
  token: string | null | undefined,
): Promise<ApiLessonSession | null> {
  const res = await fetch(`${API_BASE_URL}/lessons/in-progress`, {
    headers: authHeaders(token),
  });
  return parseJson<ApiLessonSession | null>(res);
}

export async function fetchLessonSession(
  token: string | null | undefined,
  sessionId: string,
): Promise<ApiLessonSession> {
  const res = await fetch(`${API_BASE_URL}/lessons/sessions/${sessionId}`, {
    headers: authHeaders(token),
  });
  return parseJson<ApiLessonSession>(res);
}

export async function fetchLessonSessionFlashcards(
  token: string | null | undefined,
  sessionId: string,
): Promise<ApiLessonCard[]> {
  const res = await fetch(
    `${API_BASE_URL}/lessons/sessions/${sessionId}/flashcards`,
    {
      headers: authHeaders(token),
    },
  );
  return parseJson<ApiLessonCard[]>(res);
}

export interface ApiCreateFlashcardAttempt {
  activity_id: string;
  flashcard_id: string;
  correct: boolean;
  response_time_ms: number;
  audio_play_count: number;
  hint_used?: boolean;
  confidence_rating?: number | null;
}

export interface ApiFlashcardAttempt {
  attempt_id: string;
  activity_id: string;
  flashcard_id: string;
  correct: boolean;
  shown_at: string;
  answered_at: string;
  time_to_answer_ms: number;
  cards_seen: number;
  cards_correct: number;
  confidence_rating?: number | null;
  current_index: number;
}

export interface ApiUpdateFlashcardAttempt {
  correct: boolean;
  confidence_rating?: number | null;
}

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8090"
).replace(/\/$/, "");

const SHOULD_LOG_API = typeof __DEV__ !== "undefined" && __DEV__;

if (SHOULD_LOG_API) {
  console.log("[api] baseUrl", API_BASE_URL);
}

export const AUTH_MODE = process.env.EXPO_PUBLIC_AUTH_MODE ?? "supabase";
export const DEV_AUTH_MODE = AUTH_MODE === "dev";

async function buildApiError(res: Response): Promise<Error> {
  let detail = "";
  try {
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const data = await res.json();
      if (data && typeof data === "object") {
        const maybeMessage =
          (data as any).message ?? (data as any).error ?? (data as any).detail;
        if (typeof maybeMessage === "string" && maybeMessage.trim()) {
          detail = maybeMessage.trim();
        } else {
          detail = JSON.stringify(data);
        }
      }
    } else {
      const text = await res.text();
      if (text && text.trim()) {
        detail = text.trim();
      }
    }
  } catch {
    // Ignore parsing errors; fall back to status information only.
  }
  const baseMessage = `API ${res.status}${
    res.statusText ? " " + res.statusText : ""
  }${res.url ? ` @ ${res.url}` : ""}`;
  const message = detail ? `${baseMessage}: ${detail}` : baseMessage;
  return new Error(message);
}

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw await buildApiError(res);
  }
  return (await res.json()) as T;
}

function authHeaders(
  token?: string | null,
  extraHeaders?: Record<string, string>,
): HeadersInit {
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
    "Content-Type": "application/json",
  };
}

async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  if (SHOULD_LOG_API) {
    console.log("[api] request", init?.method ?? "GET", url);
  }
  return fetch(url, init);
}

export async function fetchProfile(token?: string | null): Promise<ApiProfile> {
  const res = await apiFetch(`${API_BASE_URL}/profile`, {
    headers: authHeaders(token),
  });
  return parseJson<ApiProfile>(res);
}

export async function updateProfile(
  token: string | null | undefined,
  body: ApiUpdateProfile,
): Promise<ApiProfile> {
  const res = await fetch(`${API_BASE_URL}/profile`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  return parseJson<ApiProfile>(res);
}

export async function deleteAccount(
  token: string | null | undefined,
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/profile`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw await buildApiError(res);
}

export async function fetchSessions(
  token?: string | null,
): Promise<ApiSession[]> {
  const res = await apiFetch(`${API_BASE_URL}/sessions`, {
    headers: authHeaders(token),
  });
  return parseJson<ApiSession[]>(res);
}

export async function fetchSessionStats(
  token?: string | null,
): Promise<ApiSessionStats> {
  const res = await apiFetch(`${API_BASE_URL}/sessions/stats`, {
    headers: authHeaders(token),
  });
  return parseJson<ApiSessionStats>(res);
}

export async function createSession(
  token: string | null | undefined,
  body: ApiCreateSession,
): Promise<ApiSession> {
  const res = await fetch(`${API_BASE_URL}/sessions`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  return parseJson<ApiSession>(res);
}

export async function createLessonSession(
  token: string | null | undefined,
  body: ApiCreateLessonSession,
): Promise<ApiLessonSession> {
  const res = await fetch(`${API_BASE_URL}/lessons/sessions`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  return parseJson<ApiLessonSession>(res);
}

export async function bulkCreateFlashcards(
  token: string | null | undefined,
  cards: ApiCreateFlashcard[],
): Promise<ApiLessonCard[]> {
  const res = await fetch(`${API_BASE_URL}/lessons/flashcards/bulk`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(cards),
  });
  return parseJson<ApiLessonCard[]>(res);
}

export async function fetchLanguages(): Promise<ApiLanguage[]> {
  const res = await apiFetch(`${API_BASE_URL}/languages`);
  return parseJson<ApiLanguage[]>(res);
}

export async function fetchCategories(
  token: string | null | undefined,
  languageId?: string,
): Promise<ApiCategory[]> {
  const query = languageId ? `?language_id=${encodeURIComponent(languageId)}` : "";
  const res = await apiFetch(`${API_BASE_URL}/lessons/categories${query}`, {
    headers: authHeaders(token),
  });
  return parseJson<ApiCategory[]>(res);
}

export async function fetchConfig(
  token: string | null | undefined,
): Promise<ApiConfig> {
  const res = await apiFetch(`${API_BASE_URL}/config`, {
    headers: authHeaders(token),
  });
  return parseJson<ApiConfig>(res);
}

export async function fetchLessonsByCategory(params: {
  token: string | null | undefined;
  categoryId: string;
  languageId?: string;
  limit?: number;
  difficulty?: number;
  shuffle?: boolean;
}): Promise<ApiLessonCard[]> {
  if (!params.categoryId) {
    throw new Error("categoryId is required");
  }

  const query = new URLSearchParams();
  if (params.languageId) {
    query.set("language_id", params.languageId);
  }
  if (typeof params.limit === "number") {
    query.set("limit", String(params.limit));
  }
  if (typeof params.difficulty === "number") {
    query.set("difficulty", String(params.difficulty));
  }
  if (typeof params.shuffle === "boolean") {
    query.set("shuffle", String(params.shuffle));
  }

  const endpoint = `${API_BASE_URL}/lessons/${params.categoryId}`;
  const queryString = query.toString();
  const res = await fetch(
    queryString ? `${endpoint}?${queryString}` : endpoint,
    {
      headers: authHeaders(params.token),
    },
  );
  return parseJson<ApiLessonCard[]>(res);
}

export async function fetchFlashcards(
  token: string | null | undefined,
): Promise<ApiLessonCard[]> {
  const res = await fetch(`${API_BASE_URL}/lessons/flashcards`, {
    headers: authHeaders(token),
  });
  return parseJson<ApiLessonCard[]>(res);
}

export async function fetchReviews(
  token?: string | null,
): Promise<ApiReview[]> {
  const res = await apiFetch(`${API_BASE_URL}/review`, {
    headers: authHeaders(token),
  });
  return parseJson<ApiReview[]>(res);
}

export async function createReview(
  token: string | null | undefined,
  body: ApiCreateReview,
): Promise<ApiReview> {
  const res = await fetch(`${API_BASE_URL}/review`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  return parseJson<ApiReview>(res);
}

export async function startReviewLifecycle(
  token: string | null | undefined,
  reviewId: string,
): Promise<ApiReview> {
  const res = await fetch(`${API_BASE_URL}/review/${reviewId}/start`, {
    method: "PATCH",
    headers: authHeaders(token),
  });
  return parseJson<ApiReview>(res);
}

export async function completeReviewLifecycle(
  token: string | null | undefined,
  reviewId: string,
): Promise<ApiReview> {
  const res = await fetch(`${API_BASE_URL}/review/${reviewId}/complete`, {
    method: "PATCH",
    headers: authHeaders(token),
  });
  return parseJson<ApiReview>(res);
}

export async function startLesson(
  token: string | null | undefined,
  body: ApiStartLesson,
): Promise<ApiLessonSession> {
  const res = await fetch(`${API_BASE_URL}/lessons/start`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  return parseJson<ApiLessonSession>(res);
}

export async function endLesson(
  token: string | null | undefined,
  body: ApiEndLesson,
): Promise<ApiLessonSession> {
  const res = await fetch(`${API_BASE_URL}/lessons/end`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  return parseJson<ApiLessonSession>(res);
}

export async function createFlashcardAttempt(
  token: string | null | undefined,
  body: ApiCreateFlashcardAttempt,
): Promise<ApiFlashcardAttempt> {
  const res = await fetch(`${API_BASE_URL}/flashcard/attempt`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  return parseJson<ApiFlashcardAttempt>(res);
}

// ── Generation ──────────────────────────────────────────────────────────────

/** A card returned from /generate or /generate/replace — not yet in the DB. */
export interface ApiEphemeralCard {
  source_text: string;
  romanization: string | null;
  translation: string;
  difficulty: number;
  /** Client-assigned key for UI tracking — never sent to the server. */
  _clientId: string;
}

export interface ApiGenerateRequest {
  language_id: string;
  topic: string;
  card_count?: number;
  difficulty_level?: number;
}

export interface ApiGeneratedLesson {
  category_name: string;
  flashcards: ApiEphemeralCard[];
}

export async function generateLesson(
  token: string | null | undefined,
  body: ApiGenerateRequest,
): Promise<ApiGeneratedLesson> {
  const res = await fetch(`${API_BASE_URL}/generate`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  const data = await parseJson<{
    category_name: string;
    flashcards: Omit<ApiEphemeralCard, "_clientId">[];
  }>(res);
  return {
    category_name: data.category_name,
    flashcards: data.flashcards.map((c) => ({
      ...c,
      _clientId: Math.random().toString(36).slice(2),
    })),
  };
}

export interface ApiReplaceRequest {
  language_id: string;
  topic: string;
  difficulty_level?: number;
  count: number;
}

export interface ApiReplaceResponse {
  flashcards: ApiEphemeralCard[];
}

export async function generateReplacements(
  token: string | null | undefined,
  body: ApiReplaceRequest,
): Promise<ApiReplaceResponse> {
  const res = await fetch(`${API_BASE_URL}/generate/replace`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  const data = await parseJson<{
    flashcards: Omit<ApiEphemeralCard, "_clientId">[];
  }>(res);
  return {
    flashcards: data.flashcards.map((c) => ({
      ...c,
      _clientId: Math.random().toString(36).slice(2),
    })),
  };
}

export interface ApiCommitRequest {
  language_id: string;
  topic: string;
  difficulty_level: number;
  cards: Omit<ApiEphemeralCard, "_clientId">[];
}

export interface ApiCommitResponse {
  category_id: string;
  category_name: string;
  flashcards: ApiLessonCard[];
}

export async function commitGeneratedLesson(
  token: string | null | undefined,
  body: ApiCommitRequest,
): Promise<ApiCommitResponse> {
  const res = await fetch(`${API_BASE_URL}/generate/commit`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  return parseJson<ApiCommitResponse>(res);
}

export interface ApiSRSQueue {
  due_count: number;
  cards: ApiLessonCard[];
}

export interface ApiGradeChartPoint {
  ended_at: string;
  grade: number;
}

export interface ApiGradeChartResponse {
  category_id: string;
  difficulty: number;
  points: ApiGradeChartPoint[];
}

export async function fetchSRSQueue(
  token: string | null | undefined,
): Promise<ApiSRSQueue> {
  const res = await apiFetch(`${API_BASE_URL}/review/srs/queue`, {
    headers: authHeaders(token),
  });
  return parseJson<ApiSRSQueue>(res);
}

export async function fetchCategoryGradeChart(
  token: string | null | undefined,
  categoryId: string,
  difficulty: number,
  sessionMode?: FlashcardDisplayMode,
): Promise<ApiGradeChartResponse> {
  const query = new URLSearchParams({ difficulty: String(difficulty) });
  if (sessionMode) {
    query.set("session_mode", sessionMode);
  }
  const res = await fetch(
    `${API_BASE_URL}/analytics/categories/${categoryId}/grade-chart?${query.toString()}`,
    {
      headers: authHeaders(token),
    },
  );
  return parseJson<ApiGradeChartResponse>(res);
}

export async function updateFlashcardAttempt(
  token: string | null | undefined,
  attemptId: string,
  body: ApiUpdateFlashcardAttempt,
): Promise<ApiFlashcardAttempt> {
  const res = await fetch(`${API_BASE_URL}/flashcard/attempt/${attemptId}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  return parseJson<ApiFlashcardAttempt>(res);
}

// ── Decks ─────────────────────────────────────────────────────────────────────

export interface ApiDeck {
  id: string;
  profile_id: string;
  name: string;
  language_id: string;
  icon: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  card_count?: number;
}

export interface ApiDeckCard {
  id: string;
  deck_id: string;
  source_text: string;
  translation: string;
  romanization: string | null;
  difficulty: number | null;
  created_by: "manual" | "ai";
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

/** Ephemeral card returned from deck generate preview — not yet in the DB. */
export interface ApiEphemeralDeckCard {
  source_text: string;
  translation: string;
  romanization: string | null;
  difficulty: number;
  /** Client-assigned key for UI tracking — never sent to the server. */
  _clientId: string;
}

export interface ApiCreateDeck {
  name: string;
  language_id: string;
  icon?: string | null;
  description?: string | null;
}

export interface ApiUpdateDeck {
  name?: string;
  icon?: string | null;
  description?: string | null;
}

export interface ApiCreateDeckCard {
  source_text: string;
  translation: string;
  romanization?: string | null;
  difficulty?: number | null;
}

export interface ApiUpdateDeckCard {
  source_text?: string;
  translation?: string;
  romanization?: string | null;
  difficulty?: number | null;
}

export interface ApiGenerateDeckPreviewResponse {
  flashcards: ApiEphemeralDeckCard[];
}

export interface ApiBulkCreateDeckCardsRequest {
  cards: Omit<ApiEphemeralDeckCard, "_clientId">[];
}

export interface ApiStartDeckPracticeRequest {
  profile_id: string;
}

export interface ApiDeckPracticeSession {
  session_id: string;
  activity_id: string;
  deck_id: string;
  profile_id: string;
  started_at: string;
  ended_at: string | null;
  cards_seen: number;
  cards_correct: number;
}

export interface ApiCompleteDeckPracticeRequest {
  profile_id: string;
  session_id: string;
}

export async function fetchDecks(
  token: string | null | undefined,
): Promise<ApiDeck[]> {
  const res = await apiFetch(`${API_BASE_URL}/decks`, {
    headers: authHeaders(token),
  });
  return parseJson<ApiDeck[]>(res);
}

export async function fetchDeck(
  token: string | null | undefined,
  deckId: string,
): Promise<ApiDeck> {
  const res = await apiFetch(`${API_BASE_URL}/decks/${deckId}`, {
    headers: authHeaders(token),
  });
  return parseJson<ApiDeck>(res);
}

export async function createDeck(
  token: string | null | undefined,
  body: ApiCreateDeck,
): Promise<ApiDeck> {
  const res = await fetch(`${API_BASE_URL}/decks`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  return parseJson<ApiDeck>(res);
}

export async function updateDeck(
  token: string | null | undefined,
  deckId: string,
  body: ApiUpdateDeck,
): Promise<ApiDeck> {
  const res = await fetch(`${API_BASE_URL}/decks/${deckId}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  return parseJson<ApiDeck>(res);
}

export async function deleteDeck(
  token: string | null | undefined,
  deckId: string,
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/decks/${deckId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok && res.status !== 404) throw await buildApiError(res);
}

export async function fetchDeckCards(
  token: string | null | undefined,
  deckId: string,
): Promise<ApiDeckCard[]> {
  const res = await apiFetch(`${API_BASE_URL}/decks/${deckId}/cards`, {
    headers: authHeaders(token),
  });
  return parseJson<ApiDeckCard[]>(res);
}

export async function createDeckCard(
  token: string | null | undefined,
  deckId: string,
  body: ApiCreateDeckCard,
): Promise<ApiDeckCard> {
  const res = await fetch(`${API_BASE_URL}/decks/${deckId}/cards`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  return parseJson<ApiDeckCard>(res);
}

export async function updateDeckCard(
  token: string | null | undefined,
  deckId: string,
  cardId: string,
  body: ApiUpdateDeckCard,
): Promise<ApiDeckCard> {
  const res = await fetch(`${API_BASE_URL}/decks/${deckId}/cards/${cardId}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  return parseJson<ApiDeckCard>(res);
}

export async function deleteDeckCard(
  token: string | null | undefined,
  deckId: string,
  cardId: string,
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/decks/${deckId}/cards/${cardId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok && res.status !== 404) throw await buildApiError(res);
}

export async function generateDeckPreview(
  token: string | null | undefined,
  deckId: string,
  body: { topic: string; card_count?: number; difficulty_level?: number },
): Promise<ApiGenerateDeckPreviewResponse> {
  const res = await fetch(`${API_BASE_URL}/decks/${deckId}/generate`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  const data = await parseJson<{
    flashcards: Omit<ApiEphemeralDeckCard, "_clientId">[];
  }>(res);
  return {
    flashcards: data.flashcards.map((c) => ({
      ...c,
      _clientId: Math.random().toString(36).slice(2),
    })),
  };
}

export async function bulkCreateDeckCards(
  token: string | null | undefined,
  deckId: string,
  body: ApiBulkCreateDeckCardsRequest,
): Promise<ApiDeckCard[]> {
  const res = await fetch(`${API_BASE_URL}/decks/${deckId}/cards/bulk`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  return parseJson<ApiDeckCard[]>(res);
}

export async function startDeckPractice(
  token: string | null | undefined,
  deckId: string,
  body: ApiStartDeckPracticeRequest,
): Promise<ApiDeckPracticeSession> {
  const res = await fetch(`${API_BASE_URL}/decks/${deckId}/start`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  return parseJson<ApiDeckPracticeSession>(res);
}

export async function completeDeckPractice(
  token: string | null | undefined,
  deckId: string,
  body: ApiCompleteDeckPracticeRequest,
): Promise<ApiDeckPracticeSession> {
  const res = await fetch(`${API_BASE_URL}/decks/${deckId}/complete`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  return parseJson<ApiDeckPracticeSession>(res);
}

// ── Deck flashcards (junction) ─────────────────────────────────────────────────

export interface ApiDeckFlashcard {
  id: string;
  deck_id: string;
  flashcard_id: string;
  position: number;
  added_at: string;
}

export interface ApiAddDeckFlashcardRequest {
  flashcard_id: string;
  position?: number;
}

export interface ApiEditDeckFlashcardRequest {
  source_text?: string;
  translation?: string;
  romanization?: string | null;
  difficulty?: number | null;
}

export interface ApiDeckFlashcardWithCard extends ApiDeckFlashcard {
  source_text: string;
  translation: string;
  romanization: string | null;
  difficulty: number;
  audio_url: string | null;
}

export async function fetchDeckFlashcards(
  token: string | null | undefined,
  deckId: string,
): Promise<ApiDeckFlashcard[]> {
  const res = await apiFetch(`${API_BASE_URL}/decks/${deckId}/flashcards`, {
    headers: authHeaders(token),
  });
  return parseJson<ApiDeckFlashcard[]>(res);
}

export async function addDeckFlashcard(
  token: string | null | undefined,
  deckId: string,
  body: ApiAddDeckFlashcardRequest,
): Promise<ApiDeckFlashcard> {
  const res = await fetch(`${API_BASE_URL}/decks/${deckId}/flashcards`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  return parseJson<ApiDeckFlashcard>(res);
}

export async function editDeckFlashcard(
  token: string | null | undefined,
  deckId: string,
  flashcardId: string,
  body: ApiEditDeckFlashcardRequest,
): Promise<ApiDeckFlashcardWithCard> {
  const res = await fetch(
    `${API_BASE_URL}/decks/${deckId}/flashcards/${flashcardId}`,
    {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify(body),
    },
  );
  return parseJson<ApiDeckFlashcardWithCard>(res);
}

export async function removeDeckFlashcard(
  token: string | null | undefined,
  deckId: string,
  flashcardId: string,
): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/decks/${deckId}/flashcards/${flashcardId}`,
    { method: "DELETE", headers: authHeaders(token) },
  );
  if (!res.ok && res.status !== 404) throw await buildApiError(res);
}

