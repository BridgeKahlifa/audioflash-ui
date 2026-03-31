import type { components } from "./generated/api-types";

export type ApiLanguage = components["schemas"]["LanguageResponse"];
export type ApiCategory = components["schemas"]["CategoryResponse"] & {
  supported_difficulties?: number[];
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
  started_at?: string | null;
}

export interface ApiCreateLessonSession {
  profile_id: string;
  category_id: string;
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
  const res = await fetch(`${API_BASE_URL}/lessons/sessions/${sessionId}/flashcards`, {
    headers: authHeaders(token),
  });
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

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8090/api";

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
          (data as any).message ??
          (data as any).error ??
          (data as any).detail;
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
  }`;
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

export async function fetchProfile(token?: string | null): Promise<ApiProfile> {
  const res = await fetch(`${API_BASE_URL}/profile`, {
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

export async function deleteAccount(token: string | null | undefined): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/profile`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw await buildApiError(res);
}

export async function fetchSessions(token?: string | null): Promise<ApiSession[]> {
  const res = await fetch(`${API_BASE_URL}/sessions`, {
    headers: authHeaders(token),
  });
  return parseJson<ApiSession[]>(res);
}

export async function fetchSessionStats(
  token?: string | null,
): Promise<ApiSessionStats> {
  const res = await fetch(`${API_BASE_URL}/sessions/stats`, {
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
  cards: ApiCreateFlashcard[],
): Promise<ApiLessonCard[]> {
  const res = await fetch(`${API_BASE_URL}/lessons/flashcards/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cards),
  });
  return parseJson<ApiLessonCard[]>(res);
}

export async function fetchLanguages(): Promise<ApiLanguage[]> {
  const res = await fetch(`${API_BASE_URL}/languages`);
  return parseJson<ApiLanguage[]>(res);
}

export async function fetchCategories(): Promise<ApiCategory[]> {
  const res = await fetch(`${API_BASE_URL}/lessons/categories`);
  return parseJson<ApiCategory[]>(res);
}

export async function fetchConfig(): Promise<ApiConfig> {
  const res = await fetch(`${API_BASE_URL}/config`);
  return parseJson<ApiConfig>(res);
}

export async function fetchLessonsByCategory(params: {
  categoryId: string;
  limit?: number;
  difficulty?: number;
}): Promise<ApiLessonCard[]> {
  if (!params.categoryId) {
    throw new Error("categoryId is required");
  }

  const query = new URLSearchParams();
  if (typeof params.limit === "number") {
    query.set("limit", String(params.limit));
  }
  if (typeof params.difficulty === "number") {
    query.set("difficulty", String(params.difficulty));
  }

  const endpoint = `${API_BASE_URL}/lessons/${params.categoryId}`;
  const res = await fetch(
    query.size > 0 ? `${endpoint}?${query.toString()}` : endpoint,
  );
  return parseJson<ApiLessonCard[]>(res);
}

export async function fetchFlashcards(): Promise<ApiLessonCard[]> {
  const res = await fetch(`${API_BASE_URL}/lessons/flashcards`);
  return parseJson<ApiLessonCard[]>(res);
}

export async function fetchReviews(token?: string | null): Promise<ApiReview[]> {
  const res = await fetch(`${API_BASE_URL}/review`, {
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

export interface ApiGenerateRequest {
  language_id: string;
  topic: string;
  card_count?: number;
  difficulty_level?: number;
}

export interface ApiGeneratedLesson {
  category: ApiCategory;
  flashcards: ApiLessonCard[];
  cached: boolean;
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
  return parseJson<ApiGeneratedLesson>(res);
}

export interface ApiReplaceRequest {
  language_id: string;
  topic: string;
  difficulty_level?: number;
  count: number;
  exclude_ids: string[];
}

export interface ApiReplaceResponse {
  flashcards: ApiLessonCard[];
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
  return parseJson<ApiReplaceResponse>(res);
}

// ── Library ──────────────────────────────────────────────────────────────────

export interface ApiSavedLesson {
  id: string;
  category_id: string;
  category_name: string;
  language_id: string | null;
  saved_at: string;
  supported_difficulties: number[];
}

export interface ApiLibraryCategory {
  id: string;
  name: string;
  language_id: string | null;
  source: string;
  supported_difficulties: number[];
  is_saved: boolean;
}

export interface ApiSRSQueue {
  due_count: number;
  cards: ApiLessonCard[];
}

export async function fetchLibrary(
  token: string | null | undefined,
  languageId?: string,
): Promise<ApiLibraryCategory[]> {
  const query = languageId ? `?language_id=${languageId}` : "";
  const res = await fetch(`${API_BASE_URL}/library/browse${query}`, {
    headers: authHeaders(token),
  });
  return parseJson<ApiLibraryCategory[]>(res);
}

export async function fetchSavedLessons(
  token: string | null | undefined,
): Promise<ApiSavedLesson[]> {
  const res = await fetch(`${API_BASE_URL}/library/saved`, {
    headers: authHeaders(token),
  });
  return parseJson<ApiSavedLesson[]>(res);
}

export async function saveLesson(
  token: string | null | undefined,
  categoryId: string,
): Promise<ApiSavedLesson> {
  const res = await fetch(`${API_BASE_URL}/library/saved`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ category_id: categoryId }),
  });
  return parseJson<ApiSavedLesson>(res);
}

export async function unsaveLesson(
  token: string | null | undefined,
  categoryId: string,
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/library/saved/${categoryId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok && res.status !== 404) throw await buildApiError(res);
}

export async function fetchSRSQueue(
  token: string | null | undefined,
): Promise<ApiSRSQueue> {
  const res = await fetch(`${API_BASE_URL}/library/srs/queue`, {
    headers: authHeaders(token),
  });
  return parseJson<ApiSRSQueue>(res);
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
