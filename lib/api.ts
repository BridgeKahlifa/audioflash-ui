import type { components } from "./generated/api-types";

export type ApiLanguage = components["schemas"]["LanguageResponse"];
export type ApiCategory = components["schemas"]["CategoryResponse"];
export type ApiLessonCard = components["schemas"]["FlashcardResponse"];
export type ApiProfile = components["schemas"]["ProfileResponse"];
export type ApiUpdateProfile = components["schemas"]["UpdateProfileRequest"];
export type ApiSession = components["schemas"]["SessionResponse"];
export type ApiCreateSession = components["schemas"]["CreateSessionRequest"];
export type ApiSessionStats = components["schemas"]["SessionStatsResponse"];
export type ApiCreateFlashcard =
  components["schemas"]["CreateFlashcardRequest"];

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8090/api";

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new Error(`API ${res.status}`);
  }
  return (await res.json()) as T;
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function fetchProfile(token: string): Promise<ApiProfile> {
  const res = await fetch(`${API_BASE_URL}/profile`, {
    headers: authHeaders(token),
  });
  return parseJson<ApiProfile>(res);
}

export async function updateProfile(
  token: string,
  body: ApiUpdateProfile,
): Promise<ApiProfile> {
  const res = await fetch(`${API_BASE_URL}/profile`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  return parseJson<ApiProfile>(res);
}

export async function deleteAccount(token: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/profile`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
}

export async function fetchSessions(token: string): Promise<ApiSession[]> {
  const res = await fetch(`${API_BASE_URL}/sessions`, {
    headers: authHeaders(token),
  });
  return parseJson<ApiSession[]>(res);
}

export async function fetchSessionStats(
  token: string,
): Promise<ApiSessionStats> {
  const res = await fetch(`${API_BASE_URL}/sessions/stats`, {
    headers: authHeaders(token),
  });
  return parseJson<ApiSessionStats>(res);
}

export async function createSession(
  token: string,
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

export async function fetchLessonsByCategory(params: {
  categoryId: string;
  limit?: number;
}): Promise<ApiLessonCard[]> {
  if (!params.categoryId) {
    throw new Error("categoryId is required");
  }

  const query = new URLSearchParams();
  if (typeof params.limit === "number") {
    query.set("limit", String(params.limit));
  }

  const endpoint = `${API_BASE_URL}/lessons/${params.categoryId}`;
  const res = await fetch(
    query.size > 0 ? `${endpoint}?${query.toString()}` : endpoint,
  );
  return parseJson<ApiLessonCard[]>(res);
}
