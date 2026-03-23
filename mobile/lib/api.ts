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
  review_name: string;
  flashcard_ids: string[];
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
};

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

export interface ApiEndLesson {
  profile_id: string;
  session_id: string;
}

export interface ApiLessonSession {
  session_id: string;
  profile_id: string;
  category_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  grade_percent: number | null;
  cards_seen: number;
  cards_correct: number;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiCreateFlashcardAttempt {
  session_id: string;
  flashcard_id: string;
  correct: boolean;
  response_time_ms: number;
  audio_play_count: number;
  hint_used?: boolean;
  confidence_rating?: number | null;
}

export interface ApiFlashcardAttempt {
  attempt_id: string;
  session_id: string;
  flashcard_id: string;
  correct: boolean;
  shown_at: string;
  answered_at: string;
  time_to_answer_ms: number;
  cards_seen: number;
  cards_correct: number;
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
